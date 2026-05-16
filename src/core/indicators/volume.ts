/**
 * VOLUME indicators — semua param-able. Membaca data volume; wajib untuk
 * "volume confirmation" pada quant engine (Renaissance-inspired).
 */
import type { IndicatorContext, IndicatorComputeResult, IndicatorDef } from '@/domain/indicator';
import { ema as emaArr, sma as smaArr } from './math';

// =============================================================
// VWAP (rolling, session, anchored)
// =============================================================
export const vwapDef: IndicatorDef = {
  code: 'VWAP',
  name: 'Volume Weighted Average Price',
  nameId: 'VWAP',
  category: 'volume',
  needsVolume: true,
  inputs: [
    { key: 'anchor', label: 'Anchor', type: 'enum', default: 'session',
      options: [
        { value: 'session', label: 'Session' },
        { value: 'rolling', label: 'Rolling' },
        { value: 'cumulative', label: 'Cumulative (since start)' },
      ] },
    { key: 'rollingPeriod', label: 'Rolling Length', type: 'int', default: 100, min: 5 },
    { key: 'showBands', label: 'Show StdDev Bands', type: 'bool', default: true },
    { key: 'bandsMult', label: 'StdDev Multiplier', type: 'float', default: 2, min: 0.1, step: 0.1 },
  ],
  outputs: [
    { key: 'vwap', label: 'VWAP', plot: 'line', paneId: 'overlay' },
    { key: 'upper', label: 'Upper Band', plot: 'line', paneId: 'overlay' },
    { key: 'lower', label: 'Lower Band', plot: 'line', paneId: 'overlay' },
  ],
  overlay: true,
};
export const vwapCompute = (
  ctx: IndicatorContext,
  p: { anchor?: string; rollingPeriod?: number; showBands?: boolean; bandsMult?: number }
): IndicatorComputeResult => {
  const tp = ctx.high.map((h, i) => (h + ctx.low[i] + ctx.close[i]) / 3);
  const out: (number | null)[] = [];
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const mult = p.bandsMult ?? 2;

  if (p.anchor === 'rolling') {
    const period = p.rollingPeriod ?? 100;
    for (let i = 0; i < tp.length; i++) {
      if (i < period - 1) { out.push(null); upper.push(null); lower.push(null); continue; }
      let pv = 0, vv = 0;
      for (let j = i - period + 1; j <= i; j++) { pv += tp[j] * ctx.volume[j]; vv += ctx.volume[j]; }
      const v = vv === 0 ? null : pv / vv;
      out.push(v);
      if (p.showBands !== false && v !== null) {
        let sq = 0;
        for (let j = i - period + 1; j <= i; j++) sq += ctx.volume[j] * (tp[j] - v) ** 2;
        const s = vv === 0 ? 0 : Math.sqrt(sq / vv);
        upper.push(v + mult * s);
        lower.push(v - mult * s);
      } else { upper.push(null); lower.push(null); }
    }
  } else {
    let pv = 0, vv = 0, pvSq = 0;
    for (let i = 0; i < tp.length; i++) {
      pv += tp[i] * ctx.volume[i];
      vv += ctx.volume[i];
      const v = vv === 0 ? null : pv / vv;
      out.push(v);
      if (v !== null) {
        pvSq += ctx.volume[i] * (tp[i] - v) ** 2;
        const s = Math.sqrt(pvSq / vv);
        upper.push(v + mult * s);
        lower.push(v - mult * s);
      } else { upper.push(null); lower.push(null); }
    }
  }
  return { series: { vwap: out, upper, lower } };
};

// =============================================================
// OBV
// =============================================================
export const obvDef: IndicatorDef = {
  code: 'OBV',
  name: 'On Balance Volume',
  category: 'volume',
  needsVolume: true,
  inputs: [
    { key: 'showMA', label: 'Show MA', type: 'bool', default: true },
    { key: 'maLen', label: 'MA Length', type: 'int', default: 20, min: 1 },
  ],
  outputs: [
    { key: 'obv', label: 'OBV', plot: 'line', paneId: 'sub' },
    { key: 'obvMA', label: 'OBV MA', plot: 'line', paneId: 'sub' },
  ],
};
export const obvCompute = (
  ctx: IndicatorContext,
  p: { showMA?: boolean; maLen?: number }
): IndicatorComputeResult => {
  const obv: number[] = [0];
  for (let i = 1; i < ctx.close.length; i++) {
    const prev = obv[i - 1];
    if (ctx.close[i] > ctx.close[i - 1]) obv.push(prev + ctx.volume[i]);
    else if (ctx.close[i] < ctx.close[i - 1]) obv.push(prev - ctx.volume[i]);
    else obv.push(prev);
  }
  const ma = p.showMA !== false ? smaArr(obv, p.maLen ?? 20) : Array(obv.length).fill(null);
  return { series: { obv, obvMA: ma } };
};

