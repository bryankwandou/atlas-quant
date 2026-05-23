/**
 * Atlas Quant · Local Natural Language Generation
 * --------------------------------------------------------------------
 * Generates analyst commentary deterministically from the KB matches +
 * the live numbers. NO API. NO external model download. NO API key.
 *
 *  - Picks the best-matching KB entry (and 1-2 secondary entries).
 *  - Renders one of its variants by template-filling with the live data.
 *  - Adds 3-5 bullet drivers from the merged KB + factor notes.
 *  - Picks one short risk note.
 *  - Seeded variation by symbol+date so the same conditions get a
 *    repeatable but non-trivially-varied phrasing.
 */

import type { FeatureVector } from '../featureExtractor';
import { retrieveTopK, type RetrievalContext, type ScoredEntry } from './retrieval';
import { kbCount } from './knowledgeBase';

export interface NLGInput {
  symbol: string;
  timeframe: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  price: number;
  features: FeatureVector;
  factors: string[];
  layerScores: Record<string, number>;
  macroRiskScore?: number;
  vix?: number;
  fearGreedValue?: number;
  politicalRiskIndex?: number;
  ensembleVotes?: Array<{ name: string; signal: string; confidence: number }>;
  mlProbability?: number;
  kelly?: number;
  tp1?: number; tp2?: number; tp3?: number; sl?: number; rrRatio?: number;
}

export interface NLGResult {
  source: 'atlas-local-llm';
  model: string;            // "atlas-local-llm:v1"
  commentary: string;       // full paragraph(s)
  bullets: string[];
  riskNote: string;
  matchedScenarios: Array<{ id: string; title: string; score: number; hits: string[] }>;
  modelDetails: {
    knowledgeBaseSize: number;
    primaryConfidence: number;
    factorOverrides: string[];
  };
}

/** Deterministic pseudo-random in [0, 1) from a string. */
function seedFloat(seed: string, salt = 0): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h += salt;
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

function pickVariant<T>(arr: T[], seed: string, salt = 0): T {
  if (arr.length === 0) throw new Error('empty variants');
  const f = seedFloat(seed, salt);
  return arr[Math.floor(f * arr.length)];
}

function fmtPrice(p: number | undefined): string {
  if (p === undefined || !Number.isFinite(p)) return '—';
  if (p >= 1000)   return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1)      return p.toFixed(2);
  if (p >= 0.01)   return p.toFixed(4);
  return p.toFixed(6);
}

function fmtPct(p: number | undefined, digits = 2): string {
  if (p === undefined || !Number.isFinite(p)) return '—';
  return `${(p * 100).toFixed(digits)}%`;
}

function render(template: string, input: NLGInput, primary: ScoredEntry): string {
  return template
    .replace(/\{symbol\}/g, input.symbol)
    .replace(/\{tf\}/g, input.timeframe)
    .replace(/\{price\}/g, fmtPrice(input.price))
    .replace(/\{signal\}/g, input.signal)
    .replace(/\{confidence\}/g, String(input.confidence))
    .replace(/\{bars\}/g, '5');
}

