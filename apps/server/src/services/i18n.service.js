import crypto from 'crypto';
import { hasLlm, complete } from '@vyaparguru/agent/llm';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
];

const LANG_BY_CODE = new Map(SUPPORTED_LANGUAGES.map((l) => [l.code, l]));

// lang:catalogHash → translated dict (translate once per catalog version)
const cache = new Map();

/**
 * Translates the client's UI string catalog into the requested language via
 * the configured LLM. The keys are stable identifiers; only values translate.
 */
export async function translateCatalog(lang, strings) {
  const language = LANG_BY_CODE.get(lang);
  if (!language) throw ApiError.badRequest(`Unsupported language: ${lang}`);
  if (lang === 'en') return { lang, strings, source: 'base' };
  if (!hasLlm()) {
    return {
      lang,
      strings,
      source: 'fallback-english',
      note: 'Translation needs an AI API key configured — showing English.',
    };
  }

  const hash = crypto.createHash('sha1').update(JSON.stringify(strings)).digest('hex').slice(0, 12);
  const cacheKey = `${lang}:${hash}`;
  if (cache.has(cacheKey)) return { lang, strings: cache.get(cacheKey), source: 'cache' };

  const system = `You translate app UI strings into ${language.name} for Indian small-business owners.
You receive a JSON object; translate ONLY the values into natural, simple ${language.name} (native script) that a shopkeeper would understand. Keep the keys EXACTLY as they are. Keep emoji, the app name VyaparGuru, ₹ symbols and numbers unchanged.
Respond with ONLY the JSON object — no prose, no markdown fences.`;

  // Chunk the catalog so each response fits comfortably in the model's
  // output budget (reasoning + JSON must fit in 4096 tokens)
  const entries = Object.entries(strings);
  const chunks = [];
  for (let i = 0; i < entries.length; i += 20) {
    chunks.push(Object.fromEntries(entries.slice(i, i + 20)));
  }

  const translated = {};
  for (const chunk of chunks) {
    const raw = await complete({ system, user: JSON.stringify(chunk), maxTokens: 2000 });
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('Translator returned no JSON');
    Object.assign(translated, JSON.parse(raw.slice(start, end + 1)));
  }

  // Any key the model dropped falls back to English
  const merged = { ...strings, ...translated };
  cache.set(cacheKey, merged);
  logger.info({ lang, keys: Object.keys(merged).length }, 'UI catalog translated');
  return { lang, strings: merged, source: 'llm' };
}
