import Anthropic from '@anthropic-ai/sdk';
import { hasLlm, complete } from '@vyaparguru/agent/llm';
import { logger } from '../utils/logger.js';

const MODEL = 'claude-opus-5';

const SYSTEM_PROMPT = `You are a stock-onboarding assistant for Indian SMB merchants using Paytm VyaparGuru.
You will receive a photo of a shop shelf, stock register page, or product pile.
Extract every distinct product (SKU) you can identify into JSON.

Rules:
- Respond with ONLY a JSON array, no prose, no markdown fences.
- Each element: {"name": string, "category": string, "priceINR": number|null, "quantity": number|null, "unit": string}
- name: brand + product + pack size when readable (e.g. "Parle-G Biscuit 250g").
- category: one of Snacks, Beverages, Dairy, Staples, Household, Personal Care, Sweets, Festive, Other — or a sensible short label.
- priceINR: MRP in rupees if visible on packaging or the register, else null.
- quantity: estimated count of units visible / stock quantity from the register, else null.
- unit: pcs, pack, bottle, kg, box, etc.
- If the image contains no recognizable products, return [].`;

/** Extracts a JSON array from a model response that should be JSON-only. */
export function extractJsonArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON array found in model response');
  }
  return JSON.parse(text.slice(start, end + 1));
}

/** Normalizes a parsed item into an SKU draft (prices → paise). */
export function toSkuDraft(item, createdVia) {
  return {
    name: String(item.name || '').slice(0, 120),
    category: String(item.category || 'Other').slice(0, 60),
    price: item.priceINR != null ? Math.round(Number(item.priceINR) * 100) : null,
    currentStock: item.quantity != null ? Math.max(0, Math.round(Number(item.quantity))) : null,
    unit: String(item.unit || 'pcs').slice(0, 20),
    createdVia,
  };
}

const DEMO_SHELF_ITEMS = [
  { name: 'Parle-G Biscuit 250g', category: 'Snacks', priceINR: 30, quantity: 24, unit: 'pack' },
  { name: 'Tata Salt 1kg', category: 'Staples', priceINR: 28, quantity: 12, unit: 'pack' },
  { name: 'Maggi Noodles 70g', category: 'Snacks', priceINR: 14, quantity: 40, unit: 'pack' },
  { name: 'Lifebuoy Soap 100g', category: 'Personal Care', priceINR: 32, quantity: 18, unit: 'bar' },
  { name: 'Frooti Mango 160ml', category: 'Beverages', priceINR: 10, quantity: 30, unit: 'pack' },
];

/**
 * Parses a shelf/register photo into SKU drafts via Claude vision.
 * Without an ANTHROPIC_API_KEY, returns a clearly-labeled canned demo parse so
 * the onboarding flow stays demoable.
 */
export async function parseStockPhoto(imageBuffer, mimeType) {
  // Photo parsing needs a vision model — Claude only (Sarvam is text-only)
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY not set — returning demo photo parse');
    return {
      source: 'demo-fallback',
      note: 'Photo parsing needs an ANTHROPIC_API_KEY (vision model) — these are sample items, not parsed from your photo.',
      items: DEMO_SHELF_ITEMS.map((i) => toSkuDraft(i, 'photo')),
    };
  }

  const client = new Anthropic();
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4096,
    // Server-side refusal fallback, recommended default for Opus 5
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: imageBuffer.toString('base64'),
            },
          },
          { type: 'text', text: 'Extract the SKUs from this photo.' },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') {
    throw new Error('The vision model declined to process this image. Try a clearer product photo.');
  }

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const items = extractJsonArray(text);
  logger.info({ count: items.length, model: response.model }, 'Photo parsed into SKU drafts');
  return {
    source: 'claude-vision',
    note: null,
    items: items.map((i) => toSkuDraft(i, 'photo')),
  };
}

const STRUCTURE_SYSTEM_PROMPT = `You convert an Indian merchant's spoken stock description (may mix Hindi/English/regional languages, and may contain speech-recognition errors) into JSON.
Example input: "Aaj 20 packet Parle-G aaye 30 rupaye wale, aur 12 bottle Thums Up 45 ka"
Rules:
- Respond with ONLY a JSON array, no prose, no markdown fences.
- Each element: {"name": string, "category": string, "priceINR": number|null, "quantity": number|null, "unit": string}
- Product names are often misheard (e.g. "parlay g" = Parle-G, "tums up" = Thums Up, "magi" = Maggi) — correct them to the closest common Indian brand/product name.
- Translate product names to their common English brand form.
- Be generous: if something plausibly names a product, include it (the merchant reviews before saving).
- If nothing product-like is mentioned at all, return [].`;

/** Structures a voice transcript into SKU drafts via the configured LLM (Sarvam or Claude). */
export async function structureTranscript(transcript) {
  if (!hasLlm()) {
    logger.warn('No LLM API key set — returning demo transcript parse');
    return {
      source: 'demo-fallback',
      note: 'No AI API key configured — these are sample items, not parsed from your voice note.',
      items: [
        { name: 'Parle-G Biscuit 250g', category: 'Snacks', priceINR: 30, quantity: 20, unit: 'pack' },
        { name: 'Thums Up 750ml', category: 'Beverages', priceINR: 45, quantity: 12, unit: 'bottle' },
      ].map((i) => toSkuDraft(i, 'voice')),
    };
  }

  let items = [];
  let note = null;
  try {
    const text = await complete({
      system: STRUCTURE_SYSTEM_PROMPT,
      user: transcript,
      maxTokens: 2048,
    });
    items = extractJsonArray(text);
  } catch (err) {
    logger.warn({ err: err.message, transcript }, 'Transcript structuring produced no items');
    note = 'I could not identify products in that recording.';
  }
  if (!items.length && !note) {
    note = 'No products were mentioned clearly enough to catch.';
  }
  return {
    source: 'llm',
    note,
    items: items.map((i) => toSkuDraft(i, 'voice')),
  };
}
