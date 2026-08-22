import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getDashboardSummary } from '../services/dashboard.service.js';

export const summary = asyncHandler(async (req, res) => {
  ok(res, await getDashboardSummary(req.merchant._id));
});
