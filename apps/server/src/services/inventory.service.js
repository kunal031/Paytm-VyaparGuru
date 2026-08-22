import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transaction } from '../models/Transaction.js';
import { SKU } from '../models/SKU.js';
import { mlClient } from './mlClient.service.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FESTIVAL_CALENDAR_PATH = path.join(
  __dirname, '..', '..', '..', 'ml-service', 'app', 'core', 'festival_calendar.json'
);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Per-SKU sales stats from attributed transactions. */
export async function computeSkuStats(merchantId) {
  const now = Date.now();
  const since60 = new Date(now - 60 * DAY_MS);

  const [skus, salesAgg] = await Promise.all([
    SKU.find({ merchantId }).lean(),
    Transaction.aggregate([
      { $match: { merchantId, timestamp: { $gte: since60 } } },
      { $unwind: '$attributedSKUs' },
      {
        $group: {
          _id: '$attributedSKUs.skuId',
          soldLast30: {
            $sum: {
              $cond: [
                { $gte: ['$timestamp', new Date(now - 30 * DAY_MS)] },
                '$attributedSKUs.quantity',
                0,
              ],
            },
          },
          soldPrev30: {
            $sum: {
              $cond: [
                { $lt: ['$timestamp', new Date(now - 30 * DAY_MS)] },
                '$attributedSKUs.quantity',
                0,
              ],
            },
          },
          lastSaleAt: { $max: '$timestamp' },
        },
      },
    ]),
  ]);

  const statsBySku = new Map(salesAgg.map((s) => [s._id?.toString(), s]));
  return skus.map((sku) => {
    const stats = statsBySku.get(sku._id.toString());
    const daysSinceLastSale = stats?.lastSaleAt
      ? Math.floor((now - new Date(stats.lastSaleAt).getTime()) / DAY_MS)
      : null;
    return {
      ...sku,
      soldLast30: stats?.soldLast30 ?? 0,
      soldPrev30: stats?.soldPrev30 ?? 0,
      daysSinceLastSale,
      velocityPerDay: Number(((stats?.soldLast30 ?? 0) / 30).toFixed(3)),
    };
  });
}

// ---------- JS fallbacks (mirror the ML service logic) ----------

function fallbackClassify(skuStats) {
  const active = skuStats.filter(
    (s) => s.daysSinceLastSale !== null && s.daysSinceLastSale <= 30 && !(s.velocityPerDay < 0.05 && s.daysSinceLastSale > 14)
  );
  const velocities = active.map((s) => s.velocityPerDay).sort((a, b) => a - b);
  const median = velocities.length
    ? velocities[Math.floor(velocities.length / 2)]
    : 0;
  const threshold = Math.max(median, 0.5);

  return skuStats.map((s) => {
    const isDead =
      s.daysSinceLastSale === null ||
      s.daysSinceLastSale > 30 ||
      (s.velocityPerDay < 0.05 && s.daysSinceLastSale > 14);
    const classification = isDead ? 'dead' : s.velocityPerDay >= threshold ? 'fast' : 'slow';
    const trendPct =
      s.soldPrev30 > 0
        ? Number((((s.soldLast30 - s.soldPrev30) / s.soldPrev30) * 100).toFixed(1))
        : null;
    return {
      skuId: s._id.toString(),
      classification,
      velocityPerDay: s.velocityPerDay,
      trendPct,
      reason: isDead
        ? 'no sales in the last 30 days'
        : classification === 'fast'
          ? 'top-tier daily sales velocity'
          : 'below-median sales velocity',
    };
  });
}

function loadFestivalDays(horizonDays) {
  let festivals = [];
  try {
    festivals = JSON.parse(fs.readFileSync(FESTIVAL_CALENDAR_PATH, 'utf8')).festivals;
  } catch {
    return [];
  }
  const byDay = new Map();
  for (const f of festivals) {
    const base = new Date(`${f.date}T00:00:00Z`);
    for (let offset = -f.spanDaysBefore; offset <= f.spanDaysAfter; offset += 1) {
      const key = new Date(base.getTime() + offset * DAY_MS).toISOString().slice(0, 10);
      const ramp =
        offset < 0 ? 1 + (f.multiplier - 1) * (1 + offset / (f.spanDaysBefore + 1)) : f.multiplier;
      if (ramp > (byDay.get(key)?.mult ?? 0)) byDay.set(key, { mult: ramp, name: f.name });
    }
  }
  const out = [];
  for (let i = 1; i <= horizonDays; i += 1) {
    const key = new Date(Date.now() + i * DAY_MS).toISOString().slice(0, 10);
    const entry = byDay.get(key);
    out.push({ date: key, mult: entry?.mult ?? 1, name: entry?.name ?? null });
  }
  return out;
}

