/**
 * MOMENTUM indicators — semua param-able.
 */
import type { IndicatorContext, IndicatorComputeResult, IndicatorDef } from '@/domain/indicator';
import { sma as smaArr, ema as emaArr, rolling, highestHigh, lowestLow } from './math';

// =============================================================
// RSI
// =============================================================
export const rsiDef: IndicatorDef = {
  code: 'RSI',
  name: 'Relative Strength Index',
  nameId: 'Indeks Kekuatan Relatif',
  category: 'momentum',
  description: 'RSI measures speed/magnitude of price change; oversold <30, overbought >70.',
  inputs: [
    { key: 'period', label: 'Length', type: 'int', default: 14, min: 2, max: 200 },
    { key: 'source', label: 'Source', type: 'source', default: 'close',
      options: [{ value: 'close', label: 'Close' }, { value: 'open', label: 'Open' }, { value: 'high', label: 'High' }, { value: 'low', label: 'Low' }] },
    { key: 'overbought', label: 'Overbought Level', type: 'int', default: 70, min: 50, max: 99 },
    { key: 'oversold', label: 'Oversold Level', type: 'int', default: 30, min: 1, max: 50 },
    { key: 'showMA', label: 'Plot Signal MA', type: 'bool', default: false },
    { key: 'maLen', label: 'MA Length', type: 'int', default: 14, min: 1 },
  ],
  outputs: [
    { key: 'rsi', label: 'RSI', plot: 'line', paneId: 'sub' },
    { key: 'rsiMA', label: 'RSI MA', plot: 'line', paneId: 'sub' },
    { key: 'overbought', label: 'Overbought', plot: 'level', paneId: 'sub' },
    { key: 'oversold', label: 'Oversold', plot: 'level', paneId: 'sub' },
  ],
};

export const rsiCompute = (
  ctx: IndicatorContext,
  p: { period?: number; source?: string; overbought?: number; oversold?: number; showMA?: boolean; maLen?: number }
): IndicatorComputeResult => {
  const period = p.period ?? 14;
  const src = (p.source === 'open' ? ctx.open : p.source === 'high' ? ctx.high : p.source === 'low' ? ctx.low : ctx.close);
  const result: (number | null)[] = [];
  const changes = src.map((c, i) => i === 0 ? 0 : c - src[i - 1]);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    avgGain += Math.max(changes[i], 0);
    avgLoss += Math.abs(Math.min(changes[i], 0));
  }
  avgGain /= period; avgLoss /= period;
  for (let i = 0; i < src.length; i++) {
    if (i < period) { result.push(null); continue; }
    if (i > period) {
      const gain = Math.max(changes[i], 0);
      const loss = Math.abs(Math.min(changes[i], 0));
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    result.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
  }
  const ma = p.showMA ? smaArr(result.map((v) => v ?? 50), p.maLen ?? 14) : Array(result.length).fill(null);
  return {
    series: { rsi: result, rsiMA: ma },
    levels: [
      { key: 'overbought', value: p.overbought ?? 70, label: 'OB', color: '#ef4444' },
      { key: 'oversold', value: p.oversold ?? 30, label: 'OS', color: '#10b981' },
    ],
  };
};

