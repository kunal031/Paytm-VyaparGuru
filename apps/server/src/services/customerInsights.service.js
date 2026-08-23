import { Bill } from '../models/Bill.js';
import { Customer } from '../models/Customer.js';
import { KhataEntry } from '../models/KhataEntry.js';
import { SKU } from '../models/SKU.js';
import { ApiError } from '../utils/ApiError.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Explainable, rule-based customer segmentation (RFM-style):
 * every label comes with the numbers that produced it, so the merchant can
 * see WHY someone is "at risk" — not just a black-box tag.
 */
function segmentOf({ visits, daysSinceLastVisit, cadence, totalSpend }, spendCutoffVip) {
  if (visits >= 2 && daysSinceLastVisit > Math.max(60, cadence * 3)) return 'churned';
  if (visits >= 2 && daysSinceLastVisit > Math.max(21, cadence * 2)) return 'at_risk';
  if (visits <= 2 && daysSinceLastVisit <= 45) return 'new';
  if (visits >= 3 && totalSpend >= spendCutoffVip) return 'vip';
  if (visits >= 3) return 'regular';
  return 'occasional';
}

function statsFromBills(bills) {
  const visits = bills.length;
  const totalSpend = bills.reduce((a, b) => a + b.total, 0);
  const times = bills.map((b) => new Date(b.createdAt).getTime()).sort((a, b) => a - b);
  const firstVisit = times[0] ?? null;
  const lastVisit = times[times.length - 1] ?? null;
  const gaps = [];
  for (let i = 1; i < times.length; i += 1) gaps.push((times[i] - times[i - 1]) / DAY_MS);
  const cadence = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 30;

  // Favorite items across all their bills
  const itemCount = new Map();
  for (const b of bills) {
    for (const i of b.items) {
      const key = i.name;
      itemCount.set(key, (itemCount.get(key) || 0) + i.quantity);
    }
  }
  const favorites = [...itemCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, qty]) => ({ name, qty }));

  return {
    visits,
    totalSpend,
    avgTicket: visits ? Math.round(totalSpend / visits) : 0,
    firstVisit,
    lastVisit,
    daysSinceLastVisit: lastVisit ? Math.floor((Date.now() - lastVisit) / DAY_MS) : null,
    cadence: Math.round(cadence),
    favorites,
  };
}

/** Full customer list enriched with stats + segments, plus a summary. */
export async function getCustomerInsights(merchantId) {
  const [customers, bills] = await Promise.all([
    Customer.find({ merchantId }).lean(),
    Bill.find({ merchantId, customerId: { $ne: null } })
      .select('customerId items total createdAt returns')
      .lean(),
  ]);

  const billsByCustomer = new Map();
  for (const b of bills) {
    const key = String(b.customerId);
    if (!billsByCustomer.has(key)) billsByCustomer.set(key, []);
    billsByCustomer.get(key).push(b);
  }

  const enrichedRaw = customers.map((c) => {
    const stats = statsFromBills(billsByCustomer.get(String(c._id)) ?? []);
    return { ...c, ...stats };
  });

  // VIP cutoff: top quartile of spend among customers with any purchase
  const spends = enrichedRaw.filter((c) => c.totalSpend > 0).map((c) => c.totalSpend).sort((a, b) => a - b);
  const spendCutoffVip = spends.length ? spends[Math.floor(spends.length * 0.75)] : Infinity;

  const enriched = enrichedRaw
    .map((c) => ({
      ...c,
      segment: c.visits === 0 ? 'new' : segmentOf(c, spendCutoffVip),
    }))
    .sort((a, b) => b.totalSpend - a.totalSpend);

  const bySegment = {};
  for (const c of enriched) bySegment[c.segment] = (bySegment[c.segment] || 0) + 1;
  const repeaters = enriched.filter((c) => c.visits >= 2).length;

  return {
    summary: {
      total: enriched.length,
      bySegment,
      repeatRate: enriched.length ? Math.round((repeaters / enriched.length) * 100) : 0,
      totalOutstandingUdhaar: enriched.reduce((a, c) => a + Math.max(0, c.udhaarBalance || 0), 0),
    },
    customers: enriched,
  };
}

/** One customer's full profile: stats, purchase history, khata, churn signals. */
export async function getCustomerProfile(merchantId, customerId) {
  const customer = await Customer.findOne({ _id: customerId, merchantId }).lean();
  if (!customer) throw ApiError.badRequest('Customer not found');

  const [bills, khata] = await Promise.all([
    Bill.find({ merchantId, customerId }).sort({ createdAt: -1 }).limit(50).lean(),
    KhataEntry.find({ merchantId, customerId }).sort({ createdAt: -1 }).limit(30).lean(),
  ]);

  const stats = statsFromBills([...bills].reverse());
  const { summary } = await getCustomerInsights(merchantId);
  const segment = stats.visits === 0 ? 'new' : segmentOf(stats, Infinity) === 'vip' ? 'vip' : segmentOf(stats, Infinity);

  // Explainable churn/risk signals
  const signals = [];
  if (stats.visits >= 2 && stats.daysSinceLastVisit > stats.cadence * 2) {
    signals.push(
      `Used to visit every ~${stats.cadence} days, but hasn't come in ${stats.daysSinceLastVisit} days.`
    );
  }
  const lastBill = bills[0];
  if (lastBill?.returns?.length) {
    signals.push(`Their last visit ended with a return/refund (${lastBill.returns[0].reason || 'no reason recorded'}) — worth a follow-up.`);
  }
  if ((customer.udhaarBalance || 0) > 0) {
    signals.push(`Outstanding udhaar on the khata — some customers avoid the shop when they owe money.`);
  }
  if (stats.favorites[0]) {
    const fav = await SKU.findOne({ merchantId, name: stats.favorites[0].name }).lean();
    if (fav && fav.currentStock === 0) {
      signals.push(`Their favourite item (${fav.name}) is currently out of stock.`);
    }
  }

  return {
    customer,
    stats,
    segment,
    signals,
    bills: bills.map((b) => ({
      _id: b._id,
      billNo: b.billNo,
      createdAt: b.createdAt,
      total: b.total,
      paymentMode: b.paymentMode,
      status: b.status,
      items: b.items.map((i) => ({ name: i.name, quantity: i.quantity, total: i.total })),
    })),
    khata,
    context: { repeatRate: summary.repeatRate },
  };
}
