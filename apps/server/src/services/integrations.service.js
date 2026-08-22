import { Integration } from '../models/Integration.js';
import { Transaction } from '../models/Transaction.js';
import { Expense } from '../models/Expense.js';
import { SKU } from '../models/SKU.js';
import { INTEGRATION_PROVIDERS } from '../config/integrations.catalog.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export const getProvider = (id) => INTEGRATION_PROVIDERS.find((p) => p.id === id);

// ---------------------------------------------------------------- CSV parsing

/** Minimal RFC-4180-ish CSV parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

// ------------------------------------------------------------- field parsing

/** "₹1,234.50" | "1234.5" | "Rs. 1,234" → integer paise (null if not a number). */
export function parseAmountToPaise(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).replace(/[₹\s]|rs\.?/gi, '').replace(/,/g, '');
  if (!cleaned || Number.isNaN(Number(cleaned))) return null;
  return Math.round(Math.abs(Number(cleaned)) * 100);
}

const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** Accepts ISO, dd/mm/yyyy, dd-mm-yyyy, dd MMM yyyy, mm/dd/yyyy fallback. */
export function parseDateLoose(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 6, 0, 0));
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) {
    let [, a, b, y] = m;
    let day = +a;
    let month = +b;
    if (month > 12 && day <= 12) [day, month] = [month, day]; // mm/dd slipped in
    if (month > 12) return null;
    return new Date(Date.UTC(+y, month - 1, day, 6, 0, 0));
  }
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    return new Date(Date.UTC(+m[3], MONTHS[m[2].toLowerCase()], +m[1], 6, 0, 0));
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------- header detection

const GENERIC = {
  date: ['date', 'invoice date', 'created at', 'txn date', 'transaction date', 'date/time', 'vch date'],
  amount: ['amount', 'total', 'total price', 'value', 'grand total', 'net amount', 'product sales'],
  type: ['type', 'txn type', 'transaction type', 'voucher type', 'vch type', 'status', 'financial status', 'payment'],
  name: ['customer name', 'customer', 'party name', 'party', 'name', 'particulars', 'description', 'note', 'order id', 'email'],
  creditWords: ['you got', 'payment', 'payment-in', 'payment in', 'receipt', 'sale', 'sales', 'order', 'invoice', 'paid', 'received', 'income', 'credit note', 'sent', 'pending', 'partially_paid'],
  debitWords: ['you gave', 'purchase', 'payment-out', 'payment out', 'expense', 'debit', 'fee', 'refund', 'adjustment', 'service fee'],
};

