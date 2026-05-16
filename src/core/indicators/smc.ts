/**
 * Smart Money Concept (SMC) + ICT indicators — semua param-able.
 * Outputs sebagian besar berupa `boxes` (Order Block, FVG) atau `levels` (BOS line).
 */
import type { IndicatorContext, IndicatorComputeResult, IndicatorDef } from '@/domain/indicator';

// =============================================================
// ORDER BLOCKS (Bullish / Bearish)
// =============================================================
export const smcObDef: IndicatorDef = {
  code: 'SMC_OB',
  name: 'SMC Order Blocks',
  category: 'smc',
  description: 'Detect last opposing candle prior to displacement (bullish/bearish OB).',
  inputs: [
    { key: 'lookback', label: 'Lookback Bars', type: 'int', default: 200, min: 20 },
    { key: 'displacementATR', label: 'Displacement (×ATR)', type: 'float', default: 1.5, min: 0.5, step: 0.1 },
    { key: 'minOBSize', label: 'Min OB Body %', type: 'float', default: 0, min: 0, step: 0.1 },
    { key: 'showOnlyUntested', label: 'Hide Tested OB', type: 'bool', default: false },
  ],
  outputs: [{ key: 'ob', label: 'Order Blocks', plot: 'box', paneId: 'overlay' }],
  overlay: true,
};
export const smcObCompute = (
  ctx: IndicatorContext,
  p: { lookback?: number; displacementATR?: number; minOBSize?: number; showOnlyUntested?: boolean }
): IndicatorComputeResult => {
  const lb = Math.min(p.lookback ?? 200, ctx.close.length);
  const start = Math.max(2, ctx.close.length - lb);
  const dispMult = p.displacementATR ?? 1.5;
  // Compute ATR(14) baseline
  const tr: number[] = [];
  for (let i = 0; i < ctx.close.length; i++) {
    if (i === 0) { tr.push(ctx.high[i] - ctx.low[i]); continue; }
    tr.push(Math.max(ctx.high[i] - ctx.low[i], Math.abs(ctx.high[i] - ctx.close[i - 1]), Math.abs(ctx.low[i] - ctx.close[i - 1])));
  }
  const atr: number[] = [];
  for (let i = 0; i < tr.length; i++) {
    if (i < 14) { atr.push(tr.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1)); continue; }
    atr.push((atr[i - 1] * 13 + tr[i]) / 14);
  }
  const boxes: NonNullable<IndicatorComputeResult['boxes']> = [];
  for (let i = start; i < ctx.close.length - 1; i++) {
    const bodyA = Math.abs(ctx.close[i] - ctx.open[i]);
    const displ = Math.abs(ctx.close[i + 1] - ctx.close[i]);
    if (displ < dispMult * atr[i]) continue;
    // Bullish OB = last bearish candle before strong UP displacement
    if (ctx.close[i] < ctx.open[i] && ctx.close[i + 1] > ctx.high[i]) {
      boxes.push({ from: ctx.time[i], to: ctx.time[ctx.close.length - 1], top: ctx.high[i], bottom: ctx.low[i], color: 'rgba(34,197,94,0.18)', label: 'Bull OB' });
    }
    // Bearish OB = last bullish candle before strong DOWN displacement
    if (ctx.close[i] > ctx.open[i] && ctx.close[i + 1] < ctx.low[i]) {
      boxes.push({ from: ctx.time[i], to: ctx.time[ctx.close.length - 1], top: ctx.high[i], bottom: ctx.low[i], color: 'rgba(239,68,68,0.18)', label: 'Bear OB' });
    }
  }
  return { series: {}, boxes: boxes.slice(-12) };
};

