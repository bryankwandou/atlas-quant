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
 *    blend = ( T1MO_bullProb*t1Weight + oscMean ) / (t1Weight+1)   ← T1MO primary, osc adds texture
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

/** Per-bar multi-horizon scores — one 0..100 series per trend horizon.
 *  Renders 1:1 per candle: BASE=long, CENTER=medium, OUTER=short. */
export interface T1moHorizons {
  /** long trend (EMA50 distance + slope + regime prob), heavily smoothed. */
  long: number[];
  /** medium trend (RSI14/MFI/MACD/EMA21), moderately smoothed. */
  medium: number[];
  /** short trend (RSI7/%R/3-bar momentum), lightly smoothed. */
  short: number[];
  /** weighted composite (long 45% / medium 35% / short 20%) — stack direction. */
  composite: number[];
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
  /** weight of the T1MO regime prob vs the oscillator mean in the blend.
   *  Lower = oscillators show through more → bar-to-bar colour variation
   *  (yellows/oranges inside a regime) like the v1 reference heatmap. */
  t1Weight: number;
}

// v1-parity tuning (2026-07-02): gain 1.4→1.0 + smooth 7→4 + t1Weight 3→1.5.
// The old values saturated whole trends into solid max-green/max-red slabs;
// these keep extremes vivid but let RSI/MFI/%R wiggle paint the amber gradient.
export const T1MO_PIXEL_DEFAULTS: T1moPixelConfig = { gain: 1.0, smooth: 4, t1Weight: 1.5 };

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

/** EMA-smooth a 0..100 series in place order (returns new array). */
function emaSmooth(raw: number[], period: number): number[] {
  const out = new Array<number>(raw.length);
  const k = 2 / (period + 1);
  let prev = Number.isFinite(raw[0]) ? raw[0] : 50;
  for (let i = 0; i < raw.length; i++) {
    if (Number.isFinite(raw[i])) prev = raw[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/**
 * MULTI-HORIZON ENGINE (v11, 2026-07-02) — the v1 pixel semantics, rebuilt better.
 * The original (lost) T1MO drew 3 blocks per candle = LONG / MEDIUM / SHORT trend,
 * locked 1:1 to each candlestick. This computes one independent 0..100 score per
 * horizon from REAL indicators, each ATR-normalized (asset/timeframe agnostic),
 * tanh-squashed (bounded, no outlier blowups) and EMA-smoothed at a period that
 * matches its horizon — so long changes slowly, short reacts fast.
 */
export function computeT1moHorizons(
  ind: IndicatorEngine,
  closes: number[],
  bullProb: number[] = [],
  cfg: T1moPixelConfig = T1MO_PIXEL_DEFAULTS,
): T1moHorizons {
  const n = closes.length;
  if (n === 0) return { long: [], medium: [], short: [], composite: [] };

  const rsi7  = ind.rsi(7);
  const rsi14 = ind.rsi(14);
  const mfi   = ind.mfi(14);
  const wr    = ind.williamsR(14);
  const macd  = ind.macd(12, 26, 9);
  const ema21 = ind.ema(21);
  const ema50 = ind.ema(50);
  const atr   = ind.atr(14);
  const a = (i: number) => num(atr, i, 0) || (closes[i] * 0.01) || 1;
  const g = (v: number) => clamp(50 + (v - 50) * cfg.gain, 2, 98);

  const rawShort = closes.map((c, i) => {
    const mom3 = i >= 3 ? (c - closes[i - 3]) / a(i) : 0;
    return g((
      num(rsi7, i, 50) +
      clamp(100 + num(wr, i, -50), 2, 98) +
      sig(mom3 * 0.9)
    ) / 3);
  });

  const rawMedium = closes.map((c, i) => g((
    num(rsi14, i, 50) +
    num(mfi, i, 50) +
    sig(num(macd.histogram, i, 0) / a(i) * 1.5) +
    sig((c - num(ema21, i, c)) / a(i) * 0.8)
  ) / 4));

  const rawLong = closes.map((c, i) => {
    const e50 = num(ema50, i, c);
    const slopeIdx = Math.max(0, i - 10);
    const slope = (e50 - num(ema50, slopeIdx, e50)) / a(i);
    const parts = [
      sig((c - e50) / a(i) * 0.5),
      sig(slope * 1.2),
    ];
    const bp = bullProb[i];
    if (Number.isFinite(bp)) parts.push(clamp(bp as number, 2, 98));
    return g(parts.reduce((s, v) => s + v, 0) / parts.length);
  });

  // Horizon-matched smoothing: long is slow & steady, short is reactive.
  const long   = emaSmooth(rawLong, cfg.smooth * 2);
  const medium = emaSmooth(rawMedium, cfg.smooth);
  const short  = emaSmooth(rawShort, Math.max(1, Math.round(cfg.smooth / 2)));
  const composite = long.map((l, i) => l * 0.45 + medium[i] * 0.35 + short[i] * 0.2);

  return { long, medium, short, composite };
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
    const blend = (t1 * cfg.t1Weight + oscMean) / (cfg.t1Weight + 1);
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
