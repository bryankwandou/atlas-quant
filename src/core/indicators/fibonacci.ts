/**
 * FIBONACCI / RR PROJECTION indicators — semua param-able.
 *
 * Highlight: SMC_RR_FIB → Risk-Reward Fibonacci ala setup TradingView SMC
 * dengan default level [-0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].
 *
 * Logic auto-pivot:
 *   - Auto-detect swing high & swing low pada N-bar terakhir,
 *     pivot ditentukan oleh arah (BUY/SELL) atau "auto".
 *   - Hitung anchor harga A (= 0) dan B (= 1).
 *   - Generate semua level Fib + projection target (TP1/TP2/TP3) +
 *     SL premium (-0.5) dan max risk (-1).
 *   - Output `levels[]` siap di-plot sebagai horizontal lines.
 */
import type { IndicatorContext, IndicatorComputeResult, IndicatorDef } from '@/domain/indicator';

// =============================================================
// CLASSIC RETRACEMENT
// =============================================================
export const fibRetracementDef: IndicatorDef = {
  code: 'FIB_RETRACE',
  name: 'Fibonacci Retracement',
  nameId: 'Fibonacci Retracement',
  category: 'fibonacci',
  inputs: [
    { key: 'autoPivot', label: 'Auto-detect Pivot', type: 'bool', default: true },
    { key: 'lookback', label: 'Lookback Bars', type: 'int', default: 50, min: 10 },
    { key: 'direction', label: 'Direction', type: 'enum', default: 'auto',
      options: [{ value: 'auto', label: 'Auto' }, { value: 'long', label: 'Long' }, { value: 'short', label: 'Short' }] },
    { key: 'levels', label: 'Levels', type: 'levels', default: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2.618] },
    { key: 'colorPos', label: 'Pos Level Color', type: 'color', default: '#16a34a' },
    { key: 'colorNeg', label: 'Neg Level Color', type: 'color', default: '#dc2626' },
  ],
  outputs: [{ key: 'fib', label: 'Fib Levels', plot: 'level', paneId: 'overlay' }],
  overlay: true,
};
export const fibRetracementCompute = (
  ctx: IndicatorContext,
  p: { autoPivot?: boolean; lookback?: number; direction?: 'auto' | 'long' | 'short'; levels?: number[] }
): IndicatorComputeResult => {
  const lb = Math.min(p.lookback ?? 50, ctx.close.length);
  const start = ctx.close.length - lb;
  const hh = Math.max(...ctx.high.slice(start));
  const ll = Math.min(...ctx.low.slice(start));
  const idxHi = ctx.high.lastIndexOf(hh);
  const idxLo = ctx.low.lastIndexOf(ll);
  // Direction: if hi formed AFTER lo => up-leg (Long), else down-leg (Short)
  const dir = p.direction === 'auto'
    ? (idxHi > idxLo ? 'long' : 'short')
    : (p.direction ?? 'long');
  const anchorLow = dir === 'long' ? ll : hh; // = 0 untuk long
  const anchorHigh = dir === 'long' ? hh : ll; // = 1 untuk long
  const range = anchorHigh - anchorLow;
  const levels = (p.levels ?? [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]).map((lv) => ({
    key: `fib_${lv}`,
    value: anchorLow + range * lv,
    label: `${(lv * 100).toFixed(1)}%`,
    color: lv === 0 ? '#94a3b8' : lv === 1 ? '#94a3b8' : (lv > 1 || lv < 0) ? '#dc2626' : '#16a34a',
  }));
  return { series: {}, levels, meta: { dir, hh, ll, range, idxHi, idxLo } };
};

