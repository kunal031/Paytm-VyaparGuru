import { Bill } from '../models/Bill.js';
import { Customer } from '../models/Customer.js';
import { KhataEntry } from '../models/KhataEntry.js';
import { Counter } from '../models/Counter.js';
import { Transaction } from '../models/Transaction.js';
import { Expense } from '../models/Expense.js';
import { SKU } from '../models/SKU.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const IST = '+05:30';

function dayRange(dateStr) {
  const from = new Date(`${dateStr}T00:00:00+05:30`);
  const to = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { from, to };
}

/**
 * Creates a bill: validates items, computes totals server-side (never trust
 * client math — this is the billing-errors fix), decrements stock, records a
 * Transaction for paid bills (so every analytics engine sees it, with
 * ground-truth SKU attribution), or a khata entry for udhaar bills.
 */
export async function createBill(merchantId, payload, billedBy) {
  const { items, discount = 0, paymentMode, customerId, customerName } = payload;

  // Resolve SKUs and compute authoritative prices/totals
  const skuIds = items.filter((i) => i.skuId).map((i) => i.skuId);
  const skus = await SKU.find({ merchantId, _id: { $in: skuIds } });
  const skuMap = new Map(skus.map((s) => [s._id.toString(), s]));

  const billItems = items.map((i) => {
    const sku = i.skuId ? skuMap.get(String(i.skuId)) : null;
    if (i.skuId && !sku) throw ApiError.badRequest(`Unknown product in bill: ${i.name || i.skuId}`);
    const unitPrice = sku ? sku.price : Math.round(i.unitPrice ?? 0);
    if (unitPrice < 0) throw ApiError.badRequest('Item price cannot be negative');
    return {
      skuId: sku?._id ?? null,
      name: sku?.name ?? String(i.name || '').slice(0, 120),
      quantity: Math.round(i.quantity),
      unitPrice,
      total: unitPrice * Math.round(i.quantity),
    };
  });
  if (!billItems.length) throw ApiError.badRequest('A bill needs at least one item');

  const subtotal = billItems.reduce((a, i) => a + i.total, 0);
  const safeDiscount = Math.min(Math.max(0, Math.round(discount)), subtotal);
  const total = subtotal - safeDiscount;

  // Any bill may be tagged with a customer (that's what powers customer
  // intelligence); udhaar bills REQUIRE one for the khata.
  let customer = null;
  if (customerId) customer = await Customer.findOne({ _id: customerId, merchantId });
  else if (customerName?.trim()) {
    customer = await Customer.findOneAndUpdate(
      { merchantId, name: customerName.trim() },
      { $setOnInsert: { merchantId, name: customerName.trim() } },
      { upsert: true, new: true }
    );
  }
  if (paymentMode === 'Udhaar' && !customer) {
    throw ApiError.badRequest('Udhaar bills need a customer (pick or add one)');
  }

  const seq = await Counter.next(merchantId, 'bill');
  const bill = await Bill.create({
    merchantId,
    billNo: `INV-${String(seq).padStart(4, '0')}`,
    items: billItems,
    subtotal,
    discount: safeDiscount,
    total,
    paymentMode,
    customerId: customer?._id ?? null,
    customerName: customer?.name ?? customerName ?? null,
    status: paymentMode === 'Udhaar' ? 'udhaar' : 'paid',
    billedBy,
  });

  // Decrement stock for catalog items
  await Promise.all(
    billItems
      .filter((i) => i.skuId)
      .map((i) =>
        SKU.updateOne({ _id: i.skuId }, [
          { $set: { currentStock: { $max: [0, { $subtract: ['$currentStock', i.quantity] }] } } },
        ])
      )
  );

  if (paymentMode === 'Udhaar') {
    // Credit sale: goes on the khata, cash arrives when the customer pays
    await KhataEntry.create({
      merchantId,
      customerId: customer._id,
      type: 'udhaar',
      amount: total,
      billId: bill._id,
      note: bill.billNo,
    });
    await Customer.updateOne({ _id: customer._id }, { $inc: { udhaarBalance: total } });
  } else if (total > 0) {
    // Paid sale: real revenue with ground-truth SKU attribution
    await Transaction.create({
      merchantId,
      amount: total,
      paymentMode,
      source: 'billing',
      timestamp: bill.createdAt,
      attributedSKUs: billItems
        .filter((i) => i.skuId)
        .map((i) => ({ skuId: i.skuId, quantity: i.quantity, confidence: 1 })),
      rawPayload: { billNo: bill.billNo, billId: bill._id },
    });
  }

  logger.info({ billNo: bill.billNo, total, paymentMode }, 'Bill created');
  return bill;
}

export async function listBills(merchantId, { date, limit = 50 }) {
  const filter = { merchantId };
  if (date) {
    const { from, to } = dayRange(date);
    filter.createdAt = { $gte: from, $lte: to };
  }
  return Bill.find(filter).sort({ createdAt: -1 }).limit(Math.min(limit, 200)).lean();
}

export const getBill = (merchantId, id) => Bill.findOne({ _id: id, merchantId }).lean();

/**
 * Records a return/refund on a bill: caps at the remaining refundable amount,
 * optionally restocks items, and books the refund as an expense (cash out) so
 * cash flow stays honest. Udhaar bills reduce the customer's balance instead.
 */
