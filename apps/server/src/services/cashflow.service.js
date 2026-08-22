import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Transaction } from '../models/Transaction.js';
import { Expense } from '../models/Expense.js';
import { mlClient } from './mlClient.service.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FESTIVAL_CALENDAR_PATH = path.join(
  __dirname, '..', '..', '..', 'ml-service', 'app', 'core', 'festival_calendar.json'
);

const IST = '+05:30';
const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

/**
 * Daily cash flow series for the last `days` days.
 * Returns [{ date, revenue, cogs, profit, expenses, net }] — all integer paise.
 *
 * COGS: attributed line items use their SKU's costPrice; the unattributed
 * remainder of each day's revenue is estimated at the merchant's average
 * attributed cost ratio (a real integration would refine this in Phase 3).
 */
export async function getDailyCashflow(merchantId, days) {
  const since = new Date(Date.now() - days * DAY_MS);
  const match = { merchantId, timestamp: { $gte: since } };

  const [revenueByDay, attributionByDay, expensesByDay] = await Promise.all([
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: IST } },
          revenue: { $sum: '$amount' },
          txnCount: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: match },
      { $unwind: '$attributedSKUs' },
      {
        $lookup: {
          from: 'skus',
          localField: 'attributedSKUs.skuId',
          foreignField: '_id',
          as: 'sku',
        },
      },
      { $unwind: '$sku' },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp', timezone: IST } },
          attributedRevenue: {
            $sum: { $multiply: ['$attributedSKUs.quantity', '$sku.price'] },
          },
          attributedCogs: {
            $sum: { $multiply: ['$attributedSKUs.quantity', '$sku.costPrice'] },
          },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { merchantId, date: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: IST } },
          expenses: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const attribution = new Map(attributionByDay.map((d) => [d._id, d]));
  const expenseMap = new Map(expensesByDay.map((d) => [d._id, d.expenses]));

  // Merchant-wide average cost ratio from attributed lines, for the unattributed remainder
  const totals = attributionByDay.reduce(
    (acc, d) => ({
      revenue: acc.revenue + d.attributedRevenue,
      cogs: acc.cogs + d.attributedCogs,
    }),
    { revenue: 0, cogs: 0 }
  );
  const avgCostRatio = totals.revenue > 0 ? Math.min(1, totals.cogs / totals.revenue) : 0.8;

  const byDay = new Map();
  for (const d of revenueByDay) {
    const attr = attribution.get(d._id) || { attributedRevenue: 0, attributedCogs: 0 };
    const unattributed = Math.max(0, d.revenue - attr.attributedRevenue);
    const cogs = Math.round(attr.attributedCogs + unattributed * avgCostRatio);
    byDay.set(d._id, { revenue: d.revenue, txnCount: d.txnCount, cogs });
  }

  // Dense series (fill closed/quiet days with zeros) so charts and forecasts see gaps
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = dayKey(Date.now() - i * DAY_MS);
    const day = byDay.get(key) || { revenue: 0, txnCount: 0, cogs: 0 };
    const expenses = expenseMap.get(key) || 0;
    series.push({
      date: key,
      revenue: day.revenue,
      cogs: day.cogs,
      profit: day.revenue - day.cogs,
      expenses,
      net: day.revenue - expenses,
      txnCount: day.txnCount,
    });
  }
  return { series, avgCostRatio: Number(avgCostRatio.toFixed(3)) };
}

/** Expense totals grouped by category. */
export async function getExpenseBreakdown(merchantId, days) {
  const since = new Date(Date.now() - days * DAY_MS);
  const categories = await Expense.aggregate([
    { $match: { merchantId, date: { $gte: since } } },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        isRecurring: { $max: { $cond: ['$isRecurring', 1, 0] } },
      },
    },
    { $sort: { total: -1 } },
  ]);
  return categories.map((c) => ({
    category: c._id,
    total: c.total,
    count: c.count,
    isRecurring: Boolean(c.isRecurring),
  }));
}

/**
 * Hidden-expense detection: clusters expenses by amount similarity, then flags
 * clusters that recur at a regular interval. Catches "quiet" auto-debits
 * (subscriptions, tool fees) that erode margins unnoticed.
 */
