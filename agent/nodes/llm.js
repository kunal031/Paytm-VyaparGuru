/**
 * Shared LLM access for agent nodes, with a provider chain:
 *   1. Sarvam AI (SARVAM_API_KEY) — sarvam-105b via OpenAI-compatible chat API;
 *      strong on Indian languages, used when configured.
 *   2. Anthropic (ANTHROPIC_API_KEY) — Claude Opus 5.
 * hasLlm() gates every node so they degrade to rule-based fallbacks when no
 * provider is configured.
 */
import axios from 'axios';

const SARVAM_URL = 'https://api.sarvam.ai/v1/chat/completions';
const SARVAM_MODEL = 'sarvam-105b';
const ANTHROPIC_MODEL = 'claude-opus-5';

export const hasLlm = () =>
  Boolean(process.env.SARVAM_API_KEY || process.env.ANTHROPIC_API_KEY);

async function sarvamComplete({ system, user, maxTokens }) {
  const { data } = await axios.post(
    SARVAM_URL,
    {
      model: SARVAM_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      // sarvam-105b spends ~500 tokens reasoning before the answer — pad the
      // budget so short answers (e.g. an intent id) never truncate
      max_tokens: Math.max(maxTokens + 1000, 1500),
      temperature: 0.2,
    },
    {
      headers: { Authorization: `Bearer ${process.env.SARVAM_API_KEY}` },
      timeout: 90_000,
    }
  );
  const content = data.choices?.[0]?.message?.content ?? '';
  // Strip any inline think tags defensively
  return content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

let _anthropic = null;
async function anthropicComplete({ system, user, maxTokens }) {
  if (!_anthropic) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    _anthropic = new Anthropic();
  }
  const response = await _anthropic.beta.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (response.stop_reason === 'refusal') {
    throw new Error('The model declined this request.');
  }
  return response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}

/** Single-turn text completion via the first configured provider. */
export async function complete({ system, user, maxTokens = 1024 }) {
  if (process.env.SARVAM_API_KEY) {
    return sarvamComplete({ system, user, maxTokens });
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropicComplete({ system, user, maxTokens });
  }
  throw new Error('No LLM provider configured');
}
