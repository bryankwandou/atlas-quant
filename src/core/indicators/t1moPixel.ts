/**
 * ════════════════════════════════════════════════════════════════════════════
 *  T1MO PIXEL — CANONICAL SIGNAL ENGINE (the permanent, in-git source of truth)
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  This module computes the T1MO Pixel heatmap data — `PixelColumn[]` — from REAL
 *  market indicators. It deliberately depends on NO external/proprietary reference
 *  file: the ground truth of a quant signal is the MARKET (price & forward return),
 *  not a lost source. Everything here is documented, deterministic and testable, so
 *  it survives in version control and can be validated by backtest.
 *
 *  Each candle column renders 3 stacked blocks (see PixelHeatmap renderer):
 *    • BASE   — square on the equator
 *    • CENTER — square stacked up (bullish) or down (bearish)
 *    • OUTER  — dynamic block, height ∝ `strength`, same direction
 *  Colour comes from `score` (0..100 bull probability) via a smooth colormap.
 *
 *  Methodology (transparent, weighted composite — replace with a trained logistic /
 *  ML model later for a fully "AI" signal; the interface stays identical):
 *    score = clamp( 50 + ( blend - 50 ) * GAIN )
 *    blend = ( T1MO_bullProb*3 + oscMean ) / 4        ← T1MO is the PRIMARY driver
 *    oscMean = mean(RSI7, RSI14, MFI, %R→0..100, MACD-hist→sig, EMA21-dist→sig)
 *  then EMA(SMOOTH) so the regime transitions gradually (passes through neutral).
 */

export type PixelBucket = 'strongBuy' | 'buy' | 'neutral' | 'sell' | 'strongSell';

export interface PixelColumn {
  /** 0..100 composite bull score — drives the colour (smooth colormap). */
  score: number;
  /** discrete 5-level classification (for labels / legend / backtest buckets). */
  bucket: PixelBucket;
  /** 0..1 conviction — drives the dynamic OUTER block height. */
  strength: number;
  /** direction — blocks grow UP when true (bullish), DOWN when false. */
  isUp: boolean;
}

/** Minimal shape of the indicator engine (result of `computeIndicators`). */
export interface IndicatorEngine {
  rsi: (p: number) => number[];
  mfi: (p: number) => number[];
  williamsR: (p: number) => number[];
  macd: (a: number, b: number, c: number) => { histogram: number[] };
  ema: (p: number) => number[];
  atr: (p: number) => number[];
}

export interface T1moPixelConfig {
  /** contrast gain on the deviation from 50 (higher = more vivid, less yellow). */
  gain: number;
  /** EMA smoothing period (higher = smoother transitions, more yellow). */
  smooth: number;
}

export const T1MO_PIXEL_DEFAULTS: T1moPixelConfig = { gain: 1.4, smooth: 7 };

const num = (arr: ArrayLike<number> | undefined, i: number, d = 0) =>
  arr && Number.isFinite(arr[i]) ? (arr[i] as number) : d;

/** unbounded value → 0..100 via a soft tanh squash (50 = neutral). */
const sig = (x: number) => 50 + 50 * Math.tanh(x);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Map a 0..100 score to the discrete 5-level bucket. */
export function scoreToBucket(s: number): PixelBucket {
  if (s >= 72) return 'strongBuy';
  if (s >= 57) return 'buy';
  if (s > 43)  return 'neutral';
  if (s > 28)  return 'sell';
  return 'strongSell';
}

/**
 * Compute the canonical 0..100 composite bull score per bar from REAL indicators.
 * `bullProb` (the T1MO regime probability, 0..100) is the PRIMARY driver when present.
 */
export function computeT1moScores(
  ind: IndicatorEngine,
  closes: number[],
  bullProb: number[] = [],
  cfg: T1moPixelConfig = T1MO_PIXEL_DEFAULTS,
): number[] {
  const n = closes.length;
  if (n === 0) return [];

  const rsi7  = ind.rsi(7);
  const rsi14 = ind.rsi(14);
  const mfi   = ind.mfi(14);
  const wr    = ind.williamsR(14);
  const macd  = ind.macd(12, 26, 9);
  const ema21 = ind.ema(21);
  const atr   = ind.atr(14);
  const a = (i: number) => num(atr, i, 0) || (closes[i] * 0.01) || 1;

  // Weighted composite, T1MO bullProb primary (3×), oscillators confirm.
  const raw = closes.map((c, i) => {
    const oscMean = (
      num(rsi7, i, 50) +
      num(rsi14, i, 50) +
      num(mfi, i, 50) +
      clamp(100 + num(wr, i, -50), 2, 98) +
      sig(num(macd.histogram, i, 0) / a(i) * 1.5) +
      sig((c - num(ema21, i, c)) / a(i) * 0.8)
    ) / 6;
    const t1 = num(bullProb, i, oscMean);
    const blend = (t1 * 3 + oscMean) / 4;
    return clamp(50 + (blend - 50) * cfg.gain, 2, 98);
  });

  // EMA smoothing → gradual regime transitions (score passes through the neutral band).
  const out = new Array<number>(n);
  const k = 2 / (cfg.smooth + 1);
  let prev = Number.isFinite(raw[0]) ? raw[0] : 50;
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(raw[i])) prev = raw[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Derive a full PixelColumn (bucket / strength / isUp) from a 0..100 score. */
export function scoreToPixelColumn(score: number): PixelColumn {
  return {
    score,
    bucket: scoreToBucket(score),
    isUp: score >= 50,
    strength: clamp(Math.abs(score - 50) / 50, 0, 1),
  };
}

/** Full pipeline: real indicators → PixelColumn[] (one per candle). */
export function computeT1moPixel(
  ind: IndicatorEngine,
  closes: number[],
  bullProb: number[] = [],
  cfg: T1moPixelConfig = T1MO_PIXEL_DEFAULTS,
): PixelColumn[] {
  return computeT1moScores(ind, closes, bullProb, cfg).map(scoreToPixelColumn);
}
