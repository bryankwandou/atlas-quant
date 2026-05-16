/**
 * VOLATILITY indicators — semua param-able.
 */
import type { IndicatorContext, IndicatorComputeResult, IndicatorDef } from '@/domain/indicator';
import { ema as emaArr, sma as smaArr, std, trueRange, wilderSmooth } from './math';

// =============================================================
// ATR
// =============================================================
export const atrDef: IndicatorDef = {
  code: 'ATR',
  name: 'Average True Range',
  nameId: 'Rentang Sejati Rata-rata',
  category: 'volatility',
  description: 'Wilder ATR; measures volatility magnitude per bar.',
  inputs: [
    { key: 'period', label: 'Length', type: 'int', default: 14, min: 1, max: 200 },
    { key: 'smoothing', label: 'Smoothing', type: 'enum', default: 'wilder',
      options: [{ value: 'wilder', label: 'Wilder/RMA' }, { value: 'sma', label: 'SMA' }, { value: 'ema', label: 'EMA' }] },
  ],
  outputs: [{ key: 'atr', label: 'ATR', plot: 'line', paneId: 'sub' }],
};
export const atrCompute = (
  ctx: IndicatorContext,
  p: { period?: number; smoothing?: string }
): IndicatorComputeResult => {
  const period = p.period ?? 14;
  const tr = trueRange(ctx.high, ctx.low, ctx.close);
  let atr: number[];
  if (p.smoothing === 'sma') {
    const arr = smaArr(tr, period);
    atr = arr.map((v) => v ?? NaN);
  } else if (p.smoothing === 'ema') {
    atr = emaArr(tr, period);
  } else {
    atr = wilderSmooth(tr, period);
  }
  return { series: { atr: atr.map((v) => (isNaN(v) ? null : v)) } };
};

// =============================================================
// BOLLINGER BANDS
// =============================================================
export const bbDef: IndicatorDef = {
  code: 'BBANDS',
  name: 'Bollinger Bands',
  category: 'volatility',
  inputs: [
    { key: 'period', label: 'Length', type: 'int', default: 20, min: 2 },
    { key: 'stdMult', label: 'StdDev', type: 'float', default: 2, min: 0.5, max: 10, step: 0.1 },
    { key: 'source', label: 'Source', type: 'source', default: 'close' },
  ],
  outputs: [
    { key: 'upper', label: 'Upper', plot: 'line', paneId: 'overlay' },
    { key: 'middle', label: 'Middle', plot: 'line', paneId: 'overlay' },
    { key: 'lower', label: 'Lower', plot: 'line', paneId: 'overlay' },
    { key: 'bw', label: 'Bandwidth', plot: 'line', paneId: 'sub' },
    { key: 'pctB', label: '%B', plot: 'line', paneId: 'sub' },
  ],
  overlay: true,
};
export const bbCompute = (
  ctx: IndicatorContext,
  p: { period?: number; stdMult?: number; source?: string }
): IndicatorComputeResult => {
  const period = p.period ?? 20, k = p.stdMult ?? 2;
  const src = ctx.close;
  const middle: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const bw: (number | null)[] = [];
  const pctB: (number | null)[] = [];
  for (let i = 0; i < src.length; i++) {
    if (i < period - 1) { middle.push(null); upper.push(null); lower.push(null); bw.push(null); pctB.push(null); continue; }
    const slice = src.slice(i - period + 1, i + 1);
    const m = slice.reduce((a, b) => a + b, 0) / period;
    const s = Math.sqrt(slice.reduce((a, v) => a + (v - m) ** 2, 0) / period);
    const u = m + k * s, l = m - k * s;
    middle.push(m); upper.push(u); lower.push(l);
    bw.push(m === 0 ? null : ((u - l) / m) * 100);
    pctB.push((u - l) === 0 ? 0.5 : (src[i] - l) / (u - l));
  }
  return { series: { upper, middle, lower, bw, pctB } };
};

// =============================================================
// KELTNER CHANNEL
// =============================================================
export const keltnerDef: IndicatorDef = {
  code: 'KELTNER',
  name: 'Keltner Channel',
  category: 'volatility',
  inputs: [
    { key: 'emaPeriod', label: 'EMA Length', type: 'int', default: 20, min: 1 },
    { key: 'atrPeriod', label: 'ATR Length', type: 'int', default: 10, min: 1 },
    { key: 'mult', label: 'Multiplier', type: 'float', default: 1.5, min: 0.1, step: 0.1 },
  ],
  outputs: [
    { key: 'upper', label: 'Upper', plot: 'line', paneId: 'overlay' },
    { key: 'middle', label: 'Middle', plot: 'line', paneId: 'overlay' },
    { key: 'lower', label: 'Lower', plot: 'line', paneId: 'overlay' },
  ],
  overlay: true,
};
export const keltnerCompute = (
  ctx: IndicatorContext,
  p: { emaPeriod?: number; atrPeriod?: number; mult?: number }
): IndicatorComputeResult => {
  const ep = p.emaPeriod ?? 20, ap = p.atrPeriod ?? 10, mult = p.mult ?? 1.5;
  const mid = emaArr(ctx.close, ep);
  const tr = trueRange(ctx.high, ctx.low, ctx.close);
  const atr = wilderSmooth(tr, ap);
  const upper = mid.map((m, i) => m + mult * atr[i]);
  const lower = mid.map((m, i) => m - mult * atr[i]);
  return { series: { middle: mid, upper, lower } };
};