export function generateLocalCommentary(input: NLGInput): NLGResult {
  const ctx: RetrievalContext = {
    features: input.features,
    signal: input.signal,
    macroRiskScore: input.macroRiskScore,
    vix: input.vix,
    fearGreedValue: input.fearGreedValue,
    politicalRiskIndex: input.politicalRiskIndex,
  };
  const top = retrieveTopK(ctx, 5);
  const primary = top[0];
  const secondary = top.slice(1, 3);

  const seedBase = `${input.symbol}|${input.timeframe}|${primary?.entry.id ?? 'none'}`;

  // ── Compose paragraphs ────────────────────────────────────────────────
  const paragraphs: string[] = [];

  if (primary) {
    paragraphs.push(render(pickVariant(primary.entry.variants, seedBase, 0), input, primary));
  } else {
    paragraphs.push(`${input.symbol} ${input.timeframe} shows no clear textbook setup. The engine reverts to the ensemble vote.`);
  }

  // Layer attribution paragraph — quantitative description of where the score came from
  const sortedLayers = Object.entries(input.layerScores)
    .filter(([k]) => k !== 'ml' || input.mlProbability !== undefined)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 4);
  const layerDesc = sortedLayers.map(([k, v]) => `${k} ${v >= 0 ? '+' : ''}${v.toFixed(1)}`).join(' · ');
  const dirWord = input.signal === 'BUY' ? 'bullish' : input.signal === 'SELL' ? 'bearish' : 'neutral';
  const mlDesc = input.mlProbability !== undefined
    ? ` Local ML model assigns P(up)=${input.mlProbability.toFixed(2)} over the next 5 bars.`
    : '';
  paragraphs.push(
    `Composite confidence is ${input.confidence} with a ${dirWord} tilt. Layer attribution: ${layerDesc}.${mlDesc}`,
  );

  // Secondary scenario paragraph (if meaningful match)
  if (secondary.length > 0 && secondary[0].score > 0.4) {
    const sec = secondary[0];
    paragraphs.push(
      `Secondary read: ${render(pickVariant(sec.entry.variants, seedBase, 1), input, sec)}`,
    );
  }

  // TP/SL paragraph
  if (input.signal !== 'NEUTRAL' && input.tp1 && input.sl) {
    const rr = input.rrRatio ?? 1.5;
    const kellyDesc = typeof input.kelly === 'number' ? ` Kelly position size ≈ ${fmtPct(input.kelly, 1)} of equity.` : '';
    paragraphs.push(
      `Plan: entry near ${fmtPrice(input.price)}, stop ${fmtPrice(input.sl)}, ` +
      `TP ladder ${fmtPrice(input.tp1)} / ${fmtPrice(input.tp2)} / ${fmtPrice(input.tp3)} at ${rr}:1 RR.${kellyDesc}`,
    );
  }

  // ── Bullets ───────────────────────────────────────────────────────────
  const bulletPool: string[] = [];
  if (primary) bulletPool.push(...primary.entry.bullets);
  for (const s of secondary) bulletPool.push(...s.entry.bullets);
  // Add a few factor notes verbatim
  for (const f of input.factors.slice(0, 4)) bulletPool.push(f);
  // Add ML driver if available
  if (input.mlProbability !== undefined) {
    bulletPool.push(`Local logistic model P(up)=${input.mlProbability.toFixed(3)}`);
  }
  // De-dup and shuffle deterministically
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const b of bulletPool) {
    const key = b.toLowerCase().replace(/\s+/g, ' ').trim();
    if (key.length < 4) continue;
    if (!seen.has(key)) { seen.add(key); dedup.push(b); }
  }
  // Deterministic selection of up to 5 bullets
  const bullets = dedup.slice(0, 5);

  // ── Risk note ─────────────────────────────────────────────────────────
  let riskNote = primary
    ? pickVariant(primary.entry.risk, seedBase, 2)
    : 'Respect 1×ATR stop; size by Kelly fraction.';
  if (input.politicalRiskIndex && input.politicalRiskIndex > 70) {
    riskNote = `Political-risk index ${input.politicalRiskIndex}. ${riskNote}`;
  }

  // ── Factor overrides (notes that nudged the engine away from raw technical) ─
  const factorOverrides = input.factors.filter((f) => /macro|F&G|VIX|political|funding|gas|stable|GDELT/i.test(f));

  return {
    source: 'atlas-local-llm',
    model: 'atlas-local-llm:v1',
    commentary: paragraphs.join('\n\n'),
    bullets,
    riskNote,
    matchedScenarios: top.slice(0, 3).map((s) => ({ id: s.entry.id, title: s.entry.title, score: parseFloat(s.score.toFixed(3)), hits: s.hits })),
    modelDetails: {
      knowledgeBaseSize: kbCount(),
      primaryConfidence: parseFloat((primary?.score ?? 0).toFixed(3)),
      factorOverrides,
    },
  };
}