// =============================================================
// FAIR VALUE GAP (FVG)
// =============================================================
export const fvgDef: IndicatorDef = {
  code: 'FVG',
  name: 'Fair Value Gap (ICT)',
  category: 'ict',
  inputs: [
    { key: 'lookback', label: 'Lookback', type: 'int', default: 200, min: 20 },
    { key: 'minSizePct', label: 'Min FVG Size %', type: 'float', default: 0, step: 0.1 },
    { key: 'hideFilled', label: 'Hide Filled', type: 'bool', default: true },
  ],
  outputs: [{ key: 'fvg', label: 'FVG Boxes', plot: 'box', paneId: 'overlay' }],
  overlay: true,
};
export const fvgCompute = (
  ctx: IndicatorContext,
  p: { lookback?: number; minSizePct?: number; hideFilled?: boolean }
): IndicatorComputeResult => {
  const lb = Math.min(p.lookback ?? 200, ctx.close.length);
  const start = Math.max(1, ctx.close.length - lb);
  const boxes: NonNullable<IndicatorComputeResult['boxes']> = [];
  for (let i = start; i < ctx.close.length - 1; i++) {
    // Bullish FVG: low[i+1] > high[i-1]
    if (ctx.low[i + 1] > ctx.high[i - 1]) {
      const top = ctx.low[i + 1], bottom = ctx.high[i - 1];
      const sizePct = ((top - bottom) / ctx.close[i]) * 100;
      if (sizePct >= (p.minSizePct ?? 0)) {
        const filled = ctx.low.slice(i + 2).some((l) => l <= bottom);
        if (!p.hideFilled || !filled) {
          boxes.push({ from: ctx.time[i], to: ctx.time[ctx.close.length - 1], top, bottom, color: 'rgba(34,197,94,0.16)', label: 'Bull FVG' });
        }
      }
    }
    // Bearish FVG: high[i+1] < low[i-1]
    if (ctx.high[i + 1] < ctx.low[i - 1]) {
      const top = ctx.low[i - 1], bottom = ctx.high[i + 1];
      const sizePct = ((top - bottom) / ctx.close[i]) * 100;
      if (sizePct >= (p.minSizePct ?? 0)) {
        const filled = ctx.high.slice(i + 2).some((h) => h >= top);
        if (!p.hideFilled || !filled) {
          boxes.push({ from: ctx.time[i], to: ctx.time[ctx.close.length - 1], top, bottom, color: 'rgba(239,68,68,0.16)', label: 'Bear FVG' });
        }
      }
    }
  }
  return { series: {}, boxes: boxes.slice(-20) };
};

// =============================================================
// BOS / CHoCH
// =============================================================
export const bosDef: IndicatorDef = {
  code: 'SMC_BOS',
  name: 'SMC BOS / CHoCH',
  category: 'smc',
  inputs: [
    { key: 'swingLen', label: 'Swing Length', type: 'int', default: 5, min: 1, max: 50 },
  ],
  outputs: [
    { key: 'bos', label: 'BOS lines', plot: 'level', paneId: 'overlay' },
  ],
  overlay: true,
};
export const bosCompute = (
  ctx: IndicatorContext,
  p: { swingLen?: number }
): IndicatorComputeResult => {
  const k = p.swingLen ?? 5;
  const swingHighs: { idx: number; price: number }[] = [];
  const swingLows: { idx: number; price: number }[] = [];
  for (let i = k; i < ctx.high.length - k; i++) {
    const sliceH = ctx.high.slice(i - k, i + k + 1);
    const sliceL = ctx.low.slice(i - k, i + k + 1);
    if (ctx.high[i] === Math.max(...sliceH)) swingHighs.push({ idx: i, price: ctx.high[i] });
    if (ctx.low[i] === Math.min(...sliceL)) swingLows.push({ idx: i, price: ctx.low[i] });
  }
  const markers: NonNullable<IndicatorComputeResult['markers']> = [];
  const lastSH = swingHighs[swingHighs.length - 1];
  const lastSL = swingLows[swingLows.length - 1];
  if (lastSH) markers.push({ time: ctx.time[lastSH.idx], price: lastSH.price, type: 'sell', text: 'SH' });
  if (lastSL) markers.push({ time: ctx.time[lastSL.idx], price: lastSL.price, type: 'buy', text: 'SL' });
  return {
    series: {},
    levels: [
      lastSH ? { key: 'sh', value: lastSH.price, label: 'Swing High', color: '#ef4444' } : null,
      lastSL ? { key: 'sl', value: lastSL.price, label: 'Swing Low', color: '#10b981' } : null,
    ].filter(Boolean) as NonNullable<IndicatorComputeResult['levels']>,
    markers,
    meta: { swingHighs: swingHighs.slice(-10), swingLows: swingLows.slice(-10) },
  };
};

