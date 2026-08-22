/**
 * Synthetic Paytm-style transaction generator for VyaparGuru.
 *
 * Generates ~6 months of transactions for 3 merchant personas (kirana, D2C,
 * manufacturer) with weekly seasonality, Indian festival spikes, dead-stock
 * SKUs, fast movers, hidden recurring expenses, and injected stockout gaps.
 *
 * Deterministic: uses a seeded PRNG so every run produces the same dataset.
 * Output: one JSON file per persona in ./output, consumed by the server's
 * seed script. All monetary values are integer paise.
 *
 * Usage: node generate.js [--days 180] [--seed 42]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERSONAS_DIR = path.join(__dirname, 'personas');
const OUTPUT_DIR = path.join(__dirname, 'output');
const FESTIVAL_CALENDAR_PATH = path.join(
  __dirname,
  '..',
  '..',
  'apps',
  'ml-service',
  'app',
  'core',
  'festival_calendar.json'
);

// ---------- CLI args ----------
const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const DAYS = Number(argValue('--days', 180));
const SEED = Number(argValue('--seed', 42));

// ---------- Seeded PRNG (mulberry32) ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seed) {
  const rand = mulberry32(seed);
  return {
    float: (min = 0, max = 1) => min + rand() * (max - min),
    int: (min, max) => Math.floor(min + rand() * (max - min + 1)),
    chance: (p) => rand() < p,
    pick: (arr) => arr[Math.floor(rand() * arr.length)],
    // Weighted pick from [{item, weight}]
    weighted: (entries) => {
      const total = entries.reduce((s, e) => s + e.weight, 0);
      let r = rand() * total;
      for (const e of entries) {
        r -= e.weight;
        if (r <= 0) return e.item;
      }
      return entries[entries.length - 1].item;
    },
    // Approx normal via central limit
    gaussian: (mean = 0, std = 1) => {
      let sum = 0;
      for (let i = 0; i < 6; i += 1) sum += rand();
      return mean + ((sum - 3) / 3) * std * 1.73;
    },
  };
}

// ---------- Helpers ----------
const toPaise = (inr) => Math.round(inr * 100);
const dayKey = (d) => d.toISOString().slice(0, 10);

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function loadFestivalMultipliers() {
  const raw = JSON.parse(fs.readFileSync(FESTIVAL_CALENDAR_PATH, 'utf8'));
  // Map of YYYY-MM-DD -> { multiplier, name } (max multiplier wins on overlap)
  const map = new Map();
  for (const f of raw.festivals) {
    const base = new Date(`${f.date}T00:00:00Z`);
    for (let offset = -f.spanDaysBefore; offset <= f.spanDaysAfter; offset += 1) {
      const key = dayKey(addDays(base, offset));
      // Ramp up toward the festival day, full multiplier on the day itself
      const ramp = offset < 0 ? 1 + (f.multiplier - 1) * (1 + offset / (f.spanDaysBefore + 1)) : f.multiplier;
      const existing = map.get(key);
      if (!existing || ramp > existing.multiplier) {
        map.set(key, { multiplier: ramp, name: f.name });
      }
    }
  }
  return map;
}

/** Pick stockout windows: contiguous day-ranges where a fast SKU has no sales. */
function pickStockoutWindows(rng, catalog, startDate, totalDays, count) {
  const fastSkus = catalog.filter((s) => s.tag === 'fast');
  const windows = [];
  for (let i = 0; i < count && fastSkus.length > 0; i += 1) {
    const sku = rng.pick(fastSkus);
    // Keep windows in the middle 80% of the range so they're visible in charts
    const startOffset = rng.int(Math.floor(totalDays * 0.15), Math.floor(totalDays * 0.85));
    const length = rng.int(3, 7);
    windows.push({
      skuName: sku.name,
      from: dayKey(addDays(startDate, startOffset)),
      to: dayKey(addDays(startDate, startOffset + length)),
    });
  }
  return windows;
}

function isSkuStockedOut(windows, skuName, dateKey) {
  return windows.some((w) => w.skuName === skuName && dateKey >= w.from && dateKey <= w.to);
}

/** Dead SKUs sell a tiny bit early on, then flatline for the last ~70% of the period. */
function deadSkuActive(dateOffset, totalDays) {
  return dateOffset < totalDays * 0.3;
}

