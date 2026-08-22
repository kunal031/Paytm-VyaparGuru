import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { translateCatalog, SUPPORTED_LANGUAGES } from '../services/i18n.service.js';

const translateSchema = z.object({
  body: z.object({
    lang: z.string().min(2).max(5),
    strings: z.record(z.string(), z.string().max(300)).refine((s) => Object.keys(s).length <= 200, 'Too many strings'),
  }),
});

const router = Router();

router.get('/languages', (_req, res) => ok(res, { languages: SUPPORTED_LANGUAGES }));

router.post(
  '/',
  requireAuth,
  validate(translateSchema),
  asyncHandler(async (req, res) => {
    ok(res, await translateCatalog(req.body.lang, req.body.strings));
  })
);

export default router;
