/**
 * RENAISSANCE-INSPIRED FACTORS — bukan replikasi Medallion (yang tertutup),
 * tapi keluarga indikator stat-arb yang biasa dipakai:
 *   - Mean reversion (Z-score, Hurst, Half-life)
 *   - Cross-section momentum (relative strength, factor neutralization)
 *   - Volatility cone & regime switching
 *   - Statistical anomaly detector (Kalman-ish residual)
 *
 * Ditambah blend dengan alt-data factors melalui `alt_data` input
 * (cuaca, sentimen, calendar) untuk meningkatkan edge.
 */
import type { IndicatorContext, IndicatorComputeResult, IndicatorDef } from '@/domain/indicator';
import { mean, std, pearson, ema as emaArr } from './math';

// =============================================================
// Z-SCORE MEAN REVERSION
// =============================================================
export const zScoreDef: IndicatorDef = {
  code: 'ZSCORE',
  name: 'Rolling Z-Score',
  category: 'mean_reversion',
  description: 'Standardized price deviation from rolling mean; |z| > 2 = stretched.',
  inputs: [
    { key: 'source', label: 'Source', type: 'source', default: 'close' },
    { key: 'period', label: 'Length', type: 'int', default: 50, min: 5 },
    { key: 'threshold', label: 'Threshold', type: 'float', default: 2, min: 0.5, step: 0.1 },
  ],
  outputs: [{ key: 'z', label: 'Z-Score', plot: 'line', paneId: 'sub' }],
};
export const zScoreCompute = (
  ctx: IndicatorContext,
  p: { period?: number; threshold?: number }
): IndicatorComputeResult => {
  const period = p.period ?? 50;
  const out: (number | null)[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    const slice = ctx.close.slice(i - period + 1, i + 1);
    const m = mean(slice), s = std(slice);
    out.push(s === 0 ? 0 : (ctx.close[i] - m) / s);
  }
  return {
    series: { z: out },
    levels: [
      { key: 'top', value: p.threshold ?? 2, color: '#ef4444' },
      { key: 'bot', value: -(p.threshold ?? 2), color: '#10b981' },
    ],
  };
};

// =============================================================
// HALF-LIFE OF MEAN REVERSION (Ornstein-Uhlenbeck OLS estimate)
// =============================================================
export const halfLifeDef: IndicatorDef = {
  code: 'HALFLIFE',
  name: 'Mean Reversion Half-Life',
  category: 'mean_reversion',
  inputs: [{ key: 'period', label: 'Length', type: 'int', default: 100, min: 30 }],
  outputs: [{ key: 'hl', label: 'Half-Life (bars)', plot: 'line', paneId: 'sub' }],
};
export const halfLifeCompute = (ctx: IndicatorContext, p: { period?: number }): IndicatorComputeResult => {
  const period = p.period ?? 100;
  const out: (number | null)[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    const slice = ctx.close.slice(i - period + 1, i + 1);
    const diffs = slice.slice(1).map((c, j) => c - slice[j]);
    const lag = slice.slice(0, -1);
    const lagMean = mean(lag);
    const num = diffs.reduce((s, d, j) => s + d * (lag[j] - lagMean), 0);
    const den = lag.reduce((s, v) => s + (v - lagMean) ** 2, 0);
    if (den === 0) { out.push(null); continue; }
    const beta = num / den; // OU mean reversion speed
    out.push(beta < 0 ? -Math.log(2) / beta : null);
  }
  return { series: { hl: out } };
};

// =============================================================
// HURST EXPONENT (R/S analysis)
// =============================================================
export const hurstDef: IndicatorDef = {
  code: 'HURST',
  name: 'Hurst Exponent (R/S)',
  category: 'mean_reversion',
  description: '<0.5 mean-reverting, =0.5 random walk, >0.5 trending.',
  inputs: [{ key: 'period', label: 'Length', type: 'int', default: 100, min: 30 }],
  outputs: [{ key: 'h', label: 'Hurst', plot: 'line', paneId: 'sub' }],
};
export const hurstCompute = (ctx: IndicatorContext, p: { period?: number }): IndicatorComputeResult => {
  const period = p.period ?? 100;
  const out: (number | null)[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    const slice = ctx.close.slice(i - period + 1, i + 1);
    const N = slice.length;
    const m = mean(slice);
    const dev = slice.map((v) => v - m);
    const cum: number[] = [];
    let acc = 0;
    for (const d of dev) { acc += d; cum.push(acc); }
    const R = Math.max(...cum) - Math.min(...cum);
    const S = std(slice);
    if (S === 0 || R === 0) { out.push(null); continue; }
    out.push(Math.log(R / S) / Math.log(N));
  }
  return { series: { h: out } };
};

