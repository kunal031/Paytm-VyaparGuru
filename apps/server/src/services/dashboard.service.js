import { getSalesByPeriod, getTopSKUs } from './sales.service.js';
import { getInventoryOverview } from './inventory.service.js';
import { getForecast, detectHiddenExpenses } from './cashflow.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

const pct = (curr, prev) => (prev > 0 ? Number((((curr - prev) / prev) * 100).toFixed(1)) : null);

/**
 * Unified command-center summary composed from all three engines.
 * Each engine is fetched independently (allSettled) so one failure degrades
 * that card to null instead of killing the whole dashboard.
 */
export async function getDashboardSummary(merchantId) {
  const now = Date.now();

  const [today, thisWeek, lastWeek, last30, overview, forecast, topSkus, hidden] =
    await Promise.allSettled([
      getSalesByPeriod(merchantId, iso(now), iso(now)),
      getSalesByPeriod(merchantId, iso(now - 6 * DAY_MS), iso(now)),
      getSalesByPeriod(merchantId, iso(now - 13 * DAY_MS), iso(now - 7 * DAY_MS)),
      getSalesByPeriod(merchantId, iso(now - 29 * DAY_MS), iso(now)),
      getInventoryOverview(merchantId),
      getForecast(merchantId, 30),
      getTopSKUs(merchantId, 30),
      detectHiddenExpenses(merchantId),
    ]).then((results) => results.map((r) => (r.status === 'fulfilled' ? r.value : null)));

  const projectedNet = forecast?.points?.length
    ? forecast.points.reduce((a, p) => a + p.yhat, 0)
    : null;

  const urgent = (overview?.skus || [])
    .filter((s) => s.daysUntilStockout !== null && s.daysUntilStockout <= 7)
    .sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
    .slice(0, 3)
    .map((s) => ({
      name: s.name,
      daysUntilStockout: s.daysUntilStockout,
      suggestedReorderQty: s.suggestedReorderQty,
      unit: s.unit,
      festivalAhead: s.festivalAhead,
    }));

  const hiddenMonthly = (hidden || []).reduce((a, h) => a + h.estimatedMonthlyCost, 0);

  return {
    today: today ? { revenue: today.totals.revenue, transactions: today.totals.transactions } : null,
    week:
      thisWeek && lastWeek
        ? {
            revenue: thisWeek.totals.revenue,
            transactions: thisWeek.totals.transactions,
            lastWeekRevenue: lastWeek.totals.revenue,
            revenueChangePct: pct(thisWeek.totals.revenue, lastWeek.totals.revenue),
          }
        : null,
    sparkline: last30?.daily ?? [],
    forecast:
      projectedNet !== null
        ? {
            projectedNet,
            horizonDays: forecast.points.length,
            nextFestival: forecast.upcomingFestivals?.[0] ?? null,
            source: forecast.source,
          }
        : null,
    inventory: overview
      ? {
          ...overview.summary,
          urgent,
        }
      : null,
    topSeller: topSkus?.byRevenue?.[0] ?? null,
    worstSeller: topSkus?.worstByUnits?.[0] ?? null,
    hiddenCharges: hidden ? { count: hidden.length, estimatedMonthlyCost: hiddenMonthly } : null,
  };
}