// =============================================================
// MFI
// =============================================================
export const mfiDef: IndicatorDef = {
  code: 'MFI',
  name: 'Money Flow Index',
  category: 'volume',
  needsVolume: true,
  inputs: [
    { key: 'period', label: 'Length', type: 'int', default: 14, min: 2 },
    { key: 'overbought', label: 'Overbought', type: 'int', default: 80 },
    { key: 'oversold', label: 'Oversold', type: 'int', default: 20 },
  ],
  outputs: [{ key: 'mfi', label: 'MFI', plot: 'line', paneId: 'sub' }],
};
export const mfiCompute = (
  ctx: IndicatorContext,
  p: { period?: number; overbought?: number; oversold?: number }
): IndicatorComputeResult => {
  const period = p.period ?? 14;
  const tp = ctx.high.map((h, i) => (h + ctx.low[i] + ctx.close[i]) / 3);
  const out: (number | null)[] = [];
  for (let i = 0; i < tp.length; i++) {
    if (i < period) { out.push(null); continue; }
    let pos = 0, neg = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const prev = j > 0 ? (ctx.high[j-1] + ctx.low[j-1] + ctx.close[j-1]) / 3 : tp[j];
      const raw = tp[j] * ctx.volume[j];
      if (tp[j] > prev) pos += raw;
      else if (tp[j] < prev) neg += raw;
    }
    const ratio = neg === 0 ? 100 : pos / neg;
    out.push(100 - 100 / (1 + ratio));
  }
  return {
    series: { mfi: out },
    levels: [
      { key: 'ob', value: p.overbought ?? 80, color: '#ef4444' },
      { key: 'os', value: p.oversold ?? 20, color: '#10b981' },
    ],
  };
};

// =============================================================
// Volume Spike
// =============================================================
export const volSpikeDef: IndicatorDef = {
  code: 'VOL_SPIKE',
  name: 'Volume Spike Detector',
  category: 'volume',
  needsVolume: true,
  inputs: [
    { key: 'period', label: 'Avg Length', type: 'int', default: 20, min: 1 },
    { key: 'threshold', label: 'Multiplier', type: 'float', default: 2, min: 1, step: 0.1 },
  ],
  outputs: [
    { key: 'vol', label: 'Volume', plot: 'histogram', paneId: 'sub' },
    { key: 'avg', label: 'Avg Volume', plot: 'line', paneId: 'sub' },
    { key: 'spike', label: 'Spike Flag', plot: 'level', paneId: 'sub' },
  ],
};
export const volSpikeCompute = (
  ctx: IndicatorContext,
  p: { period?: number; threshold?: number }
): IndicatorComputeResult => {
  const period = p.period ?? 20, mult = p.threshold ?? 2;
  const avg = smaArr(ctx.volume, period);
  const spike = avg.map((a, i) => (a === null ? null : ctx.volume[i] >= (a as number) * mult ? 1 : 0));
  return { series: { vol: ctx.volume, avg, spike } };
};

// =============================================================
// CMF — Chaikin Money Flow
// =============================================================
export const cmfDef: IndicatorDef = {
  code: 'CMF',
  name: 'Chaikin Money Flow',
  category: 'volume',
  needsVolume: true,
  inputs: [{ key: 'period', label: 'Length', type: 'int', default: 20, min: 2 }],
  outputs: [{ key: 'cmf', label: 'CMF', plot: 'line', paneId: 'sub' }],
};
export const cmfCompute = (ctx: IndicatorContext, p: { period?: number }): IndicatorComputeResult => {
  const period = p.period ?? 20;
  const mfMult = ctx.high.map((h, i) => {
    const range = h - ctx.low[i];
    return range === 0 ? 0 : ((ctx.close[i] - ctx.low[i]) - (h - ctx.close[i])) / range;
  });
  const mfVol = mfMult.map((m, i) => m * ctx.volume[i]);
  const out: (number | null)[] = [];
  for (let i = 0; i < mfVol.length; i++) {
    if (i < period - 1) { out.push(null); continue; }
    let sum = 0, vol = 0;
    for (let j = i - period + 1; j <= i; j++) { sum += mfVol[j]; vol += ctx.volume[j]; }
    out.push(vol === 0 ? null : sum / vol);
  }
  return { series: { cmf: out } };
};

