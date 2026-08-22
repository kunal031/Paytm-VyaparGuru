/**
 * LangGraph Sales & Growth Copilot.
 *
 * Pipeline: classify_intent → retrieve_data → analyze → synthesize
 * ("general" pure greetings skip retrieval.)
 *
 * Latency design: keyword rules classify instantly in any supported language
 * (the LLM is only consulted when rules can't decide), and the synthesizer
 * answers directly in the merchant's language — so a typical question costs
 * ONE LLM call, not 2–4. Per-stage timings are returned in meta.timings.
 *
 * The agent never fabricates numbers: retrieval and analysis are pure code over
 * the Node backend's authenticated REST API, and the synthesizer narrates only
 * that payload. Without an LLM key the whole graph still runs — rule-based
 * intents + template answers, English only.
 */
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { classifyIntent } from './nodes/intent_classifier.js';
import { retrieveData } from './nodes/data_retriever.js';
import { analyze } from './nodes/analyzer.js';
import { synthesizeResponse } from './nodes/response_synthesizer.js';

const CopilotState = Annotation.Root({
  question: Annotation(),
  language: Annotation(),
  ctx: Annotation(), // { apiBaseUrl, authToken }
  intent: Annotation(),
  intentSource: Annotation(),
  retrieved: Annotation(),
  toolCalls: Annotation(),
  analysis: Annotation(),
  answer: Annotation(),
  answerSource: Annotation(),
  timings: Annotation({
    reducer: (a, b) => ({ ...(a || {}), ...(b || {}) }),
    default: () => ({}),
  }),
});

/** Wraps a node so its wall-clock duration lands in state.timings. */
const timed = (name, fn) => async (state) => {
  const start = Date.now();
  const update = await fn(state);
  return { ...update, timings: { [name]: Date.now() - start } };
};

const GREETING_RE = /^\s*(hi|hii+|hello|hey|namaste|namaskar|good (morning|evening|afternoon))[\s!.]*$/i;

function routeAfterIntent(state) {
  // Only pure greetings skip retrieval; every other "general" question still
  // gets a data snapshot so the answer is grounded in real numbers.
  return state.intent === 'general' && GREETING_RE.test(state.question || '')
    ? 'synthesize'
    : 'retrieve';
}

let _compiled = null;

export function buildGraph() {
  if (_compiled) return _compiled;
  _compiled = new StateGraph(CopilotState)
    .addNode('classify', timed('classify', classifyIntent))
    .addNode('retrieve', timed('retrieve', retrieveData))
    .addNode('analyze', timed('analyze', analyze))
    .addNode('synthesize', timed('synthesize', synthesizeResponse))
    .addEdge(START, 'classify')
    .addConditionalEdges('classify', routeAfterIntent, {
      retrieve: 'retrieve',
      synthesize: 'synthesize',
    })
    .addEdge('retrieve', 'analyze')
    .addEdge('analyze', 'synthesize')
    .addEdge('synthesize', END)
    .compile();
  return _compiled;
}

/**
 * Runs the copilot end-to-end.
 * @param {{question: string, language?: 'en'|'hi'|'te', apiBaseUrl: string, authToken: string}} input
 */
export async function runCopilot({ question, language = 'en', apiBaseUrl, authToken }) {
  const graph = buildGraph();
  const start = Date.now();
  const result = await graph.invoke({
    question,
    language,
    ctx: { apiBaseUrl, authToken },
  });
  return {
    answer: result.answer,
    intent: result.intent,
    meta: {
      intentSource: result.intentSource,
      answerSource: result.answerSource,
      translated: language !== 'en' && result.answerSource === 'llm',
      toolCalls: result.toolCalls || [],
      timings: { ...result.timings, total: Date.now() - start },
    },
  };
}