// =============================================================
// ICT OTE (62-79% retracement zone)
// =============================================================
export const oteDef: IndicatorDef = {
  code: 'ICT_OTE',
  name: 'ICT Optimal Trade Entry (OTE)',
  category: 'ict',
  inputs: [
    { key: 'lookback', label: 'Lookback', type: 'int', default: 80, min: 10 },
    { key: 'lo', label: 'OTE Low', type: 'float', default: 0.62, step: 0.01, min: 0 },
    { key: 'hi', label: 'OTE High', type: 'float', default: 0.79, step: 0.01, min: 0 },
  ],
  outputs: [{ key: 'ote', label: 'OTE Zone', plot: 'box', paneId: 'overlay' }],
  overlay: true,
};
export const oteCompute = (
  ctx: IndicatorContext,
  p: { lookback?: number; lo?: number; hi?: number }
): IndicatorComputeResult => {
  const lb = Math.min(p.lookback ?? 80, ctx.close.length);
  const start = ctx.close.length - lb;
  const hh = Math.max(...ctx.high.slice(start));
  const ll = Math.min(...ctx.low.slice(start));
  const idxH = ctx.high.lastIndexOf(hh);
  const idxL = ctx.low.lastIndexOf(ll);
  const long = idxH > idxL;
  const range = hh - ll;
  const lo = p.lo ?? 0.62, hi = p.hi ?? 0.79;
  const top = long ? hh - range * lo : ll + range * hi;
  const bottom = long ? hh - range * hi : ll + range * lo;
  return {
    series: {},
    boxes: [{
      from: ctx.time[Math.max(idxH, idxL)],
      to: ctx.time[ctx.close.length - 1],
      top: Math.max(top, bottom),
      bottom: Math.min(top, bottom),
      color: long ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
      label: long ? 'OTE Long' : 'OTE Short',
    }],
    meta: { direction: long ? 'long' : 'short' },
  };
};

// =============================================================
// LIQUIDITY POOLS (EQH / EQL)
// =============================================================
export const liquidityDef: IndicatorDef = {
  code: 'SMC_LIQUIDITY',
  name: 'SMC Liquidity Pools (EQH/EQL)',
  category: 'smc',
  inputs: [
    { key: 'tolerance', label: 'Tolerance %', type: 'float', default: 0.05, min: 0.01, step: 0.01 },
    { key: 'lookback', label: 'Lookback', type: 'int', default: 200, min: 20 },
    { key: 'minTouches', label: 'Min Touches', type: 'int', default: 2, min: 2 },
  ],
  outputs: [{ key: 'liq', label: 'Liquidity Lines', plot: 'level', paneId: 'overlay' }],
  overlay: true,
};
export const liquidityCompute = (
  ctx: IndicatorContext,
  p: { tolerance?: number; lookback?: number; minTouches?: number }
): IndicatorComputeResult => {
  const tol = p.tolerance ?? 0.05;
  const lb = Math.min(p.lookback ?? 200, ctx.close.length);
  const minTouch = p.minTouches ?? 2;
  const start = ctx.close.length - lb;
  const highs = ctx.high.slice(start);
  const lows = ctx.low.slice(start);
  const buckets: { price: number; count: number; side: 'high' | 'low' }[] = [];
  const place = (price: number, side: 'high' | 'low') => {
    const existing = buckets.find((b) => Math.abs(b.price - price) / price < tol / 100 && b.side === side);
    if (existing) { existing.count++; existing.price = (existing.price + price) / 2; }
    else buckets.push({ price, count: 1, side });
  };
  highs.forEach((h) => place(h, 'high'));
  lows.forEach((l) => place(l, 'low'));
  const pools = buckets.filter((b) => b.count >= minTouch).slice(-10);
  return {
    series: {},
    levels: pools.map((b, i) => ({
      key: `liq_${i}`,
      value: b.price,
      label: b.side === 'high' ? `EQH ×${b.count}` : `EQL ×${b.count}`,
      color: b.side === 'high' ? '#ef4444' : '#10b981',
    })),
  };
};