function makePaytmPayload(rng, mode, amountPaise, timestamp) {
  const orderId = `PTM${timestamp.getTime()}${rng.int(100, 999)}`;
  return {
    orderId,
    txnId: `TXN${rng.int(10_000_000, 99_999_999)}`,
    mode,
    amount: (amountPaise / 100).toFixed(2),
    currency: 'INR',
    status: 'SUCCESS',
    payerVpa: mode === 'Gateway' ? undefined : `user${rng.int(1000, 9999)}@paytm`,
    txnDate: timestamp.toISOString(),
  };
}

// ---------- Core generation ----------
function generatePersona(persona, festivalMap, startDate, totalDays, seed) {
  const rng = makeRng(seed);
  const catalog = persona.catalog;
  const stockoutWindows = pickStockoutWindows(rng, catalog, startDate, totalDays, persona.stockoutWindows);

  const transactions = [];
  const expenses = [];
  const soldUnits = new Map(catalog.map((s) => [s.name, 0]));

  const modeEntries = Object.entries(persona.paymentModeWeights)
    .filter(([, w]) => w > 0)
    .map(([item, weight]) => ({ item, weight }));

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset += 1) {
    const date = addDays(startDate, dayOffset);
    const key = dayKey(date);
    const dow = date.getUTCDay();
    const isWeekend = dow === 0 || dow === 6;
    const festival = festivalMap.get(key);

    // --- Daily transaction count ---
    let txnCount = persona.dailyTxnBase;
    txnCount *= isWeekend ? persona.weekendMultiplier : 1;
    txnCount *= festival ? festival.multiplier : 1;
    txnCount *= Math.max(0.4, rng.gaussian(1, 0.18)); // day-to-day noise
    txnCount = Math.max(0, Math.round(txnCount));

    // SKUs sellable today (respect stockouts + dead-stock flatline)
    const sellable = catalog.filter((sku) => {
      if (isSkuStockedOut(stockoutWindows, sku.name, key)) return false;
      if (sku.tag === 'dead' && !deadSkuActive(dayOffset, totalDays)) return false;
      return true;
    });
    const skuWeights = sellable.map((sku) => {
      let weight = sku.velocity;
      // Festival-boosted SKUs (e.g. diya sets before Diwali) spike hard
      if (festival && sku.festivalBoost?.some((f) => festival.name.includes(f))) {
        weight *= 8;
      }
      return { item: sku, weight };
    });

    for (let t = 0; t < txnCount; t += 1) {
      const [openH, closeH] = persona.openHours;
      const hour = Math.min(
        closeH - 1,
        Math.max(openH, Math.round(rng.gaussian((openH + closeH) / 2, (closeH - openH) / 4)))
      );
      const timestamp = new Date(date);
      timestamp.setUTCHours(hour, rng.int(0, 59), rng.int(0, 59), 0);

      const mode = rng.weighted(modeEntries);

      // Misc/unattributable sale (loose items, custom amounts)
      if (rng.chance(persona.miscSaleChance) || skuWeights.length === 0) {
        const amount = toPaise(rng.int(persona.miscSaleRangeINR[0], persona.miscSaleRangeINR[1]));
        transactions.push({
          amount,
          paymentMode: mode,
          timestamp: timestamp.toISOString(),
          attributedSKUs: [],
          rawPayload: makePaytmPayload(rng, mode, amount, timestamp),
        });
        continue;
      }

      // Basket of 1–3 line items
      const lineCount = rng.weighted([
        { item: 1, weight: 0.65 },
        { item: 2, weight: 0.25 },
        { item: 3, weight: 0.1 },
      ]);
      const lines = [];
      let amount = 0;
      for (let li = 0; li < lineCount; li += 1) {
        const sku = rng.weighted(skuWeights);
        const qty = rng.chance(0.8) ? 1 : rng.int(2, 3);
        amount += toPaise(sku.priceINR) * qty;
        soldUnits.set(sku.name, soldUnits.get(sku.name) + qty);
        const existing = lines.find((l) => l.skuName === sku.name);
        if (existing) existing.quantity += qty;
        else lines.push({ skuName: sku.name, quantity: qty });
      }

      transactions.push({
        amount,
        paymentMode: mode,
        timestamp: timestamp.toISOString(),
        // Ground-truth attribution with realistic confidence: single-item
        // baskets are easy to attribute, combos less so.
        attributedSKUs: lines.map((l) => ({
          skuName: l.skuName,
          quantity: l.quantity,
          confidence: Number((lines.length === 1 ? rng.float(0.88, 0.98) : rng.float(0.55, 0.8)).toFixed(2)),
        })),
        rawPayload: makePaytmPayload(rng, mode, amount, timestamp),
      });
    }

    // --- Expenses ---
    const exp = persona.expenses;
    const dom = date.getUTCDate();
    if (dom === 1) {
      expenses.push({ category: 'Rent', amountINR: exp.rentINR, date: key, source: 'seed', isRecurring: true });
      expenses.push({ category: 'Staff Salary', amountINR: exp.salaryINR, date: key, source: 'seed', isRecurring: true });
    }
    if (dom === 5) {
      expenses.push({
        category: 'Electricity Bill',
        amountINR: rng.int(exp.electricityRangeINR[0], exp.electricityRangeINR[1]),
        date: key,
        source: 'seed',
        isRecurring: true,
      });
    }
    if (dayOffset % exp.supplierFrequencyDays === exp.supplierFrequencyDays - 1) {
      expenses.push({
        category: 'Supplier Restock',
        amountINR: rng.int(exp.supplierRestockRangeINR[0], exp.supplierRestockRangeINR[1]),
        date: key,
        source: 'seed',
        isRecurring: false,
      });
    }
    for (const hidden of exp.hiddenRecurring) {
      if (dayOffset % hidden.everyDays === Math.min(hidden.everyDays - 1, 3)) {
        expenses.push({
          category: hidden.category,
          amountINR: hidden.amountINR,
          date: key,
          source: 'seed',
          isRecurring: true,
        });
      }
    }
    if (rng.chance(0.5)) {
      expenses.push({
        category: 'Miscellaneous',
        amountINR: rng.int(exp.dailyMiscRangeINR[0], exp.dailyMiscRangeINR[1]),
        date: key,
        source: 'seed',
        isRecurring: false,
      });
    }
  }

  // --- Final stock levels engineered for the demo story ---
  const skus = catalog.map((sku) => {
    const dailyVelocity = soldUnits.get(sku.name) / totalDays;
    let currentStock;
    if (sku.tag === 'dead') {
      currentStock = sku.deadStock; // piles of unsold inventory
    } else if (sku.tag === 'fast') {
      currentStock = Math.max(2, Math.round(dailyVelocity * rng.float(2, 6))); // days from stockout
    } else if (sku.tag === 'slow') {
      currentStock = rng.int(15, 30);
    } else {
      currentStock = Math.max(5, Math.round(dailyVelocity * rng.float(10, 25)));
    }
    return {
      name: sku.name,
      category: sku.category,
      price: toPaise(sku.priceINR),
      costPrice: toPaise(sku.costINR),
      currentStock,
      unit: sku.unit,
      createdVia: 'seed',
      simTag: sku.tag, // ground-truth label kept for evaluating Phase 3 classifiers
      simSoldUnits: soldUnits.get(sku.name),
    };
  });

  return {
    persona: persona.id,
    generatedAt: new Date().toISOString(),
    config: { days: totalDays, seed, startDate: dayKey(startDate) },
    merchant: persona.merchant,
    skus,
    transactions,
    expenses: expenses.map((e) => ({ ...e, amount: toPaise(e.amountINR), amountINR: undefined })),
    groundTruth: { stockoutWindows },
  };
}

// ---------- Main ----------
function main() {
  const festivalMap = loadFestivalMultipliers();
  const endDate = new Date();
  endDate.setUTCHours(0, 0, 0, 0);
  const startDate = addDays(endDate, -DAYS);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const personaFiles = fs.readdirSync(PERSONAS_DIR).filter((f) => f.endsWith('.json'));
  let totalTxns = 0;

  personaFiles.forEach((file, idx) => {
    const persona = JSON.parse(fs.readFileSync(path.join(PERSONAS_DIR, file), 'utf8'));
    const data = generatePersona(persona, festivalMap, startDate, DAYS, SEED + idx * 1000);
    const outPath = path.join(OUTPUT_DIR, `${persona.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 1));
    totalTxns += data.transactions.length;
    console.log(
      `✔ ${persona.id.padEnd(12)} ${String(data.transactions.length).padStart(6)} txns, ` +
        `${data.skus.length} SKUs, ${data.expenses.length} expenses, ` +
        `${data.groundTruth.stockoutWindows.length} stockout windows → ${path.relative(process.cwd(), outPath)}`
    );
  });

  console.log(`\nGenerated ${totalTxns} transactions across ${personaFiles.length} personas (${DAYS} days, seed ${SEED}).`);
}

main();
