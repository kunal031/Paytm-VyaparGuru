import { Transaction } from '../models/Transaction.js';
import { SKU } from '../models/SKU.js';

const IST = '+05:30';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Daily revenue/transactions between two dates (inclusive), plus totals. */
export async function getSalesByPeriod(merchantId, from, to) {
  const fromDate = new Date(`${from}T00:00:00+05:30`);
  const toDate = new Date(`${to}T23:59:59+05:30`);

  const daily = await Transaction.aggregate([
    { $match: { merchantId, timestamp: { $gte: fromDate, $lte: toDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: IST } },
        revenue: { $sum: '$amount' },
        transactions: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const totals = daily.reduce(
    (acc, d) => ({ revenue: acc.revenue + d.revenue, transactions: acc.transactions + d.transactions }),
    { revenue: 0, transactions: 0 }
  );

  return {
    from,
    to,
    totals,
    daily: daily.map((d) => ({ date: d._id, revenue: d.revenue, transactions: d.transactions })),
  };
}

/** Top SKUs over the last N days by revenue and by units (attributed sales). */
export async function getTopSKUs(merchantId, days) {
  const since = new Date(Date.now() - days * DAY_MS);
  const agg = await Transaction.aggregate([
    { $match: { merchantId, timestamp: { $gte: since } } },
    { $unwind: '$attributedSKUs' },
    { $lookup: { from: 'skus', localField: 'attributedSKUs.skuId', foreignField: '_id', as: 'sku' } },
    { $unwind: '$sku' },
    {
      $group: {
        _id: '$sku._id',
        name: { $first: '$sku.name' },
        category: { $first: '$sku.category' },
        units: { $sum: '$attributedSKUs.quantity' },
        revenue: { $sum: { $multiply: ['$attributedSKUs.quantity', '$sku.price'] } },
      },
    },
  ]);

  const rows = agg.map((r) => ({
    skuId: r._id,
    name: r.name,
    category: r.category,
    units: r.units,
    revenue: r.revenue,
  }));

  return {
    days,
    byRevenue: [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 10),
    byUnits: [...rows].sort((a, b) => b.units - a.units).slice(0, 10),
  };
}

/**
 * Stockout gap detection: for SKUs that normally move (>= ~0.5 units/day),
 * find runs of >= 3 consecutive zero-sale days in the window. Estimated lost
 * revenue = gap length x the SKU's average daily revenue outside the gap.
 */
export async function getStockoutHistory(merchantId, days) {
  const since = new Date(Date.now() - days * DAY_MS);
  const [skus, sales] = await Promise.all([
    SKU.find({ merchantId }).select('_id name price').lean(),
    Transaction.aggregate([
      { $match: { merchantId, timestamp: { $gte: since } } },
      { $unwind: '$attributedSKUs' },
      {
        $group: {
          _id: {
            sku: '$attributedSKUs.skuId',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: IST } },
          },
          units: { $sum: '$attributedSKUs.quantity' },
        },
      },
    ]),
  ]);

  const salesBySku = new Map();
  for (const row of sales) {
    const key = row._id.sku?.toString();
    if (!key) continue;
    if (!salesBySku.has(key)) salesBySku.set(key, new Map());
    salesBySku.get(key).set(row._id.day, row.units);
  }

  const dayKeys = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    dayKeys.push(new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10));
  }

  const gaps = [];
  for (const sku of skus) {
    const daily = salesBySku.get(sku._id.toString());
    if (!daily) continue;
    const totalUnits = [...daily.values()].reduce((a, b) => a + b, 0);
    const velocity = totalUnits / days;
    if (velocity < 0.5) continue; // slow movers produce meaningless "gaps"

    const avgDailyRevenue = (totalUnits * sku.price) / days;
    let runStart = null;
    for (let i = 0; i <= dayKeys.length; i += 1) {
      const day = dayKeys[i];
      const sold = day ? daily.get(day) : undefined;
      if (day && !sold) {
        if (runStart === null) runStart = i;
      } else {
        if (runStart !== null) {
          const runLen = i - runStart;
          // Ignore a run still open today (that's a live stockout, not history)
          if (runLen >= 3 && i < dayKeys.length) {
            gaps.push({
              skuName: sku.name,
              from: dayKeys[runStart],
              to: dayKeys[i - 1],
              days: runLen,
              estimatedLostRevenue: Math.round(runLen * avgDailyRevenue),
            });
          }
        }
        runStart = null;
      }
    }
  }

  gaps.sort((a, b) => b.estimatedLostRevenue - a.estimatedLostRevenue);
  return { windowDays: days, gaps };
}

/**
 * Discount impact: transactions carry no discount tags in the current data
 * model, so this reports honestly and offers average ticket size as a proxy.
 */
export async function getDiscountImpact(merchantId, days) {
  const half = Math.floor(days / 2);
  const now = Date.now();
  const [recent, prior] = await Promise.all([
    Transaction.aggregate([
      { $match: { merchantId, timestamp: { $gte: new Date(now - half * DAY_MS) } } },
      { $group: { _id: null, avg: { $avg: '$amount' }, count: { $sum: 1 } } },
    ]),
    Transaction.aggregate([
      {
        $match: {
          merchantId,
          timestamp: { $gte: new Date(now - days * DAY_MS), $lt: new Date(now - half * DAY_MS) },
        },
      },
      { $group: { _id: null, avg: { $avg: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    available: false,
    reason:
      'Transactions are not tagged with discounts/offers yet, so true discount impact cannot be measured.',
    proxy: {
      avgTicketRecent: Math.round(recent[0]?.avg ?? 0),
      avgTicketPrior: Math.round(prior[0]?.avg ?? 0),
      windowDays: days,
    },
  };
}