function fallbackStockout(skuStats, horizonDays = 30) {
  const calendar = loadFestivalDays(horizonDays);
  return skuStats.map((s) => {
    if (s.velocityPerDay <= 0) {
      return { skuId: s._id.toString(), daysUntilStockout: null, stockoutDate: null, festivalAhead: null };
    }
    let remaining = s.currentStock;
    let festivalAhead = null;
    for (let i = 0; i < calendar.length; i += 1) {
      remaining -= s.velocityPerDay * calendar[i].mult;
      if (calendar[i].name && !festivalAhead) festivalAhead = calendar[i].name;
      if (remaining <= 0) {
        return {
          skuId: s._id.toString(),
          daysUntilStockout: i + 1,
          stockoutDate: calendar[i].date,
          festivalAhead,
        };
      }
    }
    return { skuId: s._id.toString(), daysUntilStockout: null, stockoutDate: null, festivalAhead: null };
  });
}

function fallbackReorder(skuStats, { leadTimeDays = 3, coverDays = 14 } = {}) {
  const window = leadTimeDays + coverDays;
  const calendar = loadFestivalDays(window);
  const avgMult = calendar.length
    ? calendar.reduce((a, d) => a + d.mult, 0) / calendar.length
    : 1;
  return skuStats.map((s) => ({
    skuId: s._id.toString(),
    suggestedQuantity: Math.max(0, Math.ceil(s.velocityPerDay * window * avgMult - s.currentStock)),
    coverDays: window,
    festivalMultiplier: Number(avgMult.toFixed(2)),
  }));
}

// ---------- Overview (ML service with fallback) ----------

export async function getInventoryOverview(merchantId) {
  const skuStats = await computeSkuStats(merchantId);
  if (skuStats.length === 0) {
    return { source: 'none', skus: [], summary: emptySummary() };
  }

  let classify;
  let stockout;
  let reorder;
  let source = 'ml-service';
  try {
    const [c, s, r] = await Promise.all([
      mlClient.post('/inventory/classify', {
        skus: skuStats.map((s2) => ({
          skuId: s2._id.toString(),
          soldLast30: s2.soldLast30,
          soldPrev30: s2.soldPrev30,
          daysSinceLastSale: s2.daysSinceLastSale,
          currentStock: s2.currentStock,
        })),
      }),
      mlClient.post('/inventory/stockout', {
        skus: skuStats.map((s2) => ({
          skuId: s2._id.toString(),
          currentStock: s2.currentStock,
          velocityPerDay: s2.velocityPerDay,
        })),
      }),
      mlClient.post('/inventory/reorder', {
        skus: skuStats.map((s2) => ({
          skuId: s2._id.toString(),
          currentStock: s2.currentStock,
          velocityPerDay: s2.velocityPerDay,
        })),
      }),
    ]);
    classify = c.data.results;
    stockout = s.data.results;
    reorder = r.data.results;
  } catch (err) {
    logger.warn({ err: err.message }, 'ML service unreachable, using fallback inventory intelligence');
    source = 'fallback';
    classify = fallbackClassify(skuStats);
    stockout = fallbackStockout(skuStats);
    reorder = fallbackReorder(skuStats);
  }

  const classifyMap = new Map(classify.map((c) => [c.skuId, c]));
  const stockoutMap = new Map(stockout.map((s) => [s.skuId, s]));
  const reorderMap = new Map(reorder.map((r) => [r.skuId, r]));

  const skus = skuStats.map((s) => {
    const id = s._id.toString();
    return {
      _id: id,
      name: s.name,
      category: s.category,
      price: s.price,
      costPrice: s.costPrice,
      currentStock: s.currentStock,
      unit: s.unit,
      soldLast30: s.soldLast30,
      velocityPerDay: s.velocityPerDay,
      daysSinceLastSale: s.daysSinceLastSale,
      classification: classifyMap.get(id)?.classification ?? 'slow',
      trendPct: classifyMap.get(id)?.trendPct ?? null,
      reason: classifyMap.get(id)?.reason ?? '',
      daysUntilStockout: stockoutMap.get(id)?.daysUntilStockout ?? null,
      stockoutDate: stockoutMap.get(id)?.stockoutDate ?? null,
      festivalAhead: stockoutMap.get(id)?.festivalAhead ?? null,
      suggestedReorderQty: reorderMap.get(id)?.suggestedQuantity ?? 0,
    };
  });

  const deadStock = skus.filter((s) => s.classification === 'dead');
  const summary = {
    total: skus.length,
    fast: skus.filter((s) => s.classification === 'fast').length,
    slow: skus.filter((s) => s.classification === 'slow').length,
    dead: deadStock.length,
    deadStockValue: deadStock.reduce((a, s) => a + s.currentStock * s.costPrice, 0),
    stockoutAlerts: skus.filter(
      (s) => s.daysUntilStockout !== null && s.daysUntilStockout <= 7
    ).length,
  };

  return { source, skus, summary };
}