// =============================================================
// KALMAN FILTER (1-D, position-only)
// =============================================================
export const kalmanDef: IndicatorDef = {
  code: 'KALMAN',
  name: 'Kalman Filter Price',
  category: 'adaptive',
  inputs: [
    { key: 'processNoise', label: 'Process Noise (Q)', type: 'float', default: 0.001, step: 0.001, min: 0 },
    { key: 'measurementNoise', label: 'Measurement Noise (R)', type: 'float', default: 0.01, step: 0.001, min: 0 },
  ],
  outputs: [{ key: 'kalman', label: 'Kalman', plot: 'line', paneId: 'overlay' }],
  overlay: true,
};
export const kalmanCompute = (
  ctx: IndicatorContext,
  p: { processNoise?: number; measurementNoise?: number }
): IndicatorComputeResult => {
  const Q = p.processNoise ?? 0.001;
  const R = p.measurementNoise ?? 0.01;
  const x: number[] = [];
  let estimate = ctx.close[0];
  let errorCov = 1;
  for (let i = 0; i < ctx.close.length; i++) {
    const predict = estimate;
    const predictCov = errorCov + Q;
    const K = predictCov / (predictCov + R);
    estimate = predict + K * (ctx.close[i] - predict);
    errorCov = (1 - K) * predictCov;
    x.push(estimate);
  }
  return { series: { kalman: x } };
};

// =============================================================
// VOLATILITY REGIME (Garch-lite via EWMA variance)
// =============================================================
export const volRegimeDef: IndicatorDef = {
  code: 'VOL_REGIME',
  name: 'EWMA Volatility Regime',
  category: 'volatility',
  inputs: [
    { key: 'lambda', label: 'Lambda', type: 'float', default: 0.94, min: 0.5, max: 0.999, step: 0.001 },
  ],
  outputs: [
    { key: 'sigma', label: 'EWMA σ', plot: 'line', paneId: 'sub' },
    { key: 'regime', label: 'Regime', plot: 'line', paneId: 'sub' },
  ],
};
export const volRegimeCompute = (ctx: IndicatorContext, p: { lambda?: number }): IndicatorComputeResult => {
  const lambda = p.lambda ?? 0.94;
  const returns = ctx.close.map((c, i) => (i === 0 ? 0 : Math.log(c / ctx.close[i - 1])));
  const variance: number[] = [returns[0] ** 2];
  for (let i = 1; i < returns.length; i++) {
    variance.push(lambda * variance[i - 1] + (1 - lambda) * returns[i] ** 2);
  }
  const sigma = variance.map((v) => Math.sqrt(v));
  // Regime: 1 = low (<25th), 2 = normal, 3 = high (>75th)
  const sorted = [...sigma].sort((a, b) => a - b);
  const q25 = sorted[Math.floor(sorted.length * 0.25)];
  const q75 = sorted[Math.floor(sorted.length * 0.75)];
  const regime = sigma.map((s) => (s < q25 ? 1 : s > q75 ? 3 : 2));
  return { series: { sigma, regime } };
};

// =============================================================
// CROSS-SECTION RELATIVE STRENGTH (vs benchmark)
// =============================================================
export const relStrengthDef: IndicatorDef = {
  code: 'REL_STRENGTH',
  name: 'Relative Strength vs Benchmark',
  category: 'composite',
  description: 'Rolling correlation & spread vs benchmark series (e.g., BTC for alts, SPY for stocks).',
  inputs: [
    { key: 'period', label: 'Length', type: 'int', default: 30, min: 5 },
  ],
  outputs: [
    { key: 'spread', label: 'Spread', plot: 'line', paneId: 'sub' },
    { key: 'corr', label: 'Correlation', plot: 'line', paneId: 'sub' },
  ],
};
export const relStrengthCompute = (
  ctx: IndicatorContext,
  p: { period?: number; benchmark?: number[] }
): IndicatorComputeResult => {
  const period = p.period ?? 30;
  const bench = p.benchmark ?? ctx.close.map(() => 0); // fallback no data
  const spread: (number | null)[] = [];
  const corr: (number | null)[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i < period - 1) { spread.push(null); corr.push(null); continue; }
    const a = ctx.close.slice(i - period + 1, i + 1);
    const b = bench.slice(i - period + 1, i + 1);
    const sp = a[a.length - 1] / a[0] - b[b.length - 1] / Math.max(1e-9, b[0]);
    spread.push(sp);
    corr.push(pearson(a, b));
  }
  return { series: { spread, corr } };
};