// =============================================================
// STOCHASTIC
// =============================================================
export const stochDef: IndicatorDef = {
  code: 'STOCH',
  name: 'Stochastic %K/%D',
  category: 'momentum',
  inputs: [
    { key: 'kPeriod', label: '%K Length', type: 'int', default: 14, min: 1 },
    { key: 'kSmoothing', label: '%K Smoothing', type: 'int', default: 1, min: 1 },
    { key: 'dPeriod', label: '%D Smoothing', type: 'int', default: 3, min: 1 },
    { key: 'overbought', label: 'Overbought', type: 'int', default: 80 },
    { key: 'oversold', label: 'Oversold', type: 'int', default: 20 },
  ],
  outputs: [
    { key: 'k', label: '%K', plot: 'line', paneId: 'sub' },
    { key: 'd', label: '%D', plot: 'line', paneId: 'sub' },
  ],
};
export const stochCompute = (
  ctx: IndicatorContext,
  p: { kPeriod?: number; kSmoothing?: number; dPeriod?: number; overbought?: number; oversold?: number }
): IndicatorComputeResult => {
  const kP = p.kPeriod ?? 14;
  const kS = p.kSmoothing ?? 1;
  const dP = p.dPeriod ?? 3;
  const hh = highestHigh(ctx.high, kP);
  const ll = lowestLow(ctx.low, kP);
  const rawK = ctx.close.map((c, i) => {
    const h = hh[i], l = ll[i];
    if (h === null || l === null) return null;
    return h === l ? 0 : ((c - (l as number)) / ((h as number) - (l as number))) * 100;
  });
  const k = smaArr(rawK.map((v) => v ?? 50), kS);
  const d = smaArr(k.map((v) => v ?? 50), dP);
  return {
    series: { k, d },
    levels: [
      { key: 'ob', value: p.overbought ?? 80, color: '#ef4444' },
      { key: 'os', value: p.oversold ?? 20, color: '#10b981' },
    ],
  };
};

// =============================================================
// STOCH RSI
// =============================================================
export const stochRsiDef: IndicatorDef = {
  code: 'STOCH_RSI',
  name: 'Stochastic RSI',
  category: 'momentum',
  inputs: [
    { key: 'rsiPeriod', label: 'RSI Length', type: 'int', default: 14 },
    { key: 'stochPeriod', label: 'Stochastic Length', type: 'int', default: 14 },
    { key: 'kSmoothing', label: '%K Smoothing', type: 'int', default: 3 },
    { key: 'dSmoothing', label: '%D Smoothing', type: 'int', default: 3 },
  ],
  outputs: [
    { key: 'k', label: '%K', plot: 'line', paneId: 'sub' },
    { key: 'd', label: '%D', plot: 'line', paneId: 'sub' },
  ],
};
export const stochRsiCompute = (
  ctx: IndicatorContext,
  p: { rsiPeriod?: number; stochPeriod?: number; kSmoothing?: number; dSmoothing?: number }
): IndicatorComputeResult => {
  // Run RSI first
  const rsiRes = rsiCompute(ctx, { period: p.rsiPeriod ?? 14 });
  const rsiArr = rsiRes.series.rsi.map((v) => v ?? 50);
  const sp = p.stochPeriod ?? 14;
  const rawK = rsiArr.map((_, i) => {
    if (i < sp - 1) return null;
    const slice = rsiArr.slice(i - sp + 1, i + 1);
    const min = Math.min(...slice), max = Math.max(...slice);
    return max === min ? 0 : ((rsiArr[i] - min) / (max - min)) * 100;
  });
  const k = smaArr(rawK.map((v) => v ?? 50), p.kSmoothing ?? 3);
  const d = smaArr(k.map((v) => v ?? 50), p.dSmoothing ?? 3);
  return { series: { k, d } };
};

// =============================================================
// WILLIAMS %R
// =============================================================
export const williamsRDef: IndicatorDef = {
  code: 'WILLIAMSR',
  name: 'Williams %R',
  nameId: 'Williams %R',
  category: 'momentum',
  description: 'Larry Williams oscillator measuring close vs N-bar range.',
  inputs: [
    { key: 'period', label: 'Length', type: 'int', default: 14, min: 1 },
    { key: 'overbought', label: 'Overbought', type: 'int', default: -20 },
    { key: 'oversold', label: 'Oversold', type: 'int', default: -80 },
  ],
  outputs: [{ key: 'wr', label: 'Williams %R', plot: 'line', paneId: 'sub' }],
};
export const williamsRCompute = (
  ctx: IndicatorContext,
  p: { period?: number }
): IndicatorComputeResult => {
  const period = p.period ?? 14;
  const out: (number | null)[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    const hh = Math.max(...ctx.high.slice(i - period + 1, i + 1));
    const ll = Math.min(...ctx.low.slice(i - period + 1, i + 1));
    out.push(hh === ll ? 0 : ((hh - ctx.close[i]) / (hh - ll)) * -100);
  }
  return { series: { wr: out } };
};

