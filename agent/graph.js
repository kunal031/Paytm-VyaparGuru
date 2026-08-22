/**
 * LangGraph Sales & Growth Copilot.
 *
 * Pipeline: translate_in → classify_intent → retrieve_data → analyze → synthesize → translate_out
 * ("general" intent skips straight from classification to synthesis.)
 *
 * The agent never fabricates numbers: retrieval and analysis are pure code over
 * the Node backend's authenticated REST API, and the synthesizer is instructed
 * (or templated) to narrate only that payload. Without ANTHROPIC_API_KEY the
 * whole graph still runs — rule-based intents + template answers, English only.
 */
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { classifyIntent } from './nodes/intent_classifier.js';
import { retrieveData } from './nodes/data_retriever.js';
import { analyze } from './nodes/analyzer.js';
import { synthesizeResponse } from './nodes/response_synthesizer.js';
import { hasLlm, complete } from './nodes/llm.js';
import { TRANSLATE_TO_ENGLISH_PROMPT, translateFromEnglishPrompt } from './prompts/prompts.js';

const LANGUAGE_NAMES = { en: 'English', hi: 'Hindi', te: 'Telugu' };

const CopilotState = Annotation.Root({
  question: Annotation(),
  questionEnglish: Annotation(),
  language: Annotation(),
  ctx: Annotation(), // { apiBaseUrl, authToken }
  intent: Annotation(),
  intentSource: Annotation(),
  retrieved: Annotation(),
  toolCalls: Annotation(),
  analysis: Annotation(),
  answer: Annotation(),
  answerSource: Annotation(),
  translated: Annotation(),
});

async function translateIn(state) {
  if (state.language === 'en' || !state.language || !hasLlm()) {
    return { questionEnglish: state.question };
  }
  try {
    const english = await complete({
      system: TRANSLATE_TO_ENGLISH_PROMPT,
      user: state.question,
      maxTokens: 300,
    });
    return { questionEnglish: english };
  } catch {
    return { questionEnglish: state.question };
  }
}

async function translateOut(state) {
  const language = LANGUAGE_NAMES[state.language];
  if (!language || state.language === 'en') {
    return { translated: false };
  }
  if (!hasLlm()) {
    return {
      translated: false,
      answer: `${state.answer}\n\n(${language} replies need an AI API key configured — answering in English for now.)`,
    };
  }
  try {
    const answer = await complete({
      system: translateFromEnglishPrompt(language),
      user: state.answer,
      maxTokens: 900,
    });
    return { answer, translated: true };
  } catch {
    return { translated: false };
  }
}

const GREETING_RE = /^\s*(hi|hii+|hello|hey|namaste|namaskar|good (morning|evening|afternoon))[\s!.]*$/i;

function routeAfterIntent(state) {
  // Only pure greetings skip retrieval; every other "general" question still
  // gets a data snapshot so the answer is grounded in real numbers.
  const question = state.questionEnglish || state.question || '';
  return state.intent === 'general' && GREETING_RE.test(question) ? 'synthesize' : 'retrieve';
}

let _compiled = null;

export function buildGraph() {
  if (_compiled) return _compiled;
  _compiled = new StateGraph(CopilotState)
    .addNode('translate_in', translateIn)
    .addNode('classify', classifyIntent)
    .addNode('retrieve', retrieveData)
    .addNode('analyze', analyze)
    .addNode('synthesize', synthesizeResponse)
    .addNode('translate_out', translateOut)
    .addEdge(START, 'translate_in')
    .addEdge('translate_in', 'classify')
    .addConditionalEdges('classify', routeAfterIntent, {
      retrieve: 'retrieve',
      synthesize: 'synthesize',
    })
    .addEdge('retrieve', 'analyze')
    .addEdge('analyze', 'synthesize')
    .addEdge('synthesize', 'translate_out')
    .addEdge('translate_out', END)
    .compile();
  return _compiled;
}

/**
 * Runs the copilot end-to-end.
 * @param {{question: string, language?: 'en'|'hi'|'te', apiBaseUrl: string, authToken: string}} input
 */
export async function runCopilot({ question, language = 'en', apiBaseUrl, authToken }) {
  const graph = buildGraph();
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
      translated: Boolean(result.translated),
      toolCalls: result.toolCalls || [],
    },
  };
}