export async function returnBill(merchantId, billId, { amount, reason = '', restock = [] }) {
  const bill = await Bill.findOne({ _id: billId, merchantId });
  if (!bill) throw ApiError.badRequest('Bill not found');

  const alreadyReturned = bill.returns.reduce((a, r) => a + r.amount, 0);
  const refundable = bill.total - alreadyReturned;
  const refund = Math.min(Math.max(0, Math.round(amount)), refundable);
  if (refund <= 0) throw ApiError.badRequest(`Nothing left to refund on ${bill.billNo}`);

  bill.returns.push({ amount: refund, reason: String(reason).slice(0, 200), at: new Date() });
  bill.status = refund + alreadyReturned >= bill.total ? 'refunded' : 'partial_refund';
  await bill.save();

  // Restock returned items (only ones actually on the bill)
  const onBill = new Map(bill.items.filter((i) => i.skuId).map((i) => [String(i.skuId), i.quantity]));
  await Promise.all(
    restock
      .filter((r) => onBill.has(String(r.skuId)))
      .map((r) =>
        SKU.updateOne(
          { _id: r.skuId, merchantId },
          { $inc: { currentStock: Math.min(Math.round(r.quantity), onBill.get(String(r.skuId))) } }
        )
      )
  );

  if (bill.paymentMode === 'Udhaar' && bill.customerId) {
    // Credit sale return: reduce what the customer owes
    await Customer.updateOne({ _id: bill.customerId }, { $inc: { udhaarBalance: -refund } });
    await KhataEntry.create({
      merchantId,
      customerId: bill.customerId,
      type: 'payment',
      amount: refund,
      billId: bill._id,
      note: `Return on ${bill.billNo}`,
    });
  } else {
    // Cash refund out of the till
    await Expense.create({
      merchantId,
      category: 'Refunds',
      amount: refund,
      date: new Date(),
      source: 'manual',
      provider: null,
    });
  }

  logger.info({ billNo: bill.billNo, refund }, 'Return recorded');
  return bill.toObject();
}

/** End-of-day reconciliation: everything that moved money today, in one view. */
export async function getDaySummary(merchantId, dateStr) {
  const { from, to } = dayRange(dateStr);
  const [bills, khataPayments] = await Promise.all([
    Bill.find({ merchantId, createdAt: { $gte: from, $lte: to } }).lean(),
    KhataEntry.find({ merchantId, type: 'payment', createdAt: { $gte: from, $lte: to } }).lean(),
  ]);

  const byMode = {};
  let grossSales = 0;
  let udhaarGiven = 0;
  for (const b of bills) {
    grossSales += b.total;
    byMode[b.paymentMode] = (byMode[b.paymentMode] || 0) + b.total;
    if (b.paymentMode === 'Udhaar') udhaarGiven += b.total;
  }

  // Refunds recorded today (on any bill)
  const refundAgg = await Bill.aggregate([
    { $match: { merchantId } },
    { $unwind: '$returns' },
    { $match: { 'returns.at': { $gte: from, $lte: to } } },
    { $group: { _id: null, total: { $sum: '$returns.amount' } } },
  ]);
  const refunds = refundAgg[0]?.total ?? 0;
  const khataReceived = khataPayments.reduce((a, k) => a + k.amount, 0);

  return {
    date: dateStr,
    billCount: bills.length,
    grossSales,
    byMode,
    udhaarGiven,
    khataReceived,
    refunds,
    // What actually landed in hand/account today
    netCollected: grossSales - udhaarGiven + khataReceived - refunds,
  };
}

// ------------------------------- Khata --------------------------------

export const listCustomers = (merchantId) =>
  Customer.find({ merchantId }).sort({ udhaarBalance: -1 }).lean();

export const createCustomer = (merchantId, { name, phone }) =>
  Customer.create({ merchantId, name: name.trim(), phone: phone || null });

export async function recordKhataPayment(merchantId, customerId, { amount, paymentMode = 'Cash' }) {
  const customer = await Customer.findOne({ _id: customerId, merchantId });
  if (!customer) throw ApiError.badRequest('Customer not found');
  const paise = Math.round(amount);
  if (paise <= 0) throw ApiError.badRequest('Payment must be positive');

  await KhataEntry.create({
    merchantId,
    customerId,
    type: 'payment',
    amount: paise,
    note: 'Khata payment',
  });
  await Customer.updateOne({ _id: customerId }, { $inc: { udhaarBalance: -paise } });

  // The cash actually arrives now — this is when it becomes revenue
  await Transaction.create({
    merchantId,
    amount: paise,
    paymentMode: paymentMode === 'QR' ? 'QR' : 'Cash',
    source: 'billing',
    timestamp: new Date(),
    attributedSKUs: [],
    rawPayload: { khata: true, customerName: customer.name },
  });

  return Customer.findById(customerId).lean();
}

export async function getCustomerKhata(merchantId, customerId) {
  const [customer, entries] = await Promise.all([
    Customer.findOne({ _id: customerId, merchantId }).lean(),
    KhataEntry.find({ merchantId, customerId }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);
  if (!customer) throw ApiError.badRequest('Customer not found');
  return { customer, entries };
}
