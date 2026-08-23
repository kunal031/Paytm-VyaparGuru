import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getCustomerInsights, getCustomerProfile } from '../services/customerInsights.service.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/insights',
  asyncHandler(async (req, res) => {
    ok(res, await getCustomerInsights(req.merchant._id));
  })
);

router.get(
  '/:id/profile',
  asyncHandler(async (req, res) => {
    ok(res, await getCustomerProfile(req.merchant._id, req.params.id));
  })
);

export default router;
