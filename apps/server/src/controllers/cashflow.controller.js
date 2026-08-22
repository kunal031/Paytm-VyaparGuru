import { Transaction } from '../models/Transaction.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getDailyCashflow,
  getExpenseBreakdown,
  detectHiddenExpenses,
  getForecast,
} from '../services/cashflow.service.js';

export const summary = asyncHandler(async (req, res) => {
  const [agg] = await Transaction.aggregate([
    { $match: { merchantId: req.merchant._id } },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        transactionCount: { $sum: 1 },
        firstTxn: { $min: '$timestamp' },
        lastTxn: { $max: '$timestamp' },
      },
    },
  ]);

  ok(res, {
    summary: agg
      ? {
          totalRevenue: agg.totalRevenue,
          transactionCount: agg.transactionCount,
          firstTxn: agg.firstTxn,
          lastTxn: agg.lastTxn,
        }
      : { totalRevenue: 0, transactionCount: 0, firstTxn: null, lastTxn: null },
  });
});

export const daily = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 90;
  const { series, avgCostRatio } = await getDailyCashflow(req.merchant._id, days);
  ok(res, { series, avgCostRatio });
});

export const expenses = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 90;
  const categories = await getExpenseBreakdown(req.merchant._id, days);
  ok(res, { categories });
});

export const hiddenExpenses = asyncHandler(async (req, res) => {
  const findings = await detectHiddenExpenses(req.merchant._id);
  ok(res, { findings });
});

export const forecast = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 30;
  const result = await getForecast(req.merchant._id, days);
  ok(res, result);
});
