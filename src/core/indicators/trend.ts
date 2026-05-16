/**
 * TREND indicators — semua param-able. Setiap indikator export `def` (metadata)
 * dan `compute` (fungsi murni). UI memakai `def.inputs` untuk render form param.
 */
import type { IndicatorContext, IndicatorComputeResult, IndicatorDef } from '@/domain/indicator';
import {
  ema as emaArr,
  sma as smaArr,
  wma as wmaArr,
  dema as demaArr,
  tema as temaArr,
  alma as almaArr,
  kama as kamaArr,
  vwmaCalc,
} from './math';

const sourceInput = {
  key: 'source',
  label: 'Source',
  labelId: 'Sumber',
  type: 'source' as const,
  default: 'close',
  options: [
    { value: 'close', label: 'Close' },
    { value: 'open', label: 'Open' },
    { value: 'high', label: 'High' },
    { value: 'low', label: 'Low' },
    { value: 'hl2', label: '(H+L)/2' },
    { value: 'hlc3', label: '(H+L+C)/3' },
    { value: 'ohlc4', label: '(O+H+L+C)/4' },
  ],
};

function pickSource(ctx: IndicatorContext, src: string): number[] {
  switch (src) {
    case 'open': return ctx.open;
    case 'high': return ctx.high;
    case 'low':  return ctx.low;
    case 'hl2':  return ctx.high.map((h, i) => (h + ctx.low[i]) / 2);
    case 'hlc3': return ctx.high.map((h, i) => (h + ctx.low[i] + ctx.close[i]) / 3);
    case 'ohlc4': return ctx.open.map((o, i) => (o + ctx.high[i] + ctx.low[i] + ctx.close[i]) / 4);
    default: return ctx.close;
  }
}

// =============================================================
// EMA — Exponential Moving Average
// =============================================================
export const emaDef: IndicatorDef = {
  code: 'EMA',
  name: 'Exponential Moving Average',
  nameId: 'Rata-rata Bergerak Eksponensial',
  category: 'trend',
  description: 'EMA gives more weight to recent prices; ideal for following short-term momentum.',
  descriptionId: 'EMA memberi bobot lebih ke harga terbaru; cocok untuk momentum jangka pendek.',
  formula: 'EMA(t) = α·Price(t) + (1−α)·EMA(t−1) where α=2/(N+1)',
  inputs: [
    sourceInput,
    { key: 'period', label: 'Length', labelId: 'Panjang', type: 'int', default: 21, min: 2, max: 500, step: 1 },
    { key: 'offset', label: 'Offset', type: 'int', default: 0, min: -50, max: 50 },
    { key: 'color', label: 'Color', type: 'color', default: '#2563eb' },
  ],
  outputs: [{ key: 'ema', label: 'EMA', plot: 'line', paneId: 'overlay' }],
  overlay: true,
  pineCompat: true,
  source: 'builtin',
  tags: ['ma', 'trend', 'classic'],
};

export const emaCompute = (
  ctx: IndicatorContext,
  params: { source?: string; period?: number; offset?: number }
): IndicatorComputeResult => {
  const src = pickSource(ctx, params.source ?? 'close');
  const v = emaArr(src, params.period ?? 21);
  const offset = params.offset ?? 0;
  const shifted = offset === 0 ? v : v.slice(0, v.length - offset).map((x, i) => v[i + offset] ?? x);
  return { series: { ema: shifted } };
};

// =============================================================
// SMA, WMA, DEMA, TEMA, ALMA, KAMA, VWMA
// =============================================================
export const smaDef: IndicatorDef = {
  code: 'SMA',
  name: 'Simple Moving Average',
  nameId: 'Rata-rata Bergerak Sederhana',
  category: 'trend',
  inputs: [
    sourceInput,
    { key: 'period', label: 'Length', type: 'int', default: 50, min: 2, max: 500, step: 1 },
    { key: 'color', label: 'Color', type: 'color', default: '#10b981' },
  ],
  outputs: [{ key: 'sma', label: 'SMA', plot: 'line', paneId: 'overlay' }],
  overlay: true,
  pineCompat: true,
  tags: ['ma', 'trend', 'classic'],
};
export const smaCompute = (ctx: IndicatorContext, p: { source?: string; period?: number }): IndicatorComputeResult => ({
  series: { sma: smaArr(pickSource(ctx, p.source ?? 'close'), p.period ?? 50) },
});

