/**
 * Shared Claude access for agent nodes, with a hasLlm() gate so every node can
 * degrade to its rule-based fallback when no ANTHROPIC_API_KEY is configured.
 */
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-opus-5';

export const hasLlm = () => Boolean(process.env.ANTHROPIC_API_KEY);

let _client = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

/** Single-turn text completion with server-side refusal fallback. */
export async function complete({ system, user, maxTokens = 1024 }) {
  const response = await client().beta.messages.create({
    model: MODEL,
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
