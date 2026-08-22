import {
  getSalesByPeriod,
  getTopSKUs,
  getStockoutHistory,
  getDiscountImpact,
  getInventoryOverview,
  getCashflowForecast,
} from '../tools/backendTools.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (t) => new Date(t).toISOString().slice(0, 10);

/**
 * Node: retrieve exactly the data the intent needs via backend API tools.
 * Tool failures are captured per-tool so one flaky call doesn't sink the answer.
 */
export async function retrieveData(state) {
  const ctx = state.ctx;
  const now = Date.now();
  const retrieved = {};
  const toolCalls = [];

  const run = async (name, fn) => {
    try {
      retrieved[name] = await fn();
      toolCalls.push({ tool: name, ok: true });
    } catch (err) {
      retrieved[name] = null;
      toolCalls.push({ tool: name, ok: false, error: err.message });
    }
  };

  const thisWeek = { from: iso(now - 6 * DAY_MS), to: iso(now) };
  const lastWeek = { from: iso(now - 13 * DAY_MS), to: iso(now - 7 * DAY_MS) };

  switch (state.intent) {
    case 'sales_trend':
    case 'sales_drop_diagnosis':
      await Promise.all([
        run('thisWeek', () => getSalesByPeriod(ctx, thisWeek)),
        run('lastWeek', () => getSalesByPeriod(ctx, lastWeek)),
        run('last30', () => getSalesByPeriod(ctx, { from: iso(now - 29 * DAY_MS), to: iso(now) })),
        run('stockouts', () => getStockoutHistory(ctx, { days: 60 })),
        run('topSkus', () => getTopSKUs(ctx, { days: 30 })),
      ]);
      break;
    case 'top_products':
      await Promise.all([
        run('topSkus', () => getTopSKUs(ctx, { days: 30 })),
        run('thisWeek', () => getSalesByPeriod(ctx, thisWeek)),
      ]);
      break;
    case 'worst_products':
      await Promise.all([
        run('topSkus', () => getTopSKUs(ctx, { days: 30 })),
        run('inventory', () => getInventoryOverview(ctx)),
      ]);
      break;
    case 'stockout_history':
      await Promise.all([
        run('stockouts', () => getStockoutHistory(ctx, { days: 90 })),
        run('inventory', () => getInventoryOverview(ctx)),
      ]);
      break;
    case 'discount_impact':
      await run('discounts', () => getDiscountImpact(ctx, { days: 60 }));
      break;
    case 'forecast':
      await Promise.all([
        run('forecast', () => getCashflowForecast(ctx, { days: 30 })),
        run('inventory', () => getInventoryOverview(ctx)),
      ]);
      break;
    default:
      // general/unmatched: broad snapshot so the answer can still be useful
      await Promise.all([
        run('thisWeek', () => getSalesByPeriod(ctx, thisWeek)),
        run('lastWeek', () => getSalesByPeriod(ctx, lastWeek)),
        run('topSkus', () => getTopSKUs(ctx, { days: 30 })),
        run('inventory', () => getInventoryOverview(ctx)),
      ]);
      break;
  }

  return { retrieved, toolCalls };
}