function findHeader(headers, candidates) {
  const lower = headers.map((h) => h.trim().toLowerCase());
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx !== -1) return idx;
  }
  // relaxed: contains
  for (const c of candidates) {
    const idx = lower.findIndex((h) => h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

/** Builds a column mapping for the provider (provider hints first, generic fallback). */
export function detectMapping(headers, provider) {
  const hints = provider?.mapping || {};
  const pick = (key) => findHeader(headers, [...(hints[key] || []), ...GENERIC[key]]);
  const mapping = {
    date: pick('date'),
    amount: pick('amount'),
    type: pick('type'),
    name: pick('name'),
    creditWords: hints.creditWords || GENERIC.creditWords,
    debitWords: hints.debitWords || GENERIC.debitWords,
  };
  if (mapping.date === -1 || mapping.amount === -1) {
    throw ApiError.badRequest(
      `Could not find Date/Amount columns. Headers seen: ${headers.join(', ')}. Export the standard report from the app and try again.`
    );
  }
  return mapping;
}

function classifyRow(typeValue, mapping) {
  const t = String(typeValue || '').trim().toLowerCase();
  if (!t) return 'credit'; // no type column → treat as income rows (e.g. invoice exports)
  if (mapping.debitWords.some((w) => t.includes(w))) return 'debit';
  if (mapping.creditWords.some((w) => t.includes(w))) return 'credit';
  return 'credit';
}

// ------------------------------------------------------------ products import

const PRODUCT_HEADERS = {
  name: ['product name', 'item name', 'title', 'name', 'product'],
  category: ['category', 'product type', 'type', 'group'],
  price: ['price', 'selling price', 'rate', 'mrp', 'variant price'],
  stock: ['stock', 'quantity', 'qty', 'stock quantity', 'inventory qty', 'closing stock'],
  unit: ['unit', 'uom'],
};

export function detectProductMapping(headers) {
  const mapping = {
    name: findHeader(headers, PRODUCT_HEADERS.name),
    category: findHeader(headers, PRODUCT_HEADERS.category),
    price: findHeader(headers, PRODUCT_HEADERS.price),
    stock: findHeader(headers, PRODUCT_HEADERS.stock),
    unit: findHeader(headers, PRODUCT_HEADERS.unit),
  };
  if (mapping.name === -1) {
    throw ApiError.badRequest(
      `Could not find a product name column. Headers seen: ${headers.join(', ')}`
    );
  }
  return mapping;
}

// ------------------------------------------------------------ import pipeline

async function importTransactions(merchantId, providerId, rows, headers, provider) {
  const mapping = detectMapping(headers, provider);
  const txDocs = [];
  const expDocs = [];
  let skipped = 0;

  for (const row of rows) {
    const amount = parseAmountToPaise(row[mapping.amount]);
    const date = parseDateLoose(row[mapping.date]);
    if (!amount || !date) {
      skipped += 1;
      continue;
    }
    const description = mapping.name !== -1 ? String(row[mapping.name] || '').slice(0, 140) : '';
    const kind = classifyRow(mapping.type !== -1 ? row[mapping.type] : '', mapping);
    if (kind === 'credit') {
      txDocs.push({
        merchantId,
        amount,
        paymentMode: 'Imported',
        source: providerId,
        timestamp: date,
        attributedSKUs: [],
        rawPayload: { provider: providerId, description, typeValue: mapping.type !== -1 ? row[mapping.type] : null },
      });
    } else {
      expDocs.push({
        merchantId,
        category: `Imported (${provider?.name || providerId})`,
        amount,
        date,
        source: 'imported',
        provider: providerId,
      });
    }
  }

  if (txDocs.length) await Transaction.insertMany(txDocs);
  if (expDocs.length) await Expense.insertMany(expDocs);
  return { transactions: txDocs.length, expenses: expDocs.length, skus: 0, skipped };
}

async function importProducts(merchantId, providerId, rows, headers) {
  const mapping = detectProductMapping(headers);
  let skus = 0;
  let skipped = 0;
  for (const row of rows) {
    const name = String(row[mapping.name] || '').trim().slice(0, 120);
    if (!name) {
      skipped += 1;
      continue;
    }
    const price = mapping.price !== -1 ? parseAmountToPaise(row[mapping.price]) : null;
    const stockRaw = mapping.stock !== -1 ? Number(String(row[mapping.stock]).replace(/,/g, '')) : NaN;
    const update = {
      category: mapping.category !== -1 && row[mapping.category] ? String(row[mapping.category]).slice(0, 60) : 'Imported',
      unit: mapping.unit !== -1 && row[mapping.unit] ? String(row[mapping.unit]).slice(0, 20) : 'pcs',
      createdVia: 'import',
    };
    if (price != null) update.price = price;
    if (!Number.isNaN(stockRaw)) update.currentStock = Math.max(0, Math.round(stockRaw));
    const insertOnly = { merchantId, name, costPrice: price != null ? Math.round(price * 0.8) : 0 };
    if (price == null) insertOnly.price = 0; // $set/$setOnInsert must not both carry price
    await SKU.findOneAndUpdate(
      { merchantId, name },
      { $set: update, $setOnInsert: insertOnly },
      { upsert: true, new: true }
    );
    skus += 1;
  }
  return { transactions: 0, expenses: 0, skus, skipped };
}

/** Runs a CSV buffer (or generated sample) through the import pipeline. */
export async function runImport(merchantId, providerId, { csvText, dataType }) {
  const provider = getProvider(providerId);
  if (!provider) throw ApiError.badRequest(`Unknown provider: ${providerId}`);
  if (!provider.dataTypes.includes(dataType)) {
    throw ApiError.badRequest(`${provider.name} import supports: ${provider.dataTypes.join(', ')}`);
  }

  const parsed = parseCsv(csvText);
  if (parsed.length < 2) throw ApiError.badRequest('The file has no data rows.');
  const [headers, ...rows] = parsed;

  const result =
    dataType === 'products'
      ? await importProducts(merchantId, providerId, rows, headers)
      : await importTransactions(merchantId, providerId, rows, headers, provider);

  await Integration.findOneAndUpdate(
    { merchantId, provider: providerId },
    {
      $set: { status: 'connected', lastImportAt: new Date() },
      $setOnInsert: { connectedAt: new Date() },
      $inc: {
        'imported.transactions': result.transactions,
        'imported.expenses': result.expenses,
        'imported.skus': result.skus,
      },
    },
    { upsert: true }
  );

  logger.info({ provider: providerId, ...result }, 'Integration import complete');
  return result;
}

// ------------------------------------------------------------- sample data

/** Deterministic PRNG so sample imports are stable per provider. */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SAMPLE_NAMES = ['Rajesh Kumar', 'Sunita Devi', 'Amit Traders', 'Pooja Sharma', 'Iqbal & Sons', 'Meena Stores', 'Vikram Singh', 'Lakshmi Agencies'];
const SAMPLE_PRODUCTS = [
  ['Basmati Rice 5kg', 'Staples', 450, 40],
  ['Red Label Tea 500g', 'Beverages', 290, 25],
  ['Surf Excel 1kg', 'Household', 135, 30],
  ['Britannia Marie 300g', 'Snacks', 35, 60],
  ['Saffola Oil 1L', 'Staples', 170, 22],
];

/**
 * Generates a small CSV in the provider's own export format so the whole
 * connect → import → view flow is demoable without a real export file.
 * The data is clearly synthetic (sample customers, last ~40 days).
 */
export function generateSampleCsv(providerId, dataType) {
  const provider = getProvider(providerId);
  const rand = mulberry32([...providerId].reduce((a, c) => a + c.charCodeAt(0), 7));
  const fmtDate = (t) => {
    const d = new Date(t);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  if (dataType === 'products') {
    const lines = ['Product Name,Category,Price,Stock,Unit'];
    for (const [name, cat, price, stock] of SAMPLE_PRODUCTS) {
      lines.push(`${name},${cat},${price},${stock},pcs`);
    }
    return lines.join('\n');
  }

  const m = provider?.mapping;
  const creditWord = m?.creditWords?.[0] ?? 'Payment';
  const debitWord = m?.debitWords?.[0] ?? 'Expense';
  // Header order mirrors each app's real export
  const header =
    providerId === 'khatabook'
      ? 'Date,Customer Name,Type,Amount,Note'
      : providerId === 'zoho-books'
        ? 'Invoice Date,Invoice Number,Customer Name,Status,Total'
        : providerId === 'tally'
          ? 'Date,Voucher Type,Party,Amount'
          : 'Date,Name,Type,Amount';

  const lines = [header];
  const n = 24;
  for (let i = 0; i < n; i += 1) {
    const t = Date.now() - Math.floor(rand() * 40) * DAY_MS;
    const name = SAMPLE_NAMES[Math.floor(rand() * SAMPLE_NAMES.length)];
    const isCredit = rand() < 0.72;
    const amt = Math.round(80 + rand() * 2400);
    if (providerId === 'khatabook') {
      lines.push(`${fmtDate(t)},${name},${isCredit ? 'You Got' : 'You Gave'},${amt},Sample entry`);
    } else if (providerId === 'zoho-books') {
      lines.push(`${fmtDate(t)},INV-${1000 + i},${name},${isCredit ? 'Paid' : 'Paid'},"₹${amt.toLocaleString('en-IN')}"`);
    } else if (providerId === 'tally') {
      lines.push(`${fmtDate(t)},${isCredit ? 'Sales' : 'Purchase'},${name},${amt}`);
    } else {
      lines.push(`${fmtDate(t)},${name},${isCredit ? creditWord : debitWord},${amt}`);
    }
  }
  return lines.join('\n');
}

// ------------------------------------------------------------ state & views

/** Full catalog merged with this merchant's connection states. */
export async function listIntegrations(merchantId) {
  const states = await Integration.find({ merchantId }).lean();
  const byProvider = new Map(states.map((s) => [s.provider, s]));
  return INTEGRATION_PROVIDERS.map((p) => {
    const s = byProvider.get(p.id);
    return {
      ...p,
      mapping: undefined,
      status: s?.status ?? 'not_connected',
      connectedAt: s?.connectedAt ?? null,
      lastImportAt: s?.lastImportAt ?? null,
      imported: s?.imported ?? { transactions: 0, expenses: 0, skus: 0 },
    };
  });
}

export async function connectIntegration(merchantId, providerId) {
  if (!getProvider(providerId)) throw ApiError.badRequest(`Unknown provider: ${providerId}`);
  await Integration.findOneAndUpdate(
    { merchantId, provider: providerId },
    { $set: { status: 'connected' }, $setOnInsert: { connectedAt: new Date() } },
    { upsert: true }
  );
  return listIntegrations(merchantId);
}

export async function disconnectIntegration(merchantId, providerId) {
  await Integration.findOneAndUpdate(
    { merchantId, provider: providerId },
    { $set: { status: 'disconnected' } }
  );
  return listIntegrations(merchantId);
}

/** Recently imported records for one provider (for the View Data panel). */
export async function getImportedData(merchantId, providerId) {
  const [transactions, expenses, skus, txAgg] = await Promise.all([
    Transaction.find({ merchantId, source: providerId })
      .sort({ timestamp: -1 })
      .limit(25)
      .select('amount timestamp rawPayload')
      .lean(),
    Expense.find({ merchantId, provider: providerId })
      .sort({ date: -1 })
      .limit(25)
      .select('amount date category')
      .lean(),
    SKU.find({ merchantId, createdVia: 'import' })
      .sort({ updatedAt: -1 })
      .limit(25)
      .select('name category price currentStock unit')
      .lean(),
    Transaction.aggregate([
      { $match: { merchantId, source: providerId } },
      { $group: { _id: null, revenue: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);
  return {
    totals: {
      revenue: txAgg[0]?.revenue ?? 0,
      transactions: txAgg[0]?.count ?? 0,
      expenses: expenses.length,
    },
    transactions: transactions.map((t) => ({
      amount: t.amount,
      timestamp: t.timestamp,
      description: t.rawPayload?.description ?? '',
    })),
    expenses,
    skus,
  };
}
