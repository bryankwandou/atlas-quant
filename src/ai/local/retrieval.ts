/**
 * Atlas Quant · Local retrieval engine
 * --------------------------------------------------------------------
 * Given a live FeatureVector + macro/sentiment context, find the most
 * relevant KBEntry / entries from the knowledge base. The "embedding"
 * here is just the FeatureVector itself — we compare via per-field
 * range matching, with smooth penalties for misses (no hard veto so the
 * engine always returns *some* match).
 */

import type { FeatureVector } from '../featureExtractor';
import { KNOWLEDGE_BASE, type KBEntry } from './knowledgeBase';

export interface RetrievalContext {
  features: FeatureVector;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  macroRiskScore?: number;
  vix?: number;
  fearGreedValue?: number;
  politicalRiskIndex?: number;
}

export interface ScoredEntry {
  entry: KBEntry;
  score: number;
  hits: string[];
  /** Which pattern fields matched / missed — for explainability. */
  details: Array<{ field: string; value: number; range: [number, number]; matched: boolean }>;
}

/** Score a single field-range match. Returns 0..1. */
function rangeScore(value: number, range: [number, number]): number {
  const [lo, hi] = range;
  if (value >= lo && value <= hi) return 1.0;
  const dist = value < lo ? lo - value : value - hi;
  // Gaussian-style decay — falls to ~0.6 at dist=1, ~0.14 at dist=2
  return Math.exp(-(dist * dist) / 1.8);
}

function getValue(ctx: RetrievalContext, field: string): number | undefined {
  // Macro fields
  if (field === 'macroRiskScore') return ctx.macroRiskScore;
  if (field === 'vix')            return ctx.vix;
  if (field === 'fearGreedValue') return ctx.fearGreedValue;
  if (field === 'politicalRiskIndex') return ctx.politicalRiskIndex;
  // Feature fields
  return (ctx.features as any)[field];
}

export function retrieveTopK(ctx: RetrievalContext, k = 5): ScoredEntry[] {
  const scored: ScoredEntry[] = [];

  for (const entry of KNOWLEDGE_BASE) {
    let total = 0;
    let max = 0;
    const details: ScoredEntry['details'] = [];
    const hits: string[] = [];

    for (const [field, range] of Object.entries(entry.pattern)) {
      if (field === 'signal') {
        // Hard preference (not veto) on signal direction
        max += 1.2;
        if ((range as 'BUY' | 'SELL' | 'NEUTRAL') === ctx.signal) {
          total += 1.2;
          hits.push(`signal=${ctx.signal}`);
        }
        continue;
      }
      const v = getValue(ctx, field);
      if (v === undefined) continue;
      const r = range as [number, number];
      const s = rangeScore(v, r);
      total += s;
      max += 1;
      const matched = v >= r[0] && v <= r[1];
      details.push({ field, value: v, range: r, matched });
      if (matched) hits.push(`${field}∈[${r[0]},${r[1]}]`);
    }

    const score = max > 0 ? total / max : 0;
    scored.push({ entry, score, hits, details });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