// =============================================================
// ROC
// =============================================================
export const rocDef: IndicatorDef = {
  code: 'ROC',
  name: 'Rate of Change',
  category: 'momentum',
  inputs: [
    { key: 'period', label: 'Length', type: 'int', default: 9, min: 1 },
    { key: 'source', label: 'Source', type: 'source', default: 'close' },
  ],
  outputs: [{ key: 'roc', label: 'ROC', plot: 'line', paneId: 'sub' }],
};
export const rocCompute = (
  ctx: IndicatorContext,
  p: { period?: number; source?: string }
): IndicatorComputeResult => {
  const period = p.period ?? 9;
  const src = ctx.close;
  const out = src.map((v, i) => (i < period ? null : ((v - src[i - period]) / src[i - period]) * 100));
  return { series: { roc: out } };
};

// =============================================================
// CCI
// =============================================================
export const cciDef: IndicatorDef = {
  code: 'CCI',
  name: 'Commodity Channel Index',
  category: 'momentum',
  inputs: [
    { key: 'period', label: 'Length', type: 'int', default: 20, min: 2 },
    { key: 'constant', label: 'Constant', type: 'float', default: 0.015, min: 0.001, step: 0.001 },
  ],
  outputs: [{ key: 'cci', label: 'CCI', plot: 'line', paneId: 'sub' }],
};
export const cciCompute = (
  ctx: IndicatorContext,
  p: { period?: number; constant?: number }
): IndicatorComputeResult => {
  const period = p.period ?? 20;
  const k = p.constant ?? 0.015;
  const tp = ctx.high.map((h, i) => (h + ctx.low[i] + ctx.close[i]) / 3);
  const out = rolling(tp, period, (slice) => {
    const ma = slice.reduce((a, b) => a + b, 0) / slice.length;
    const md = slice.reduce((a, v) => a + Math.abs(v - ma), 0) / slice.length;
    if (md === 0) return 0;
    return (tp[tp.length - 1] - ma) / (k * md);
  });
  // Recompute properly per index
  const proper: (number | null)[] = [];
  for (let i = 0; i < tp.length; i++) {
    if (i < period - 1) { proper.push(null); continue; }
    const slice = tp.slice(i - period + 1, i + 1);
    const ma = slice.reduce((a, b) => a + b, 0) / slice.length;
    const md = slice.reduce((a, v) => a + Math.abs(v - ma), 0) / slice.length;
    proper.push(md === 0 ? 0 : (tp[i] - ma) / (k * md));
  }
  return { series: { cci: proper } };
};

// =============================================================
// AWESOME OSCILLATOR
// =============================================================
export const aoDef: IndicatorDef = {
  code: 'AO',
  name: 'Awesome Oscillator',
  category: 'momentum',
  inputs: [
    { key: 'fast', label: 'Fast', type: 'int', default: 5, min: 1 },
    { key: 'slow', label: 'Slow', type: 'int', default: 34, min: 1 },
  ],
  outputs: [{ key: 'ao', label: 'AO', plot: 'histogram', paneId: 'sub' }],
};
export const aoCompute = (ctx: IndicatorContext, p: { fast?: number; slow?: number }): IndicatorComputeResult => {
  const fast = p.fast ?? 5, slow = p.slow ?? 34;
  const median = ctx.high.map((h, i) => (h + ctx.low[i]) / 2);
  const fastMa = smaArr(median, fast);
  const slowMa = smaArr(median, slow);
  const ao = fastMa.map((v, i) => v === null || slowMa[i] === null ? null : (v as number) - (slowMa[i] as number));
  return { series: { ao } };
};

export const MOMENTUM_INDICATORS = [
  { def: rsiDef, compute: rsiCompute },
  { def: stochDef, compute: stochCompute },
  { def: stochRsiDef, compute: stochRsiCompute },
  { def: williamsRDef, compute: williamsRCompute },
  { def: rocDef, compute: rocCompute },
  { def: cciDef, compute: cciCompute },
  { def: aoDef, compute: aoCompute },
];