export const wmaDef: IndicatorDef = {
  code: 'WMA',
  name: 'Weighted Moving Average',
  category: 'trend',
  inputs: [
    sourceInput,
    { key: 'period', label: 'Length', type: 'int', default: 20, min: 2, max: 500 },
    { key: 'color', label: 'Color', type: 'color', default: '#f59e0b' },
  ],
  outputs: [{ key: 'wma', label: 'WMA', plot: 'line', paneId: 'overlay' }],
  overlay: true,
};
export const wmaCompute = (ctx: IndicatorContext, p: { source?: string; period?: number }): IndicatorComputeResult => ({
  series: { wma: wmaArr(pickSource(ctx, p.source ?? 'close'), p.period ?? 20) },
});

export const demaDef: IndicatorDef = {
  code: 'DEMA',
  name: 'Double Exponential Moving Average',
  category: 'trend',
  inputs: [
    sourceInput,
    { key: 'period', label: 'Length', type: 'int', default: 21, min: 2, max: 500 },
    { key: 'color', label: 'Color', type: 'color', default: '#8b5cf6' },
  ],
  outputs: [{ key: 'dema', label: 'DEMA', plot: 'line', paneId: 'overlay' }],
  overlay: true,
};
export const demaCompute = (ctx: IndicatorContext, p: { source?: string; period?: number }): IndicatorComputeResult => ({
  series: { dema: demaArr(pickSource(ctx, p.source ?? 'close'), p.period ?? 21) },
});

export const temaDef: IndicatorDef = {
  code: 'TEMA',
  name: 'Triple Exponential Moving Average',
  category: 'trend',
  inputs: [
    sourceInput,
    { key: 'period', label: 'Length', type: 'int', default: 21, min: 2, max: 500 },
    { key: 'color', label: 'Color', type: 'color', default: '#ec4899' },
  ],
  outputs: [{ key: 'tema', label: 'TEMA', plot: 'line', paneId: 'overlay' }],
  overlay: true,
};
export const temaCompute = (ctx: IndicatorContext, p: { source?: string; period?: number }): IndicatorComputeResult => ({
  series: { tema: temaArr(pickSource(ctx, p.source ?? 'close'), p.period ?? 21) },
});

export const almaDef: IndicatorDef = {
  code: 'ALMA',
  name: 'Arnaud Legoux Moving Average',
  category: 'adaptive',
  description: 'Gaussian-weighted MA with low lag and smoothness; created by Arnaud Legoux.',
  inputs: [
    sourceInput,
    { key: 'period', label: 'Length', type: 'int', default: 21, min: 4, max: 500 },
    { key: 'sigma', label: 'Sigma', type: 'float', default: 6, min: 1, max: 12, step: 0.1 },
    { key: 'offset', label: 'Offset', type: 'float', default: 0.85, min: 0, max: 1, step: 0.01 },
    { key: 'color', label: 'Color', type: 'color', default: '#0ea5e9' },
  ],
  outputs: [{ key: 'alma', label: 'ALMA', plot: 'line', paneId: 'overlay' }],
  overlay: true,
  tags: ['adaptive'],
};
export const almaCompute = (
  ctx: IndicatorContext,
  p: { source?: string; period?: number; sigma?: number; offset?: number }
): IndicatorComputeResult => ({
  series: { alma: almaArr(pickSource(ctx, p.source ?? 'close'), p.period ?? 21, p.sigma ?? 6, p.offset ?? 0.85) },
});

export const kamaDef: IndicatorDef = {
  code: 'KAMA',
  name: 'Kaufman Adaptive Moving Average',
  category: 'adaptive',
  inputs: [
    sourceInput,
    { key: 'period', label: 'ER Length', type: 'int', default: 10, min: 2, max: 100 },
    { key: 'fast', label: 'Fast SC', type: 'int', default: 2, min: 1, max: 50 },
    { key: 'slow', label: 'Slow SC', type: 'int', default: 30, min: 5, max: 200 },
    { key: 'color', label: 'Color', type: 'color', default: '#22c55e' },
  ],
  outputs: [{ key: 'kama', label: 'KAMA', plot: 'line', paneId: 'overlay' }],
  overlay: true,
};
export const kamaCompute = (
  ctx: IndicatorContext,
  p: { source?: string; period?: number; fast?: number; slow?: number }
): IndicatorComputeResult => ({
  series: { kama: kamaArr(pickSource(ctx, p.source ?? 'close'), p.period ?? 10, p.fast ?? 2, p.slow ?? 30) },
});