export async function detectHiddenExpenses(
  merchantId,
  { lookbackDays = 120, maxAmount = 500_000 } = {} // "hidden" = small charges (≤ ₹5,000)
) {
  const since = new Date(Date.now() - lookbackDays * DAY_MS);
  const expenses = await Expense.find({
    merchantId,
    date: { $gte: since },
    amount: { $lte: maxAmount },
  })
    .sort({ date: 1 })
    .lean();

  // Cluster by amount: same bucket when within 2% of each other
  const clusters = [];
  for (const exp of expenses) {
    const cluster = clusters.find(
      (c) => Math.abs(c.amount - exp.amount) <= c.amount * 0.02
    );
    if (cluster) {
      cluster.items.push(exp);
    } else {
      clusters.push({ amount: exp.amount, items: [exp] });
    }
  }

  const findings = [];
  for (const cluster of clusters) {
    if (cluster.items.length < 3) continue;

    const dates = cluster.items.map((i) => new Date(i.date).getTime());
    const gaps = [];
    for (let i = 1; i < dates.length; i += 1) gaps.push((dates[i] - dates[i - 1]) / DAY_MS);
    const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((a, g) => a + (g - meanGap) ** 2, 0) / gaps.length;
    const cv = meanGap > 0 ? Math.sqrt(variance) / meanGap : Infinity;

    // Regular cadence (weekly to ~monthly-ish) with low jitter = recurring charge
    const isRegular = meanGap >= 5 && meanGap <= 35 && cv < 0.35;
    if (!isRegular) continue;

    // Dominant category label for the cluster
    const byCategory = new Map();
    for (const item of cluster.items) {
      byCategory.set(item.category, (byCategory.get(item.category) || 0) + 1);
    }
    const [label] = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

    const monthlyCost = Math.round((cluster.amount * 30) / meanGap);
    findings.push({
      label,
      amount: cluster.amount,
      occurrences: cluster.items.length,
      intervalDays: Math.round(meanGap),
      estimatedMonthlyCost: monthlyCost,
      lastCharged: dayKey(dates[dates.length - 1]),
      alreadyKnownRecurring: cluster.items.every((i) => i.isRecurring),
    });
  }

  return findings.sort((a, b) => b.estimatedMonthlyCost - a.estimatedMonthlyCost);
}

// ---------- Forecasting ----------

function loadFestivalCalendar() {
  try {
    const raw = JSON.parse(fs.readFileSync(FESTIVAL_CALENDAR_PATH, 'utf8'));
    return raw.festivals;
  } catch {
    return [];
  }
}

function festivalMultiplierMap(festivals) {
  const map = new Map();
  for (const f of festivals) {
    const base = new Date(`${f.date}T00:00:00Z`);
    for (let offset = -f.spanDaysBefore; offset <= f.spanDaysAfter; offset += 1) {
      const key = dayKey(base.getTime() + offset * DAY_MS);
      const ramp =
        offset < 0 ? 1 + (f.multiplier - 1) * (1 + offset / (f.spanDaysBefore + 1)) : f.multiplier;
      const existing = map.get(key);
      if (!existing || ramp > existing.multiplier) {
        map.set(key, { multiplier: ramp, name: f.name });
      }
    }
  }
  return map;
}

/** Weekday-mean + festival-multiplier fallback when the ML service is down. */
function fallbackForecast(series, horizonDays) {
  const festivalMap = festivalMultiplierMap(loadFestivalCalendar());

  const byWeekday = Array.from({ length: 7 }, () => []);
  for (const point of series) {
    byWeekday[new Date(`${point.date}T00:00:00Z`).getUTCDay()].push(point.net);
  }
  const weekdayMeans = byWeekday.map((vals) =>
    vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  );
  const residuals = series.map(
    (p) => p.net - weekdayMeans[new Date(`${p.date}T00:00:00Z`).getUTCDay()]
  );
  const std = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / Math.max(1, residuals.length));
  const band = Math.round(1.28 * std); // ~80% interval

  const lastDate = new Date(`${series[series.length - 1].date}T00:00:00Z`);
  const points = [];
  for (let i = 1; i <= horizonDays; i += 1) {
    const date = new Date(lastDate.getTime() + i * DAY_MS);
    const key = dayKey(date);
    const festival = festivalMap.get(key);
    const yhat = Math.round(weekdayMeans[date.getUTCDay()] * (festival?.multiplier || 1));
    points.push({
      date: key,
      yhat,
      yhatLower: yhat - band,
      yhatUpper: yhat + band,
      festival: festival?.name || null,
    });
  }
  return { model: 'weekday-mean+festival (js fallback)', points };
}

/**
 * 15–30 day net cash flow forecast. Tries the Python ML service (SARIMAX with
 * festival regressors); degrades to a local seasonal model if it's unreachable.
 */
export async function getForecast(merchantId, horizonDays) {
  const { series } = await getDailyCashflow(merchantId, 120);
  const history = series.map((p) => ({ date: p.date, net: p.net }));

  let result;
  let source;
  try {
    const { data } = await mlClient.post('/forecast/cashflow', {
      history,
      horizonDays,
    });
    result = data;
    source = 'ml-service';
  } catch (err) {
    logger.warn({ err: err.message }, 'ML service unreachable, using fallback forecast');
    result = fallbackForecast(series, horizonDays);
    source = 'fallback';
  }

  // One entry per festival (its peak day = last day of the run, where the multiplier is full)
  const festivalRuns = new Map();
  for (const p of result.points) {
    if (p.festival) festivalRuns.set(p.festival, p.date);
  }
  const upcomingFestivals = [...festivalRuns.entries()].map(([name, date]) => ({ name, date }));

  return { source, model: result.model, points: result.points, upcomingFestivals };
}