// =============================================================
// SMC RR FIBONACCI (-0.5 → 3.5)
// Setup persis seperti screenshot user — RR Risk-Reward Fibonacci untuk SMC.
// Level: -0.5 (premium SL), 0 (swing low/high), 0.5 (entry zone),
//        1 (anchor opposite), 1.5/2/2.5/3/3.5 (TP projections).
// =============================================================
export const smcRrFibDef: IndicatorDef = {
  code: 'SMC_RR_FIB',
  name: 'SMC Risk-Reward Fibonacci',
  nameId: 'Fibonacci RR SMC',
  category: 'fibonacci',
  subCategory: 'SMC',
  description: 'Custom Fib for SMC RR planning. Levels: -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5. Auto-anchored to recent swing low/high; computes RR for each TP.',
  descriptionId: 'Fibonacci khusus untuk perencanaan Risk-Reward gaya SMC. Level: -0.5, 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5. Otomatis dianchor ke swing low/high terakhir; menghitung RR setiap TP.',
  formula: 'price(level) = anchor + (opposite − anchor) * level',
  inputs: [
    { key: 'lookback', label: 'Swing Lookback', labelId: 'Lookback Swing', type: 'int', default: 60, min: 10, max: 500 },
    { key: 'direction', label: 'Direction', labelId: 'Arah', type: 'enum', default: 'auto',
      options: [
        { value: 'auto', label: 'Auto (latest leg)' },
        { value: 'long', label: 'Long (Buy)' },
        { value: 'short', label: 'Short (Sell)' },
      ] },
    { key: 'entryLevel', label: 'Entry Fib Level', type: 'float', default: 0.5, min: 0, max: 1, step: 0.001 },
    { key: 'slLevel', label: 'Stop Loss Fib Level', type: 'float', default: -0.5, min: -2, max: 0.5, step: 0.001 },
    { key: 'tpLevels', label: 'Take Profit Levels', type: 'levels', default: [1, 1.5, 2, 2.5, 3, 3.5] },
    { key: 'extraLevels', label: 'Extra Levels', type: 'levels', default: [0, 0.5] },
    { key: 'colorPremium', label: 'Premium (SL) Color', type: 'color', default: '#ef4444' },
    { key: 'colorEntry', label: 'Entry Color', type: 'color', default: '#fbbf24' },
    { key: 'colorTP', label: 'TP Color', type: 'color', default: '#10b981' },
    { key: 'showRR', label: 'Annotate RR', type: 'bool', default: true },
  ],
  outputs: [
    { key: 'sl', label: 'Stop Loss', plot: 'level', paneId: 'overlay' },
    { key: 'entry', label: 'Entry', plot: 'level', paneId: 'overlay' },
    { key: 'tp', label: 'Take Profit Targets', plot: 'level', paneId: 'overlay' },
    { key: 'rr', label: 'RR Annotation', plot: 'level', paneId: 'overlay' },
  ],
  overlay: true,
  tags: ['smc', 'fibonacci', 'risk-reward'],
};

export const smcRrFibCompute = (
  ctx: IndicatorContext,
  p: {
    lookback?: number;
    direction?: 'auto' | 'long' | 'short';
    entryLevel?: number;
    slLevel?: number;
    tpLevels?: number[];
    extraLevels?: number[];
    showRR?: boolean;
  }
): IndicatorComputeResult => {
  const lb = Math.min(p.lookback ?? 60, ctx.close.length);
  if (lb < 5) return { series: {}, levels: [] };
  const start = ctx.close.length - lb;

  // Identify latest swing high & swing low within lookback window
  const highSlice = ctx.high.slice(start);
  const lowSlice = ctx.low.slice(start);
  const hh = Math.max(...highSlice);
  const ll = Math.min(...lowSlice);
  const idxHiGlobal = ctx.high.lastIndexOf(hh);
  const idxLoGlobal = ctx.low.lastIndexOf(ll);

  // Direction: if HH formed AFTER LL → swing up (LONG bias)
  const dir = p.direction === 'auto'
    ? (idxHiGlobal > idxLoGlobal ? 'long' : 'short')
    : (p.direction ?? 'long');

  // Anchor 0 = swing extreme that just printed (low for long, high for short)
  // Anchor 1 = opposite extreme that bounded the move
  const a0 = dir === 'long' ? ll : hh;
  const a1 = dir === 'long' ? hh : ll;
  const a0Idx = dir === 'long' ? idxLoGlobal : idxHiGlobal;
  const a1Idx = dir === 'long' ? idxHiGlobal : idxLoGlobal;
  const range = a1 - a0;

  const priceAt = (level: number) => a0 + range * level;
  const colorFor = (level: number) => {
    if (level <= 0) return '#ef4444';     // SL / premium zone
    if (level < 1) return '#fbbf24';      // entry zone (discount/equilibrium)
    if (level === 1) return '#94a3b8';    // anchor 1
    return '#10b981';                     // TP / projection
  };

  const slLevel = p.slLevel ?? -0.5;
  const entryLevel = p.entryLevel ?? 0.5;
  const tpLevels = p.tpLevels ?? [1, 1.5, 2, 2.5, 3, 3.5];
  const extras = p.extraLevels ?? [];

  // Build level set, dedupe by value
  const seen = new Set<number>();
  const allLevels: Array<{ level: number; role: 'sl' | 'entry' | 'tp' | 'extra' }> = [];
  const push = (level: number, role: 'sl' | 'entry' | 'tp' | 'extra') => {
    if (seen.has(level)) return;
    seen.add(level);
    allLevels.push({ level, role });
  };
  push(slLevel, 'sl');
  push(entryLevel, 'entry');
  tpLevels.forEach((l) => push(l, 'tp'));
  extras.forEach((l) => push(l, 'extra'));

  const entryPrice = priceAt(entryLevel);
  const slPrice = priceAt(slLevel);
  const slDistance = Math.abs(entryPrice - slPrice);

  const annotatedLevels = allLevels.map(({ level, role }) => {
    const price = priceAt(level);
    let label = `${level >= 0 ? '+' : ''}${level.toFixed(3)} (${price.toFixed(4)})`;
    if (role === 'sl') label = `SL ${level} → ${price.toFixed(4)}`;
    if (role === 'entry') label = `ENTRY ${level} → ${price.toFixed(4)}`;
    if (role === 'tp') {
      const rr = slDistance === 0 ? 0 : Math.abs(price - entryPrice) / slDistance;
      label = `TP ${level} → ${price.toFixed(4)}${p.showRR !== false ? ` (RR ${rr.toFixed(2)})` : ''}`;
    }
    return {
      key: `smcfib_${level}`,
      value: price,
      label,
      color: role === 'sl' ? '#ef4444'
           : role === 'entry' ? '#fbbf24'
           : role === 'tp' ? '#10b981'
           : colorFor(level),
    };
  });

  const tpPrices = tpLevels.map(priceAt);
  const rrPerTp = tpPrices.map((tp) => (slDistance === 0 ? 0 : Math.abs(tp - entryPrice) / slDistance));

  return {
    series: {},
    levels: annotatedLevels,
    meta: {
      direction: dir,
      anchorLow: a0,
      anchorHigh: a1,
      anchorLowIdx: a0Idx,
      anchorHighIdx: a1Idx,
      range,
      entryPrice,
      slPrice,
      slDistance,
      tpPrices,
      rrPerTp,
      bestRR: Math.max(...rrPerTp),
    },
  };
};