function emptySummary() {
  return { total: 0, fast: 0, slow: 0, dead: 0, deadStockValue: 0, stockoutAlerts: 0 };
}

// ---------- Attribution (backfill unattributed transactions) ----------

function fallbackAttribute(transactions, skus) {
  const singles = new Map();
  for (const sku of skus) {
    for (let qty = 1; qty <= 3; qty += 1) {
      const key = sku.price * qty;
      if (!singles.has(key)) singles.set(key, []);
      singles.get(key).push([{ skuId: sku.skuId, quantity: qty }]);
    }
  }
  const pairs = new Map();
  for (let i = 0; i < skus.length; i += 1) {
    for (let j = i + 1; j < skus.length; j += 1) {
      const key = skus[i].price + skus[j].price;
      if (!pairs.has(key)) pairs.set(key, []);
      pairs.get(key).push([
        { skuId: skus[i].skuId, quantity: 1 },
        { skuId: skus[j].skuId, quantity: 1 },
      ]);
    }
  }

  return transactions.map((txn) => {
    const singleHits = singles.get(txn.amount) ?? [];
    const pairHits = pairs.get(txn.amount) ?? [];
    const pool = singleHits.length ? singleHits : pairHits;
    if (!pool.length) {
      return { txnId: txn.txnId, matches: [], confidence: 0, candidates: 0 };
    }
    const baseConf = singleHits.length ? 0.9 : 0.6;
    return {
      txnId: txn.txnId,
      matches: pool[0],
      confidence: Number((baseConf / pool.length).toFixed(2)),
      candidates: singleHits.length + pairHits.length,
    };
  });
}

/**
 * Attributes unattributed transactions to SKUs by amount matching (ML service
 * with JS fallback), persists matches above the confidence floor.
 */
export async function attributeUnmatchedTransactions(merchantId, { minConfidence = 0.3 } = {}) {
  const [txns, skus] = await Promise.all([
    Transaction.find({ merchantId, attributedSKUs: { $size: 0 } })
      .select('_id amount')
      .limit(5000)
      .lean(),
    SKU.find({ merchantId }).select('_id price').lean(),
  ]);
  if (!txns.length || !skus.length) {
    return { attempted: txns.length, attributed: 0, source: 'none' };
  }

  const payload = {
    transactions: txns.map((t) => ({ txnId: t._id.toString(), amount: t.amount })),
    skus: skus.map((s) => ({ skuId: s._id.toString(), price: s.price })),
  };

  let results;
  let source = 'ml-service';
  try {
    const { data } = await mlClient.post('/inventory/attribute', payload);
    results = data.results;
  } catch (err) {
    logger.warn({ err: err.message }, 'ML service unreachable, using fallback attribution');
    source = 'fallback';
    results = fallbackAttribute(payload.transactions, payload.skus);
  }

  const ops = results
    .filter((r) => r.matches.length > 0 && r.confidence >= minConfidence)
    .map((r) => ({
      updateOne: {
        filter: { _id: r.txnId },
        update: {
          $set: {
            attributedSKUs: r.matches.map((m) => ({
              skuId: m.skuId,
              quantity: m.quantity,
              confidence: r.confidence,
            })),
          },
        },
      },
    }));

  if (ops.length) await Transaction.bulkWrite(ops);
  logger.info(
    { merchantId: merchantId.toString(), attempted: txns.length, attributed: ops.length, source },
    'Transaction attribution run'
  );
  return { attempted: txns.length, attributed: ops.length, source };
}
