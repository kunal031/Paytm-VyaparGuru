import { SKU } from '../models/SKU.js';
import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import {
  getInventoryOverview,
  attributeUnmatchedTransactions,
} from '../services/inventory.service.js';
import { parseStockPhoto, structureTranscript } from '../services/vision.service.js';
import { transcribeAudio } from '../services/stt.service.js';

export const listSKUs = asyncHandler(async (req, res) => {
  const skus = await SKU.find({ merchantId: req.merchant._id }).sort({ name: 1 }).lean();
  ok(res, { skus });
});

export const overview = asyncHandler(async (req, res) => {
  const result = await getInventoryOverview(req.merchant._id);
  ok(res, result);
});

/** Photo onboarding: parse shelf/register image into SKU drafts for review. */
export const onboardPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Upload an image file in the "photo" field');
  if (!req.file.mimetype.startsWith('image/')) {
    throw ApiError.badRequest('File must be an image (jpeg/png/webp)');
  }
  const result = await parseStockPhoto(req.file.buffer, req.file.mimetype);
  ok(res, { ...result, reviewRequired: true });
});

/** Voice onboarding: transcribe audio, then structure the transcript into drafts. */
export const onboardVoice = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Upload an audio file in the "audio" field');
  const { source: sttSource, transcript } = await transcribeAudio(
    req.file.buffer,
    req.file.originalname || 'note.webm',
    req.file.mimetype
  );
  const structured = await structureTranscript(transcript);
  ok(res, {
    transcript,
    sttSource,
    source: structured.source,
    note: structured.note,
    items: structured.items,
    reviewRequired: true,
  });
});

/** Saves merchant-confirmed SKU drafts (upserts by name). */
export const saveSkus = asyncHandler(async (req, res) => {
  const { items } = req.body;
  const results = { created: 0, updated: 0 };

  for (const item of items) {
    const existing = await SKU.findOne({ merchantId: req.merchant._id, name: item.name });
    if (existing) {
      existing.category = item.category ?? existing.category;
      if (item.price != null) existing.price = item.price;
      if (item.costPrice != null) existing.costPrice = item.costPrice;
      if (item.currentStock != null) existing.currentStock = item.currentStock;
      existing.unit = item.unit ?? existing.unit;
      await existing.save();
      results.updated += 1;
    } else {
      await SKU.create({
        merchantId: req.merchant._id,
        name: item.name,
        category: item.category,
        price: item.price ?? 0,
        // Default COGS to 80% of price until the merchant refines it
        costPrice: item.costPrice ?? Math.round((item.price ?? 0) * 0.8),
        currentStock: item.currentStock ?? 0,
        unit: item.unit || 'pcs',
        createdVia: item.createdVia || 'manual',
      });
      results.created += 1;
    }
  }
  ok(res, results, 201);
});

/** Backfills SKU attribution on unattributed transactions. */
export const attribute = asyncHandler(async (req, res) => {
  const result = await attributeUnmatchedTransactions(req.merchant._id);
  ok(res, result);
});