// =============================================================
// FIB EXTENSION (3-point projection)
// =============================================================
export const fibExtensionDef: IndicatorDef = {
  code: 'FIB_EXT',
  name: 'Fibonacci Extension (3-point)',
  category: 'fibonacci',
  inputs: [
    { key: 'lookback', label: 'Lookback', type: 'int', default: 80, min: 20 },
    { key: 'levels', label: 'Extension Levels', type: 'levels', default: [0, 0.382, 0.618, 1, 1.272, 1.414, 1.618, 2, 2.618, 3.618, 4.236] },
  ],
  outputs: [{ key: 'fibext', label: 'Fib Ext Levels', plot: 'level', paneId: 'overlay' }],
  overlay: true,
};
export const fibExtensionCompute = (
  ctx: IndicatorContext,
  p: { lookback?: number; levels?: number[] }
): IndicatorComputeResult => {
  const lb = Math.min(p.lookback ?? 80, ctx.close.length);
  const start = ctx.close.length - lb;
  const slice = ctx.close.slice(start);
  // 3-point: A=first, B=hh, C=last (simplified)
  const A = slice[0];
  const B = Math.max(...slice);
  const C = slice[slice.length - 1];
  const range = B - A;
  const levels = (p.levels ?? [0, 0.382, 0.618, 1, 1.618, 2.618]).map((lv) => ({
    key: `fext_${lv}`,
    value: C + range * lv,
    label: `${lv}`,
    color: lv > 1 ? '#3b82f6' : '#a855f7',
  }));
  return { series: {}, levels, meta: { A, B, C, range } };
};

// =============================================================
// FIB TIME ZONES (placeholder for time-axis lines on chart)
// =============================================================
export const fibTimeDef: IndicatorDef = {
  code: 'FIB_TIME',
  name: 'Fibonacci Time Zones',
  category: 'fibonacci',
  inputs: [
    { key: 'startIdx', label: 'Start Bar Offset (from end)', type: 'int', default: 100, min: 5 },
    { key: 'sequence', label: 'Fibonacci Sequence', type: 'levels', default: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89] },
  ],
  outputs: [{ key: 'timezones', label: 'Time Zones', plot: 'level', paneId: 'overlay' }],
  overlay: true,
};
export const fibTimeCompute = (
  ctx: IndicatorContext,
  p: { startIdx?: number; sequence?: number[] }
): IndicatorComputeResult => {
  const baseIdx = Math.max(0, ctx.close.length - (p.startIdx ?? 100));
  const seq = p.sequence ?? [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
  return {
    series: {},
    levels: [],
    meta: {
      timeZones: seq.map((n) => ({
        index: baseIdx + n,
        time: ctx.time[baseIdx + n] ?? null,
      })),
    },
  };
};

export const FIBONACCI_INDICATORS = [
  { def: fibRetracementDef, compute: fibRetracementCompute },
  { def: smcRrFibDef, compute: smcRrFibCompute },
  { def: fibExtensionDef, compute: fibExtensionCompute },
  { def: fibTimeDef, compute: fibTimeCompute },
];
