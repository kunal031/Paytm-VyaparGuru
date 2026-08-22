/**
 * Seeds MongoDB from the data-simulator output files.
 *
 * 1. Run `npm run simulate` at the repo root first (or this script will tell you to).
 * 2. Run `npm run seed` against a real MongoDB. (With USE_IN_MEMORY_DB=true the
 *    dev server seeds automatically at boot instead, since in-memory data dies
 *    with the process.)
 *
 * All demo merchants get the password: Paytm@123
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { connectDb, disconnectDb } from '../config/db.js';
import { Merchant } from '../models/Merchant.js';
import { SKU } from '../models/SKU.js';
import { Transaction } from '../models/Transaction.js';
import { Expense } from '../models/Expense.js';
import { Insight } from '../models/Insight.js';
import { logger } from '../utils/logger.js';
import { BCRYPT_SALT_ROUNDS } from '../config/constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', '..', '..', '..', 'packages', 'data-simulator', 'output');

export const DEMO_PASSWORD = 'Paytm@123';

export async function seedFromSimulatorOutput() {
  let files = fs.existsSync(OUTPUT_DIR)
    ? fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.json'))
    : [];

  // No pre-generated data (fresh clone / cloud deploy) — run the simulator now.
  // generate.js is dependency-free, so this works in any Node environment.
  if (files.length === 0) {
    const generatorPath = path.join(OUTPUT_DIR, '..', 'generate.js');
    logger.info('Simulator output missing — generating synthetic data now');
    const { execFileSync } = await import('node:child_process');
    execFileSync(process.execPath, [generatorPath], { stdio: 'inherit' });
    files = fs.readdirSync(OUTPUT_DIR).filter((f) => f.endsWith('.json'));
  }
  if (files.length === 0) {
    throw new Error('Data generation produced no output files.');
  }

  logger.info('Clearing existing data');
  await Promise.all([
    Merchant.deleteMany({}),
    SKU.deleteMany({}),
    Transaction.deleteMany({}),
    Expense.deleteMany({}),
    Insight.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);
  const summary = [];

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, file), 'utf8'));

    const merchant = await Merchant.create({ ...data.merchant, passwordHash });

    const skuDocs = await SKU.insertMany(
      data.skus.map((s) => ({
        merchantId: merchant._id,
        name: s.name,
        category: s.category,
        price: s.price,
        costPrice: s.costPrice,
        currentStock: s.currentStock,
        unit: s.unit,
        createdVia: 'seed',
      }))
    );
    const skuIdByName = new Map(skuDocs.map((s) => [s.name, s._id]));

    const txnDocs = data.transactions.map((t) => ({
      merchantId: merchant._id,
      amount: t.amount,
      paymentMode: t.paymentMode,
      timestamp: new Date(t.timestamp),
      attributedSKUs: (t.attributedSKUs || []).map((a) => ({
        skuId: skuIdByName.get(a.skuName),
        quantity: a.quantity,
        confidence: a.confidence,
      })),
      rawPayload: t.rawPayload,
    }));
    // insertMany in batches to keep memory bounded
    const BATCH = 2000;
    for (let i = 0; i < txnDocs.length; i += BATCH) {
      await Transaction.insertMany(txnDocs.slice(i, i + BATCH), { ordered: false });
    }

    await Expense.insertMany(
      data.expenses.map((e) => ({
        merchantId: merchant._id,
        category: e.category,
        amount: e.amount,
        date: new Date(e.date),
        source: 'seed',
        isRecurring: e.isRecurring,
      }))
    );

    summary.push({
      merchant: merchant.businessName,
      email: merchant.email,
      skus: skuDocs.length,
      transactions: txnDocs.length,
      expenses: data.expenses.length,
    });
  }

  return summary;
}

// Allow running directly: node src/scripts/seed.js
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  try {
    await connectDb();
    const summary = await seedFromSimulatorOutput();
    for (const s of summary) {
      logger.info(s, 'Seeded merchant');
    }
    logger.info(`Done. All demo merchants use password: ${DEMO_PASSWORD}`);
  } catch (err) {
    logger.error({ err }, 'Seed failed');
    process.exitCode = 1;
  } finally {
    await disconnectDb();
  }
}