// =============================================================
// VOLUME PROFILE (simplified TPO bins)
// =============================================================
export const volProfileDef: IndicatorDef = {
  code: 'VOL_PROFILE',
  name: 'Volume Profile (TPO-style)',
  category: 'volume_profile',
  needsVolume: true,
  inputs: [
    { key: 'lookback', label: 'Lookback Bars', type: 'int', default: 200, min: 20 },
    { key: 'bins', label: 'Price Bins', type: 'int', default: 50, min: 5, max: 500 },
    { key: 'vaPct', label: 'Value Area %', type: 'float', default: 70, min: 50, max: 95 },
  ],
  outputs: [
    { key: 'poc', label: 'POC', plot: 'level', paneId: 'overlay' },
    { key: 'vah', label: 'VAH', plot: 'level', paneId: 'overlay' },
    { key: 'val', label: 'VAL', plot: 'level', paneId: 'overlay' },
  ],
  overlay: true,
};
export const volProfileCompute = (
  ctx: IndicatorContext,
  p: { lookback?: number; bins?: number; vaPct?: number }
): IndicatorComputeResult => {
  const lookback = Math.min(p.lookback ?? 200, ctx.close.length);
  const bins = p.bins ?? 50, vaPct = (p.vaPct ?? 70) / 100;
  const start = ctx.close.length - lookback;
  const lo = Math.min(...ctx.low.slice(start));
  const hi = Math.max(...ctx.high.slice(start));
  const binSize = (hi - lo) / bins;
  const profile = Array(bins).fill(0);
  for (let i = start; i < ctx.close.length; i++) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((ctx.close[i] - lo) / binSize)));
    profile[idx] += ctx.volume[i];
  }
  const totalVol = profile.reduce((a, b) => a + b, 0);
  let pocIdx = 0;
  for (let i = 1; i < profile.length; i++) if (profile[i] > profile[pocIdx]) pocIdx = i;
  const target = totalVol * vaPct;
  let upper = pocIdx, lower = pocIdx, acc = profile[pocIdx];
  while (acc < target && (upper < bins - 1 || lower > 0)) {
    const u = upper + 1 < bins ? profile[upper + 1] : -1;
    const l = lower - 1 >= 0 ? profile[lower - 1] : -1;
    if (u >= l) { upper++; acc += u; } else { lower--; acc += l; }
  }
  const poc = lo + (pocIdx + 0.5) * binSize;
  const vah = lo + (upper + 1) * binSize;
  const val = lo + lower * binSize;
  return {
    series: {},
    levels: [
      { key: 'poc', value: poc, label: 'POC', color: '#a855f7' },
      { key: 'vah', value: vah, label: 'VAH', color: '#3b82f6' },
      { key: 'val', value: val, label: 'VAL', color: '#3b82f6' },
    ],
    meta: { binSize, totalVol, profile },
  };
};

// =============================================================
// Williams A/D
// =============================================================
export const wadDef: IndicatorDef = {
  code: 'WAD',
  name: 'Williams Accumulation / Distribution',
  category: 'volume',
  inputs: [],
  outputs: [{ key: 'wad', label: 'A/D', plot: 'line', paneId: 'sub' }],
};
export const wadCompute = (ctx: IndicatorContext): IndicatorComputeResult => {
  const out: number[] = [0];
  for (let i = 1; i < ctx.close.length; i++) {
    const tl = Math.min(ctx.low[i], ctx.close[i - 1]);
    const th = Math.max(ctx.high[i], ctx.close[i - 1]);
    let x = 0;
    if (ctx.close[i] > ctx.close[i - 1]) x = ctx.close[i] - tl;
    else if (ctx.close[i] < ctx.close[i - 1]) x = ctx.close[i] - th;
    out.push(out[i - 1] + x);
  }
  return { series: { wad: out } };
};

export const VOLUME_INDICATORS = [
  { def: vwapDef, compute: vwapCompute },
  { def: obvDef, compute: obvCompute },
  { def: mfiDef, compute: mfiCompute },
  { def: volSpikeDef, compute: volSpikeCompute },
  { def: cmfDef, compute: cmfCompute },
  { def: volProfileDef, compute: volProfileCompute },
  { def: wadDef, compute: wadCompute },
];
