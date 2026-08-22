import { runCopilot } from '@vyaparguru/agent';
import { env } from '../config/env.js';

/**
 * Invokes the LangGraph Sales & Growth Copilot. The agent calls back into this
 * server's own REST API as tools, authenticated with the merchant's JWT — so
 * it can only ever see (and narrate) that merchant's data.
 */
export async function askCopilot({ question, language, authToken }) {
  return runCopilot({
    question,
    language,
    apiBaseUrl: `http://localhost:${env.port}/api/v1`,
    authToken,
  });
}