export const vwmaDef: IndicatorDef = {
  code: 'VWMA',
  name: 'Volume Weighted Moving Average',
  category: 'volume',
  needsVolume: true,
  inputs: [
    sourceInput,
    { key: 'period', label: 'Length', type: 'int', default: 20, min: 2, max: 500 },
    { key: 'color', label: 'Color', type: 'color', default: '#14b8a6' },
  ],
  outputs: [{ key: 'vwma', label: 'VWMA', plot: 'line', paneId: 'overlay' }],
  overlay: true,
};
export const vwmaCompute = (
  ctx: IndicatorContext,
  p: { source?: string; period?: number }
): IndicatorComputeResult => ({
  series: { vwma: vwmaCalc(pickSource(ctx, p.source ?? 'close'), ctx.volume, p.period ?? 20) },
});

// =============================================================
// MACD
// =============================================================
export const macdDef: IndicatorDef = {
  code: 'MACD',
  name: 'MACD',
  nameId: 'MACD',
  category: 'momentum',
  description: 'Difference of two EMAs with a signal line; spots momentum shifts.',
  inputs: [
    sourceInput,
    { key: 'fast', label: 'Fast Length', type: 'int', default: 12, min: 2, max: 100 },
    { key: 'slow', label: 'Slow Length', type: 'int', default: 26, min: 5, max: 200 },
    { key: 'signal', label: 'Signal Length', type: 'int', default: 9, min: 2, max: 50 },
    { key: 'macdColor', label: 'MACD Color', type: 'color', default: '#2563eb' },
    { key: 'signalColor', label: 'Signal Color', type: 'color', default: '#f59e0b' },
    { key: 'histColor', label: 'Histogram Color', type: 'color', default: '#10b981' },
  ],
  outputs: [
    { key: 'macd', label: 'MACD', plot: 'line', paneId: 'sub' },
    { key: 'signal', label: 'Signal', plot: 'line', paneId: 'sub' },
    { key: 'hist', label: 'Histogram', plot: 'histogram', paneId: 'sub' },
  ],
};
export const macdCompute = (
  ctx: IndicatorContext,
  p: { source?: string; fast?: number; slow?: number; signal?: number }
): IndicatorComputeResult => {
  const src = pickSource(ctx, p.source ?? 'close');
  const fast = p.fast ?? 12, slow = p.slow ?? 26, signal = p.signal ?? 9;
  const ef = emaArr(src, fast);
  const es = emaArr(src, slow);
  const macd = ef.map((v, i) => v - es[i]);
  const sig = emaArr(macd, signal);
  const hist = macd.map((v, i) => v - sig[i]);
  return { series: { macd, signal: sig, hist } };
};

// =============================================================
// ICHIMOKU CLOUD
// =============================================================
export const ichimokuDef: IndicatorDef = {
  code: 'ICHIMOKU',
  name: 'Ichimoku Cloud',
  nameId: 'Ichimoku Cloud',
  category: 'trend',
  inputs: [
    { key: 'conversionPeriods', label: 'Conversion Periods (Tenkan)', type: 'int', default: 9, min: 2 },
    { key: 'basePeriods', label: 'Base Periods (Kijun)', type: 'int', default: 26, min: 2 },
    { key: 'leadingSpanBPeriods', label: 'Leading Span B Periods', type: 'int', default: 52, min: 2 },
    { key: 'displacement', label: 'Displacement', type: 'int', default: 26, min: 0 },
  ],
  outputs: [
    { key: 'tenkan', label: 'Tenkan-sen', plot: 'line', paneId: 'overlay' },
    { key: 'kijun', label: 'Kijun-sen', plot: 'line', paneId: 'overlay' },
    { key: 'senkouA', label: 'Senkou Span A', plot: 'line', paneId: 'overlay' },
    { key: 'senkouB', label: 'Senkou Span B', plot: 'line', paneId: 'overlay' },
    { key: 'chikou', label: 'Chikou Span', plot: 'line', paneId: 'overlay' },
  ],
  overlay: true,
};
export const ichimokuCompute = (
  ctx: IndicatorContext,
  p: { conversionPeriods?: number; basePeriods?: number; leadingSpanBPeriods?: number; displacement?: number }
): IndicatorComputeResult => {
  const c = p.conversionPeriods ?? 9;
  const b = p.basePeriods ?? 26;
  const lb = p.leadingSpanBPeriods ?? 52;
  const dp = p.displacement ?? 26;
  const donch = (period: number) => ctx.high.map((_, i) => {
    if (i < period - 1) return null;
    const sh = ctx.high.slice(i - period + 1, i + 1);
    const sl = ctx.low.slice(i - period + 1, i + 1);
    return (Math.max(...sh) + Math.min(...sl)) / 2;
  });
  const tenkan = donch(c);
  const kijun = donch(b);
  const senkouA = tenkan.map((v, i) =>
    v === null || kijun[i] === null ? null : (Number(v) + Number(kijun[i])) / 2
  );
  const senkouB = donch(lb);
  const chikou = ctx.close.map((_, i) => ctx.close[i + dp] ?? null);
  return { series: { tenkan, kijun, senkouA, senkouB, chikou } };
};

