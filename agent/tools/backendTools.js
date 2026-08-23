/**
 * Tool-calling functions the copilot uses to retrieve data from the Node API.
 * The agent may ONLY narrate numbers that come out of these tools — it never
 * invents figures. Every tool hits the same authenticated REST API the
 * frontend uses, so the agent sees exactly what the merchant sees.
 */
import axios from 'axios';

function client(ctx) {
  return axios.create({
    baseURL: ctx.apiBaseUrl,
    timeout: 20_000,
    headers: { Authorization: `Bearer ${ctx.authToken}` },
  });
}

const unwrap = (res) => {
  if (!res.data?.success) {
    throw new Error(res.data?.error?.message || 'Backend tool call failed');
  }
  return res.data.data;
};

/** Daily sales between two ISO dates (inclusive). */
export async function getSalesByPeriod(ctx, { from, to }) {
  return unwrap(await client(ctx).get('/sales/by-period', { params: { from, to } }));
}

/** Top SKUs over the last N days, ranked by revenue and units. */
export async function getTopSKUs(ctx, { days = 30 } = {}) {
  return unwrap(await client(ctx).get('/sales/top-skus', { params: { days } }));
}

/** Detected stockout gaps (multi-day zero-sale runs on moving SKUs). */
export async function getStockoutHistory(ctx, { days = 90 } = {}) {
  return unwrap(await client(ctx).get('/sales/stockout-history', { params: { days } }));
}

/** Discount impact — honest about data availability. */
export async function getDiscountImpact(ctx, { days = 60 } = {}) {
  return unwrap(await client(ctx).get('/sales/discount-impact', { params: { days } }));
}

/** Inventory overview (classification, stockout alerts, reorder advice). */
export async function getInventoryOverview(ctx) {
  return unwrap(await client(ctx).get('/inventory/overview'));
}

/** Raw SKU catalog with createdAt/createdVia (for "what's new" questions). */
export async function getAllSkus(ctx) {
  return unwrap(await client(ctx).get('/inventory/skus'));
}

/** Customer intelligence: segments, spends, visit cadence, at-risk list. */
export async function getCustomerInsights(ctx) {
  return unwrap(await client(ctx).get('/customers/insights'));
}

/** 30-day cash flow forecast with festival annotations. */
export async function getCashflowForecast(ctx, { days = 30 } = {}) {
  return unwrap(await client(ctx).get('/cashflow/forecast', { params: { days } }));
}