// =============================================================
// KELTNER/BB SQUEEZE (volatility compression breakout)
// =============================================================
export const squeezeDef: IndicatorDef = {
  code: 'TTM_SQUEEZE',
  name: 'TTM Squeeze (Carter)',
  category: 'volatility',
  inputs: [
    { key: 'bbLen', label: 'BB Length', type: 'int', default: 20, min: 2 },
    { key: 'bbMult', label: 'BB StdDev', type: 'float', default: 2, step: 0.1 },
    { key: 'kcLen', label: 'KC Length', type: 'int', default: 20, min: 2 },
    { key: 'kcMult', label: 'KC ATR Mult', type: 'float', default: 1.5, step: 0.1 },
  ],
  outputs: [
    { key: 'squeezeOn', label: 'Squeeze Active', plot: 'histogram', paneId: 'sub' },
    { key: 'mom', label: 'Momentum', plot: 'histogram', paneId: 'sub' },
  ],
};
export const squeezeCompute = (
  ctx: IndicatorContext,
  p: { bbLen?: number; bbMult?: number; kcLen?: number; kcMult?: number }
): IndicatorComputeResult => {
  const bbLen = p.bbLen ?? 20, bbMult = p.bbMult ?? 2;
  const kcLen = p.kcLen ?? 20, kcMult = p.kcMult ?? 1.5;
  const sq: (number | null)[] = [];
  const mom: (number | null)[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i < Math.max(bbLen, kcLen) - 1) { sq.push(null); mom.push(null); continue; }
    const slice = ctx.close.slice(i - bbLen + 1, i + 1);
    const m = mean(slice), s = std(slice);
    const bbUp = m + bbMult * s;
    const bbDn = m - bbMult * s;
    const trSlice = [];
    for (let j = i - kcLen + 1; j <= i; j++) {
      trSlice.push(Math.max(ctx.high[j] - ctx.low[j], Math.abs(ctx.high[j] - ctx.close[Math.max(0, j - 1)]), Math.abs(ctx.low[j] - ctx.close[Math.max(0, j - 1)])));
    }
    const kcMid = mean(ctx.close.slice(i - kcLen + 1, i + 1));
    const atr = mean(trSlice);
    const kcUp = kcMid + kcMult * atr;
    const kcDn = kcMid - kcMult * atr;
    sq.push(bbUp < kcUp && bbDn > kcDn ? 1 : 0);
    // Carter momentum: linreg of close - midpoint
    const mid = (Math.max(...ctx.high.slice(i - kcLen + 1, i + 1)) + Math.min(...ctx.low.slice(i - kcLen + 1, i + 1))) / 2;
    mom.push(ctx.close[i] - (mid + kcMid) / 2);
  }
  return { series: { squeezeOn: sq, mom } };
};

// =============================================================
// ALT-DATA BLEND (sentiment / weather / calendar inject)
// =============================================================
export const altBlendDef: IndicatorDef = {
  code: 'ALT_BLEND',
  name: 'Alt-Data Blend Score',
  category: 'alt_data',
  description: 'Blends recent sentiment, news impact, weather anomaly, and calendar event into a single -100..+100 score.',
  inputs: [
    { key: 'sentimentWeight', label: 'Sentiment Weight', type: 'float', default: 0.4, min: 0, max: 1, step: 0.05 },
    { key: 'newsWeight', label: 'News Weight', type: 'float', default: 0.3, min: 0, max: 1, step: 0.05 },
    { key: 'weatherWeight', label: 'Weather Weight', type: 'float', default: 0.1, min: 0, max: 1, step: 0.05 },
    { key: 'calendarWeight', label: 'Calendar Weight', type: 'float', default: 0.2, min: 0, max: 1, step: 0.05 },
  ],
  outputs: [{ key: 'blend', label: 'Alt-Data Blend', plot: 'line', paneId: 'sub' }],
};
export const altBlendCompute = (
  ctx: IndicatorContext,
  p: {
    sentimentWeight?: number; newsWeight?: number; weatherWeight?: number; calendarWeight?: number;
    sentiment?: number[]; news?: number[]; weather?: number[]; calendar?: number[];
  }
): IndicatorComputeResult => {
  const n = ctx.close.length;
  const sw = p.sentimentWeight ?? 0.4, nw = p.newsWeight ?? 0.3, ww = p.weatherWeight ?? 0.1, cw = p.calendarWeight ?? 0.2;
  const fill = (arr: number[] | undefined) => arr && arr.length === n ? arr : Array(n).fill(0);
  const sent = fill(p.sentiment), news = fill(p.news), weather = fill(p.weather), cal = fill(p.calendar);
  const blend = sent.map((s, i) => sw * s + nw * news[i] + ww * weather[i] + cw * cal[i]);
  return { series: { blend } };
};

export const RENAISSANCE_INDICATORS = [
  { def: zScoreDef, compute: zScoreCompute },
  { def: halfLifeDef, compute: halfLifeCompute },
  { def: hurstDef, compute: hurstCompute },
  { def: kalmanDef, compute: kalmanCompute },
  { def: volRegimeDef, compute: volRegimeCompute },
  { def: relStrengthDef, compute: relStrengthCompute },
  { def: squeezeDef, compute: squeezeCompute },
  { def: altBlendDef, compute: altBlendCompute },
];
