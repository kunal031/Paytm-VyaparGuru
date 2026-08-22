import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { byPeriodSchema, daysQuerySchema, askSchema } from '../validators/sales.validators.js';
import {
  byPeriod,
  topSkus,
  stockoutHistory,
  discountImpact,
  ask,
  askVoice,
} from '../controllers/sales.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const router = Router();

router.use(requireAuth);

// Data endpoints (double as the copilot's tools)
router.get('/by-period', validate(byPeriodSchema), byPeriod);
router.get('/top-skus', validate(daysQuerySchema), topSkus);
router.get('/stockout-history', validate(daysQuerySchema), stockoutHistory);
router.get('/discount-impact', validate(daysQuerySchema), discountImpact);

// Copilot
router.post('/ask', validate(askSchema), ask);
router.post('/ask/voice', upload.single('audio'), askVoice);

export default router;
