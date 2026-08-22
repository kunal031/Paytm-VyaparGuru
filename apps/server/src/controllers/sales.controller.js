import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  getSalesByPeriod,
  getTopSKUs,
  getStockoutHistory,
  getDiscountImpact,
} from '../services/sales.service.js';
import { askCopilot } from '../services/agent.service.js';
import { transcribeAudio } from '../services/stt.service.js';

// ---------- Data endpoints (also used as the copilot's tools) ----------

export const byPeriod = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  ok(res, await getSalesByPeriod(req.merchant._id, from, to));
});

export const topSkus = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 30;
  ok(res, await getTopSKUs(req.merchant._id, days));
});

export const stockoutHistory = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 90;
  ok(res, await getStockoutHistory(req.merchant._id, days));
});

export const discountImpact = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 60;
  ok(res, await getDiscountImpact(req.merchant._id, days));
});

// ---------- Copilot ----------

const bearerToken = (req) => (req.headers.authorization || '').slice(7);

export const ask = asyncHandler(async (req, res) => {
  const { question, language = 'en' } = req.body;
  const result = await askCopilot({ question, language, authToken: bearerToken(req) });
  ok(res, result);
});

/** Voice ask: transcribe, then run the same copilot pipeline. */
export const askVoice = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Upload an audio file in the "audio" field');
  const language = req.body.language || 'en';
  const { transcript, source: sttSource } = await transcribeAudio(
    req.file.buffer,
    req.file.originalname || 'question.webm',
    req.file.mimetype
  );
  const result = await askCopilot({ question: transcript, language, authToken: bearerToken(req) });
  ok(res, { ...result, transcript, sttSource });
});