// =============================================================
// DONCHIAN CHANNEL
// =============================================================
export const donchianDef: IndicatorDef = {
  code: 'DONCHIAN',
  name: 'Donchian Channel',
  category: 'volatility',
  inputs: [
    { key: 'period', label: 'Length', type: 'int', default: 20, min: 1 },
  ],
  outputs: [
    { key: 'upper', label: 'Upper', plot: 'line', paneId: 'overlay' },
    { key: 'middle', label: 'Middle', plot: 'line', paneId: 'overlay' },
    { key: 'lower', label: 'Lower', plot: 'line', paneId: 'overlay' },
  ],
  overlay: true,
};
export const donchianCompute = (ctx: IndicatorContext, p: { period?: number }): IndicatorComputeResult => {
  const period = p.period ?? 20;
  const upper: (number | null)[] = [], lower: (number | null)[] = [], middle: (number | null)[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i < period - 1) { upper.push(null); lower.push(null); middle.push(null); continue; }
    const hh = Math.max(...ctx.high.slice(i - period + 1, i + 1));
    const ll = Math.min(...ctx.low.slice(i - period + 1, i + 1));
    upper.push(hh); lower.push(ll); middle.push((hh + ll) / 2);
  }
  return { series: { upper, lower, middle } };
};

// =============================================================
// CHOPPINESS INDEX
// =============================================================
export const chopDef: IndicatorDef = {
  code: 'CHOP',
  name: 'Choppiness Index',
  category: 'volatility',
  description: 'Identifies sideways/chop markets; above 61.8 = chop, below 38.2 = trending.',
  inputs: [{ key: 'period', label: 'Length', type: 'int', default: 14, min: 2 }],
  outputs: [{ key: 'chop', label: 'CHOP', plot: 'line', paneId: 'sub' }],
};
export const chopCompute = (ctx: IndicatorContext, p: { period?: number }): IndicatorComputeResult => {
  const period = p.period ?? 14;
  const tr = trueRange(ctx.high, ctx.low, ctx.close);
  const out: (number | null)[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    const trSum = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    const hh = Math.max(...ctx.high.slice(i - period + 1, i + 1));
    const ll = Math.min(...ctx.low.slice(i - period + 1, i + 1));
    const range = hh - ll;
    if (range === 0) { out.push(null); continue; }
    out.push((100 * Math.log10(trSum / range)) / Math.log10(period));
  }
  return { series: { chop: out } };
};

// =============================================================
// HISTORICAL VOLATILITY
// =============================================================
export const hvDef: IndicatorDef = {
  code: 'HV',
  name: 'Historical Volatility',
  category: 'volatility',
  inputs: [
    { key: 'period', label: 'Length', type: 'int', default: 20, min: 2 },
    { key: 'annualize', label: 'Annualize (252)', type: 'bool', default: true },
  ],
  outputs: [{ key: 'hv', label: 'HV', plot: 'line', paneId: 'sub' }],
};
export const hvCompute = (ctx: IndicatorContext, p: { period?: number; annualize?: boolean }): IndicatorComputeResult => {
  const period = p.period ?? 20;
  const returns = ctx.close.map((c, i) => (i === 0 ? 0 : Math.log(c / ctx.close[i - 1])));
  const out: (number | null)[] = [];
  for (let i = 0; i < returns.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    const s = std(returns.slice(i - period + 1, i + 1));
    out.push(p.annualize === false ? s * 100 : s * Math.sqrt(252) * 100);
  }
  return { series: { hv: out } };
};

// =============================================================
// VOLATILITY PERCENTILE
// =============================================================
export const volPctDef: IndicatorDef = {
  code: 'VOL_PCT',
  name: 'Volatility Percentile Rank',
  category: 'volatility',
  inputs: [
    { key: 'window', label: 'Lookback Window', type: 'int', default: 252, min: 30 },
    { key: 'shortPeriod', label: 'Short Period', type: 'int', default: 14, min: 2 },
  ],
  outputs: [{ key: 'pct', label: 'Vol %ile', plot: 'line', paneId: 'sub' }],
};
export const volPctCompute = (
  ctx: IndicatorContext,
  p: { window?: number; shortPeriod?: number }
): IndicatorComputeResult => {
  const W = p.window ?? 252, S = p.shortPeriod ?? 14;
  const rets = ctx.close.map((c, i) => (i === 0 ? 0 : (c - ctx.close[i - 1]) / ctx.close[i - 1]));
  const rolled = rets.map((_, i) => {
    if (i < S - 1) return null;
    return std(rets.slice(i - S + 1, i + 1));
  });
  const out: (number | null)[] = [];
  for (let i = 0; i < rolled.length; i++) {
    if (i < W - 1 || rolled[i] === null) { out.push(null); continue; }
    const slice = rolled.slice(i - W + 1, i + 1).filter((v) => v !== null) as number[];
    const cur = rolled[i] as number;
    const rank = slice.filter((v) => v <= cur).length;
    out.push((rank / slice.length) * 100);
  }
  return { series: { pct: out } };
};

export const VOLATILITY_INDICATORS = [
  { def: atrDef, compute: atrCompute },
  { def: bbDef, compute: bbCompute },
  { def: keltnerDef, compute: keltnerCompute },
  { def: donchianDef, compute: donchianCompute },
  { def: chopDef, compute: chopCompute },
  { def: hvDef, compute: hvCompute },
  { def: volPctDef, compute: volPctCompute },
];