// =============================================================
// ICT KILLZONES (London / NY / Asia)
// =============================================================
export const killzoneDef: IndicatorDef = {
  code: 'ICT_KILLZONE',
  name: 'ICT Killzones',
  category: 'ict',
  inputs: [
    { key: 'asia', label: 'Asia (UTC h-h)', type: 'enum', default: '0-4' },
    { key: 'london', label: 'London (UTC h-h)', type: 'enum', default: '7-11' },
    { key: 'ny', label: 'New York (UTC h-h)', type: 'enum', default: '12-16' },
  ],
  outputs: [{ key: 'kz', label: 'Killzones', plot: 'box', paneId: 'overlay' }],
  overlay: true,
};
export const killzoneCompute = (
  ctx: IndicatorContext,
  p: { asia?: string; london?: string; ny?: string }
): IndicatorComputeResult => {
  const parse = (s: string): [number, number] => {
    const [a, b] = s.split('-').map(Number);
    return [a, b];
  };
  const sessions = [
    { name: 'Asia', range: parse(p.asia ?? '0-4'), color: 'rgba(168,85,247,0.10)' },
    { name: 'London', range: parse(p.london ?? '7-11'), color: 'rgba(59,130,246,0.10)' },
    { name: 'NY', range: parse(p.ny ?? '12-16'), color: 'rgba(245,158,11,0.10)' },
  ];
  const boxes: NonNullable<IndicatorComputeResult['boxes']> = [];
  let activeBox: { from: number; to: number; label: string; color: string; highs: number[]; lows: number[] } | null = null;
  for (let i = 0; i < ctx.time.length; i++) {
    const h = new Date(ctx.time[i]).getUTCHours();
    const session = sessions.find((s) => h >= s.range[0] && h < s.range[1]);
    if (session) {
      if (!activeBox || activeBox.label !== session.name) {
        if (activeBox) boxes.push({ from: activeBox.from, to: activeBox.to, top: Math.max(...activeBox.highs), bottom: Math.min(...activeBox.lows), color: activeBox.color, label: activeBox.label });
        activeBox = { from: ctx.time[i], to: ctx.time[i], label: session.name, color: session.color, highs: [ctx.high[i]], lows: [ctx.low[i]] };
      } else {
        activeBox.to = ctx.time[i];
        activeBox.highs.push(ctx.high[i]);
        activeBox.lows.push(ctx.low[i]);
      }
    } else if (activeBox) {
      boxes.push({ from: activeBox.from, to: activeBox.to, top: Math.max(...activeBox.highs), bottom: Math.min(...activeBox.lows), color: activeBox.color, label: activeBox.label });
      activeBox = null;
    }
  }
  if (activeBox) boxes.push({ from: activeBox.from, to: activeBox.to, top: Math.max(...activeBox.highs), bottom: Math.min(...activeBox.lows), color: activeBox.color, label: activeBox.label });
  return { series: {}, boxes: boxes.slice(-9) };
};

export const SMC_INDICATORS = [
  { def: smcObDef, compute: smcObCompute },
  { def: fvgDef, compute: fvgCompute },
  { def: bosDef, compute: bosCompute },
  { def: oteDef, compute: oteCompute },
  { def: liquidityDef, compute: liquidityCompute },
  { def: killzoneDef, compute: killzoneCompute },
];
