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
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db.js';
import { Merchant } from '../models/Merchant.js';
import { SKU } from '../models/SKU.js';
import { Transaction } from '../models/Transaction.js';
import { Expense } from '../models/Expense.js';
import { Insight } from '../models/Insight.js';
import { Bill } from '../models/Bill.js';
import { Customer } from '../models/Customer.js';
import { KhataEntry } from '../models/KhataEntry.js';
import { Counter } from '../models/Counter.js';
import { logger } from '../utils/logger.js';
import { BCRYPT_SALT_ROUNDS } from '../config/constants.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Plants demo customers with distinct, recognizable behaviour patterns for the
 * kirana merchant so the Customers intelligence page tells a story on first
 * open: a VIP, steady regulars, an at-risk lapser, a churned customer with an
 * outstanding udhaar, and fresh walk-ins.
 */
async function seedDemoCustomers(merchant, skuDocs) {
  const sku = (frag) => skuDocs.find((s) => s.name.includes(frag));
  const basketOf = (frags) =>
    frags
      .map((f) => sku(f))
      .filter(Boolean)
      .map((s) => ({ skuId: s._id, name: s.name, quantity: 1 + (s.price < 5000 ? 1 : 0), unitPrice: s.price, total: 0 }));

  // [name, phone, visit-days-ago list, basket, everyNthUdhaar]
  const PERSONAS = [
    ['Sunita Devi', '9811100001', [2, 6, 11, 16, 21, 27, 33, 39, 46, 52], ['Atta', 'Milk', 'Salt', 'Oil'], 0],
    ['Rajesh Kumar', '9811100002', [4, 12, 19, 26, 34, 41, 49], ['Milk', 'Parle-G', 'Maggi'], 0],
    ['Meena Ben', '9811100003', [7, 15, 23, 31, 40, 48], ['Surf Excel', 'Dettol', 'Colgate'], 3],
    ['Iqbal Bhai', '9811100004', [30, 44, 58, 72], ['Thums Up', 'Bhujia'], 0], // at risk: cadence ~14d, absent 30d
    ['Prakash Rao', '9811100005', [70, 84, 95], ['Tea', 'Salt', 'Parle-G'], 2], // churned + udhaar outstanding
    ['Anita Sharma', '9811100006', [3], ['Muesli', 'Milk'], 0], // new walk-in
    ['Vikram Singh', '9811100007', [9], ['Diya', 'Kaju Katli'], 0], // new
  ];

  const bills = [];
  const khata = [];
  const customersOut = [];
  let seq = 0;

  for (const [name, phone, daysAgo, basketFrags, udhaarEvery] of PERSONAS) {
    const customer = await Customer.create({ merchantId: merchant._id, name, phone });
    let balance = 0;
    daysAgo
      .sort((a, b) => b - a)
      .forEach((d, idx) => {
        seq += 1;
        const items = basketOf(basketFrags).map((i) => ({ ...i, total: i.unitPrice * i.quantity }));
        const total = items.reduce((a, i) => a + i.total, 0);
        const isUdhaar = udhaarEvery > 0 && idx % udhaarEvery === udhaarEvery - 1;
        const at = new Date(Date.now() - d * DAY_MS - 4 * 3600 * 1000);
        const billId = new mongoose.Types.ObjectId();
        bills.push({
          _id: billId,
          merchantId: merchant._id,
          billNo: `INV-${String(seq).padStart(4, '0')}`,
          items,
          subtotal: total,
          discount: 0,
          total,
          paymentMode: isUdhaar ? 'Udhaar' : ['Cash', 'QR'][idx % 2],
          customerId: customer._id,
          customerName: name,
          status: isUdhaar ? 'udhaar' : 'paid',
          returns: [],
          billedBy: merchant.ownerName,
          createdAt: at,
          updatedAt: at,
        });
        if (isUdhaar) {
          balance += total;
          khata.push({
            merchantId: merchant._id,
            customerId: customer._id,
            type: 'udhaar',
            amount: total,
            billId,
            note: `INV-${String(seq).padStart(4, '0')}`,
            createdAt: at,
            updatedAt: at,
          });
        }
      });
    if (balance > 0) await Customer.updateOne({ _id: customer._id }, { $set: { udhaarBalance: balance } });
    customersOut.push(customer);
  }

  // Bypass mongoose timestamps so bills keep their backdated createdAt
  if (bills.length) await Bill.collection.insertMany(bills);
  if (khata.length) await KhataEntry.collection.insertMany(khata);
  await Counter.findOneAndUpdate(
    { merchantId: merchant._id, name: 'bill' },
    { $set: { seq } },
    { upsert: true }
  );
  return { customers: customersOut.length, bills: bills.length };
}

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
    Bill.deleteMany({}),
    Customer.deleteMany({}),
    KhataEntry.deleteMany({}),
    Counter.deleteMany({}),
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

    // Demo customer story for the hero (kirana) merchant
    let customerSeed = null;
    if (data.merchant.businessType === 'kirana') {
      customerSeed = await seedDemoCustomers(merchant, skuDocs);
    }

    summary.push({
      merchant: merchant.businessName,
      email: merchant.email,
      skus: skuDocs.length,
      transactions: txnDocs.length,
      expenses: data.expenses.length,
      ...(customerSeed ? { customers: customerSeed.customers, bills: customerSeed.bills } : {}),
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
