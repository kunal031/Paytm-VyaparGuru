import { hasLlm, complete } from './llm.js';
import { INTENT_SYSTEM_PROMPT } from '../prompts/prompts.js';

export const INTENTS = [
  'sales_trend',
  'top_products',
  'worst_products',
  'sales_drop_diagnosis',
  'stockout_history',
  'discount_impact',
  'forecast',
  'general',
];

// Latin + Devanagari + Telugu keywords so the no-LLM fallback still routes
// common Hindi/Telugu phrasings correctly.
const KEYWORD_RULES = [
  { intent: 'worst_products', patterns: [/worst|lowest|least sold|slowest|not selling|isn'?t selling|nahi bik|kam bik|bottom/i, /नहीं बिक|सबसे कम बिक/, /అమ్మని|తక్కువ అమ్మ/] },
  { intent: 'sales_drop_diagnosis', patterns: [/why.*(drop|fall|fell|down|kam|slow)/i, /(drop|fell|down|decrease|gir)/i, /कम|घट|गिर/, /తగ్గ/] },
  { intent: 'top_products', patterns: [/top|best.?sell|sabse (jyada|zyada)|most sold|highest earning|which product/i, /सबसे (ज्यादा|अच्छ)/, /ఎక్కువగా అమ్మ/] },
  { intent: 'stockout_history', patterns: [/stock ?out|out of stock|khatam|ran out|stock gaya/i, /ख़त्म|खत्म|स्टॉक/, /అయిపోయ|స్టాక్/] },
  { intent: 'discount_impact', patterns: [/discount|offer|deal|sale price|chhoot/i, /छूट|ऑफर/, /తగ్గింపు|ఆఫర్/] },
  { intent: 'forecast', patterns: [/forecast|next (week|month)|future|aage|upcoming|festival|diwali|predict/i, /अगले|आगे|त्योहार|दिवाली/, /వచ్చే|భవిష్యత్|పండుగ/] },
  { intent: 'sales_trend', patterns: [/sale|revenue|business|kamai|earning|this week|last week|month|trend|growth|compare/i, /बिक्री|कमाई|धंधा|व्यापार/, /అమ్మకా|వ్యాపారం|ఆదాయం/] },
];

function classifyByRules(question) {
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((p) => p.test(question))) return rule.intent;
  }
  return 'general';
}

/** Node: classify the merchant's question into an intent. */
export async function classifyIntent(state) {
  const question = state.questionEnglish || state.question;

  if (hasLlm()) {
    try {
      const raw = (await complete({
        system: INTENT_SYSTEM_PROMPT,
        user: question,
        maxTokens: 16,
      })).toLowerCase().trim();
      if (INTENTS.includes(raw)) {
        return { intent: raw, intentSource: 'claude' };
      }
    } catch {
      // fall through to rules
    }
  }
  return { intent: classifyByRules(question), intentSource: 'rules' };
}