// =============================================================
// SUPERTREND
// =============================================================
export const supertrendDef: IndicatorDef = {
  code: 'SUPERTREND',
  name: 'Supertrend',
  category: 'trend',
  inputs: [
    { key: 'atrPeriod', label: 'ATR Period', type: 'int', default: 10, min: 2 },
    { key: 'multiplier', label: 'Multiplier', type: 'float', default: 3, min: 0.5, step: 0.1 },
    { key: 'changeATR', label: 'Use Wilder ATR', type: 'bool', default: true },
  ],
  outputs: [
    { key: 'supertrend', label: 'Supertrend', plot: 'line', paneId: 'overlay' },
    { key: 'direction', label: 'Trend Direction', plot: 'level', paneId: 'overlay' },
  ],
  overlay: true,
  tags: ['volatility-trend'],
};
export const supertrendCompute = (
  ctx: IndicatorContext,
  p: { atrPeriod?: number; multiplier?: number }
): IndicatorComputeResult => {
  const period = p.atrPeriod ?? 10;
  const mult = p.multiplier ?? 3;
  const tr: number[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i === 0) { tr.push(ctx.high[i] - ctx.low[i]); continue; }
    tr.push(Math.max(
      ctx.high[i] - ctx.low[i],
      Math.abs(ctx.high[i] - ctx.close[i - 1]),
      Math.abs(ctx.low[i] - ctx.close[i - 1])
    ));
  }
  const atr: number[] = [];
  for (let i = 0; i < tr.length; i++) {
    if (i < period - 1) { atr.push(NaN); continue; }
    if (i === period - 1) {
      atr.push(tr.slice(0, period).reduce((a, b) => a + b, 0) / period);
      continue;
    }
    atr.push((atr[i - 1] * (period - 1) + tr[i]) / period);
  }
  const hl2 = ctx.high.map((h, i) => (h + ctx.low[i]) / 2);
  const upper = hl2.map((m, i) => m + mult * atr[i]);
  const lower = hl2.map((m, i) => m - mult * atr[i]);
  const trend: number[] = []; // 1 up / -1 down
  const st: (number | null)[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i === 0) { trend.push(1); st.push(lower[i]); continue; }
    if (ctx.close[i] > st[i - 1]!) trend.push(1);
    else if (ctx.close[i] < st[i - 1]!) trend.push(-1);
    else trend.push(trend[i - 1]);
    st.push(trend[i] === 1 ? Math.max(lower[i], st[i - 1] ?? lower[i]) : Math.min(upper[i], st[i - 1] ?? upper[i]));
  }
  return { series: { supertrend: st, direction: trend.map((v) => v) } };
};

export const TREND_INDICATORS = [
  { def: emaDef, compute: emaCompute },
  { def: smaDef, compute: smaCompute },
  { def: wmaDef, compute: wmaCompute },
  { def: demaDef, compute: demaCompute },
  { def: temaDef, compute: temaCompute },
  { def: almaDef, compute: almaCompute },
  { def: kamaDef, compute: kamaCompute },
  { def: vwmaDef, compute: vwmaCompute },
  { def: macdDef, compute: macdCompute },
  { def: ichimokuDef, compute: ichimokuCompute },
  { def: supertrendDef, compute: supertrendCompute },
];
