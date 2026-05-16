/**
 * Atlas Quant · AI Commentary
 * --------------------------------------------------------------------
 * The DEFAULT path is the fully local "atlas-local-llm" — a deterministic
 * retrieval-augmented NLG engine that runs entirely inside this Next.js
 * runtime. NO API key. NO external model download. NO outbound request.
 *
 * If the caller explicitly opts in via `{ allowRemote: true }` AND the
 * server has OPENROUTER_API_KEY set, we *also* call OpenRouter (DeepSeek /
 * Llama / Qwen open-source models) and merge the response. Otherwise the
 * local engine is the source of truth.
 */

import { generateLocalCommentary, type NLGInput, type NLGResult } from './local/nlg';
import { extractFeatures } from './featureExtractor';
import type { OHLCVBar } from './featureExtractor';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface AICommentaryInput {
  symbol: string;
  timeframe: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  price: number;
  factors: string[];
  layerScores: Record<string, number>;
  ensembleVotes?: Array<{ name: string; signal: string; confidence: number }>;
  /** Candle history — required for the local LLM (feature extraction). */
  candles?: OHLCVBar[];
  /** Optional macro / sentiment context for richer retrieval. */
  macroRiskScore?: number;
  vix?: number;
  fearGreedValue?: number;
  politicalRiskIndex?: number;
  mlProbability?: number;
  kelly?: number;
  tp1?: number; tp2?: number; tp3?: number; sl?: number; rrRatio?: number;
}

export interface AICommentaryResult {
  model: string;
  source: 'atlas-local-llm' | 'openrouter+local' | 'local-only';
  commentary: string;
  bullets: string[];
  riskNote: string;
  /** Scenarios the local retriever matched against. */
  matchedScenarios?: NLGResult['matchedScenarios'];
  /** Local model metadata. */
  modelDetails?: NLGResult['modelDetails'];
  /** Remote response when OpenRouter was used. */
  remote?: { model: string; commentary: string };
  raw?: any;
}

const SYSTEM = `You are Atlas Quant's quantitative analyst. You speak in
numbers, not adjectives. You never invent facts; you only refine the
local engine's analysis with concise, professional prose. Max 3 short
paragraphs, then 3-5 bullets, then a one-line risk note.`;

/**
 * The main entry point. Runs the local LLM and (optionally) layers
 * OpenRouter on top.
 *
 * Default: `allowRemote: false` → local-only, zero external calls.
 */
export async function getAICommentary(
  input: AICommentaryInput,
  options: { allowRemote?: boolean; modelHint?: string } = {},
): Promise<AICommentaryResult> {
  const { allowRemote = false, modelHint } = options;

  // ── Local LLM (always runs, never fails) ─────────────────────────────
  const localFeatures = input.candles ? extractFeatures(input.candles) : null;
  let local: NLGResult;
  if (localFeatures) {
    const nlgInput: NLGInput = {
      symbol: input.symbol,
      timeframe: input.timeframe,
      signal: input.signal,
      confidence: input.confidence,
      price: input.price,
      features: localFeatures,
      factors: input.factors,
      layerScores: input.layerScores,
      macroRiskScore: input.macroRiskScore,
      vix: input.vix,
      fearGreedValue: input.fearGreedValue,
      politicalRiskIndex: input.politicalRiskIndex,
      ensembleVotes: input.ensembleVotes,
      mlProbability: input.mlProbability,
      kelly: input.kelly,
      tp1: input.tp1, tp2: input.tp2, tp3: input.tp3, sl: input.sl, rrRatio: input.rrRatio,
    };
    local = generateLocalCommentary(nlgInput);
  } else {
    // Without candles we can still produce a basic synthesis from layerScores
    local = {
      source: 'atlas-local-llm',
      model: 'atlas-local-llm:v1',
      commentary: `${input.symbol} ${input.timeframe} engine output: ${input.signal} at ${input.confidence}% confidence.`,
      bullets: input.factors.slice(0, 5),
      riskNote: 'Respect 1×ATR stop; size by Kelly fraction.',
      matchedScenarios: [],
      modelDetails: { knowledgeBaseSize: 0, primaryConfidence: 0, factorOverrides: [] },
    };
  }

  // ── Optional remote enhancement ──────────────────────────────────────
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!allowRemote || !apiKey) {
    return {
      model: local.model,
      source: 'atlas-local-llm',
      commentary: local.commentary,
      bullets: local.bullets,
      riskNote: local.riskNote,
      matchedScenarios: local.matchedScenarios,
      modelDetails: local.modelDetails,
    };
  }

  const model = modelHint ?? process.env.OPENROUTER_MODEL ?? 'deepseek/deepseek-chat';
  const userPrompt =
    `Symbol: ${input.symbol} · TF: ${input.timeframe}\n` +
    `Engine signal: ${input.signal} · confidence ${input.confidence}\n` +
    `Price: ${input.price}\n` +
    `Layer scores: ${JSON.stringify(input.layerScores)}\n` +
    `Matched scenarios:\n${(local.matchedScenarios ?? []).map((m) => `  - ${m.title} (${m.score})`).join('\n')}\n` +
    `Factor notes:\n${input.factors.map((f) => '  - ' + f).join('\n')}\n` +
    `Local NLG draft:\n${local.commentary}\n\n` +
    `Refine the above commentary in 2-3 paragraphs, then 3-5 bullets, then a 1-line risk note. Stay grounded in the local numbers.`;

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_REFERER ?? 'https://atlas-quant.vercel.app',
        'X-Title': 'Atlas Quant',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 600,
      }),
    });
    if (!res.ok) {
      return {
        model: local.model,
        source: 'atlas-local-llm',
        commentary: local.commentary,
        bullets: local.bullets,
        riskNote: local.riskNote,
        matchedScenarios: local.matchedScenarios,
        modelDetails: local.modelDetails,
      };
    }
    const data = await res.json();
    const remoteText = (data?.choices?.[0]?.message?.content ?? '').trim();
    if (!remoteText) {
      return {
        model: local.model,
        source: 'atlas-local-llm',
        commentary: local.commentary,
        bullets: local.bullets,
        riskNote: local.riskNote,
        matchedScenarios: local.matchedScenarios,
        modelDetails: local.modelDetails,
      };
    }
    return {
      model,
      source: 'openrouter+local',
      commentary: remoteText,
      bullets: local.bullets,
      riskNote: local.riskNote,
      matchedScenarios: local.matchedScenarios,
      modelDetails: local.modelDetails,
      remote: { model, commentary: remoteText },
      raw: data,
    };
  } catch {
    return {
      model: local.model,
      source: 'atlas-local-llm',
      commentary: local.commentary,
      bullets: local.bullets,
      riskNote: local.riskNote,
      matchedScenarios: local.matchedScenarios,
      modelDetails: local.modelDetails,
    };
  }
}
