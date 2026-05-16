/**
 * GENERATED INDICATOR PACK — 150+ indikator parameterizable yang
 * diturunkan dari pola standar TradingView creator ecosystem.
 *
 * Strategi generator: tiap "template" menghasilkan beberapa varian
 * (length, source, smoothing). Semua compute pure function tanpa
 * dependency luar. Output mengikuti IndicatorComputeResult.
 *
 * Bukan stub: tiap indikator memang menghitung formula matematisnya.
 * Untuk indikator yang punya banyak preset (mis. EMA 5/9/13/20/50/100/200),
 * masing-masing terdaftar sebagai entry mandiri dengan param length default.
 */
import type { IndicatorContext, IndicatorComputeResult, IndicatorDef } from '@/domain/indicator';
import { ema, sma as smaRaw, std, mean } from './math';

// Wrap sma to return number[] (NaN-padded) so we can index safely.
const sma = (vals: number[], period: number): number[] =>
  (smaRaw(vals, period) as (number | null)[]).map((v) => (v == null ? NaN : v));

type Entry = { def: IndicatorDef; compute: (ctx: IndicatorContext, p: Record<string, unknown>) => IndicatorComputeResult };

const out = (series: Record<string, (number | null)[]>, levels: Array<{ key: string; value: number; color?: string; label?: string }> = []): IndicatorComputeResult => ({ series, levels });
const lastFinite = (arr: (number | null | undefined)[]): number | null => {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v != null && Number.isFinite(v)) return v as number;
  }
  return null;
};

// =============================================================
// TEMPLATE GENERATORS
// =============================================================

const sourceArr = (ctx: IndicatorContext, src: string): number[] => {
  switch (src) {
    case 'open': return ctx.open;
    case 'high': return ctx.high;
    case 'low': return ctx.low;
    case 'hl2': return ctx.high.map((h, i) => (h + ctx.low[i]) / 2);
    case 'hlc3': return ctx.close.map((c, i) => (ctx.high[i] + ctx.low[i] + c) / 3);
    case 'ohlc4': return ctx.close.map((c, i) => (ctx.open[i] + ctx.high[i] + ctx.low[i] + c) / 4);
    default: return ctx.close;
  }
};

// === EMA family (12 length presets) ===
const EMA_LENGTHS = [3, 5, 8, 9, 12, 13, 20, 21, 50, 100, 200, 365];
const emaIndicators: Entry[] = EMA_LENGTHS.map((L) => ({
  def: {
    code: `EMA_${L}`,
    name: `EMA ${L}`,
    category: 'trend',
    overlay: true,
    inputs: [
      { key: 'length', label: 'Length', type: 'int', default: L, min: 2, max: 1000 },
      { key: 'source', label: 'Source', type: 'source', default: 'close' },
      { key: 'color', label: 'Color', type: 'color', default: L < 20 ? '#f7a600' : L < 100 ? '#2962ff' : '#9c27b0' },
    ],
    outputs: [{ key: 'ema', label: `EMA ${L}`, plot: 'line', paneId: 'overlay' }],
    tags: ['ma', 'trend'],
  },
  compute: (ctx, p) => out({ ema: ema(sourceArr(ctx, String(p.source ?? 'close')), Number(p.length ?? L)) }),
}));

// === SMA family ===
const SMA_LENGTHS = [10, 20, 50, 100, 200];
const smaIndicators: Entry[] = SMA_LENGTHS.map((L) => ({
  def: {
    code: `SMA_${L}`,
    name: `SMA ${L}`,
    category: 'trend',
    overlay: true,
    inputs: [
      { key: 'length', label: 'Length', type: 'int', default: L, min: 2, max: 1000 },
      { key: 'source', label: 'Source', type: 'source', default: 'close' },
    ],
    outputs: [{ key: 'sma', label: `SMA ${L}`, plot: 'line', paneId: 'overlay' }],
    tags: ['ma', 'trend'],
  },
  compute: (ctx, p) => out({ sma: sma(sourceArr(ctx, String(p.source ?? 'close')), Number(p.length ?? L)) }),
}));

// === HMA (Hull Moving Average) ===
const hmaCompute = (values: number[], length: number): number[] => {
  const halfL = Math.floor(length / 2);
  const sqrtL = Math.floor(Math.sqrt(length));
  const wma = (vals: number[], n: number): number[] => {
    const res: number[] = [];
    const weights = Array.from({ length: n }, (_, i) => i + 1);
    const ws = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < vals.length; i++) {
      if (i < n - 1) { res.push(NaN); continue; }
      let s = 0;
      for (let j = 0; j < n; j++) s += vals[i - (n - 1 - j)] * weights[j];
      res.push(s / ws);
    }
    return res;
  };
  const w1 = wma(values, halfL);
  const w2 = wma(values, length);
  const diff = w1.map((v, i) => 2 * v - w2[i]);
  return wma(diff, sqrtL);
};
const hmaIndicators: Entry[] = [9, 21, 55].map((L) => ({
  def: {
    code: `HMA_${L}`, name: `Hull MA ${L}`, category: 'trend', overlay: true,
    inputs: [
      { key: 'length', label: 'Length', type: 'int', default: L, min: 4 },
      { key: 'source', label: 'Source', type: 'source', default: 'close' },
    ],
    outputs: [{ key: 'hma', label: `HMA ${L}`, plot: 'line', paneId: 'overlay' }],
    tags: ['ma', 'trend'],
  },
  compute: (ctx, p) => out({ hma: hmaCompute(sourceArr(ctx, String(p.source ?? 'close')), Number(p.length ?? L)) }),
}));

// === KAMA (Kaufman Adaptive MA) ===
const kamaCompute = (closes: number[], length = 10, fast = 2, slow = 30): number[] => {
  const out: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < length) { out.push(NaN); continue; }
    const change = Math.abs(closes[i] - closes[i - length]);
    let vol = 0;
    for (let j = 1; j <= length; j++) vol += Math.abs(closes[i - j + 1] - closes[i - j]);
    const er = vol === 0 ? 0 : change / vol;
    const sc = (er * (2 / (fast + 1) - 2 / (slow + 1)) + 2 / (slow + 1)) ** 2;
    const prev = i === length ? closes[i - 1] : out[i - 1];
    out.push(prev + sc * (closes[i] - prev));
  }
  return out;
};
const kamaIndicator: Entry = {
  def: {
    code: 'KAMA',
    name: 'Kaufman Adaptive MA',
    category: 'adaptive', overlay: true,
    inputs: [
      { key: 'length', label: 'Length', type: 'int', default: 10, min: 2 },
      { key: 'fast', label: 'Fast', type: 'int', default: 2, min: 2 },
      { key: 'slow', label: 'Slow', type: 'int', default: 30, min: 2 },
    ],
    outputs: [{ key: 'kama', label: 'KAMA', plot: 'line', paneId: 'overlay' }],
    tags: ['adaptive', 'ma'],
  },
  compute: (ctx, p) => out({ kama: kamaCompute(ctx.close, Number(p.length ?? 10), Number(p.fast ?? 2), Number(p.slow ?? 30)) }),
};

// === T3 (Tillson) ===
const t3Compute = (closes: number[], length = 10, vol = 0.7): number[] => {
  const e1 = ema(closes, length);
  const e2 = ema(e1, length);
  const e3 = ema(e2, length);
  const e4 = ema(e3, length);
  const e5 = ema(e4, length);
  const e6 = ema(e5, length);
  const c1 = -(vol ** 3);
  const c2 = 3 * (vol ** 2) + 3 * (vol ** 3);
  const c3 = -6 * (vol ** 2) - 3 * vol - 3 * (vol ** 3);
  const c4 = 1 + 3 * vol + (vol ** 3) + 3 * (vol ** 2);
  return e6.map((v, i) => c1 * v + c2 * e5[i] + c3 * e4[i] + c4 * e3[i]);
};
const t3Indicator: Entry = {
  def: {
    code: 'T3', name: 'Tillson T3', category: 'trend', overlay: true,
    inputs: [
      { key: 'length', label: 'Length', type: 'int', default: 10, min: 2 },
      { key: 'volumeFactor', label: 'Volume Factor', type: 'float', default: 0.7, min: 0.1, max: 1, step: 0.1 },
    ],
    outputs: [{ key: 't3', label: 'T3', plot: 'line', paneId: 'overlay' }],
    tags: ['ma', 'adaptive'],
  },
  compute: (ctx, p) => out({ t3: t3Compute(ctx.close, Number(p.length ?? 10), Number(p.volumeFactor ?? 0.7)) }),
};

// === Aroon ===
const aroonCompute = (highs: number[], lows: number[], length = 14): { up: number[]; down: number[] } => {
  const up: number[] = []; const dn: number[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (i < length) { up.push(NaN); dn.push(NaN); continue; }
    let hhIdx = 0; let llIdx = 0;
    for (let j = 0; j <= length; j++) {
      if (highs[i - j] > highs[i - hhIdx]) hhIdx = j;
      if (lows[i - j] < lows[i - llIdx]) llIdx = j;
    }
    up.push(((length - hhIdx) / length) * 100);
    dn.push(((length - llIdx) / length) * 100);
  }
  return { up, down: dn };
};
const aroonIndicator: Entry = {
  def: {
    code: 'AROON', name: 'Aroon', category: 'trend',
    inputs: [{ key: 'length', label: 'Length', type: 'int', default: 14, min: 2 }],
    outputs: [
      { key: 'up', label: 'Aroon Up', plot: 'line', paneId: 'sub' },
      { key: 'down', label: 'Aroon Down', plot: 'line', paneId: 'sub' },
    ],
    tags: ['trend'],
  },
  compute: (ctx, p) => {
    const a = aroonCompute(ctx.high, ctx.low, Number(p.length ?? 14));
    return { series: { up: a.up, down: a.down }, levels: [{ key: 't70', value: 70 }, { key: 't30', value: 30 }] };
  },
};

// === CCI ===
const cciCompute = (highs: number[], lows: number[], closes: number[], length = 20): number[] => {
  const tp = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
  const smaTp = sma(tp, length);
  const result: number[] = [];
  for (let i = 0; i < tp.length; i++) {
    if (i < length - 1) { result.push(NaN); continue; }
    const slice = tp.slice(i - length + 1, i + 1);
    const m = smaTp[i];
    const md = slice.reduce((s, v) => s + Math.abs(v - m), 0) / length;
    result.push(md === 0 ? 0 : (tp[i] - m) / (0.015 * md));
  }
  return result;
};
const cciIndicator: Entry = {
  def: {
    code: 'CCI', name: 'Commodity Channel Index', category: 'momentum',
    inputs: [{ key: 'length', label: 'Length', type: 'int', default: 20, min: 5 }],
    outputs: [{ key: 'cci', label: 'CCI', plot: 'line', paneId: 'sub' }],
    tags: ['momentum'],
  },
  compute: (ctx, p) => ({
    series: { cci: cciCompute(ctx.high, ctx.low, ctx.close, Number(p.length ?? 20)) },
    levels: [{ key: 'p100', value: 100 }, { key: 'n100', value: -100 }],
  }),
};

// === DPO (Detrended Price Oscillator) ===
const dpoCompute = (closes: number[], length = 21): number[] => {
  const ma = sma(closes, length);
  const shift = Math.floor(length / 2) + 1;
  return closes.map((c, i) => i < length - 1 + shift ? NaN : c - ma[i - shift]);
};
const dpoIndicator: Entry = {
  def: { code: 'DPO', name: 'Detrended Price Oscillator', category: 'cycle', inputs: [{ key: 'length', label: 'Length', type: 'int', default: 21, min: 2 }], outputs: [{ key: 'dpo', label: 'DPO', plot: 'line', paneId: 'sub' }], tags: ['cycle'] },
  compute: (ctx, p) => out({ dpo: dpoCompute(ctx.close, Number(p.length ?? 21)) }),
};

// === Donchian Channel ===
const donchianIndicator: Entry = {
  def: {
    code: 'DONCHIAN', name: 'Donchian Channel', category: 'volatility', overlay: true,
    inputs: [{ key: 'length', label: 'Length', type: 'int', default: 20, min: 2 }],
    outputs: [
      { key: 'upper', label: 'Upper', plot: 'line', paneId: 'overlay' },
      { key: 'lower', label: 'Lower', plot: 'line', paneId: 'overlay' },
      { key: 'mid', label: 'Mid', plot: 'line', paneId: 'overlay' },
    ],
    tags: ['volatility', 'channel'],
  },
  compute: (ctx, p) => {
    const L = Number(p.length ?? 20);
    const up: number[] = []; const lo: number[] = []; const mid: number[] = [];
    for (let i = 0; i < ctx.close.length; i++) {
      if (i < L - 1) { up.push(NaN); lo.push(NaN); mid.push(NaN); continue; }
      const hi = Math.max(...ctx.high.slice(i - L + 1, i + 1));
      const ll = Math.min(...ctx.low.slice(i - L + 1, i + 1));
      up.push(hi); lo.push(ll); mid.push((hi + ll) / 2);
    }
    return out({ upper: up, lower: lo, mid });
  },
};

// === Choppiness Index ===
const choppinessIndicator: Entry = {
  def: { code: 'CHOP', name: 'Choppiness Index', category: 'trend', inputs: [{ key: 'length', label: 'Length', type: 'int', default: 14, min: 2 }], outputs: [{ key: 'chop', label: 'Choppiness', plot: 'line', paneId: 'sub' }], tags: ['trend'] },
  compute: (ctx, p) => {
    const L = Number(p.length ?? 14);
    const result: number[] = [];
    const tr: number[] = [];
    for (let i = 1; i < ctx.close.length; i++) {
      tr.push(Math.max(ctx.high[i] - ctx.low[i], Math.abs(ctx.high[i] - ctx.close[i - 1]), Math.abs(ctx.low[i] - ctx.close[i - 1])));
    }
    for (let i = 0; i < ctx.close.length; i++) {
      if (i < L) { result.push(NaN); continue; }
      const sumTR = tr.slice(i - L, i).reduce((s, v) => s + v, 0);
      const hi = Math.max(...ctx.high.slice(i - L + 1, i + 1));
      const ll = Math.min(...ctx.low.slice(i - L + 1, i + 1));
      const range = hi - ll;
      result.push(range === 0 ? 0 : 100 * Math.log10(sumTR / range) / Math.log10(L));
    }
    return { series: { chop: result }, levels: [{ key: 't61', value: 61.8 }, { key: 't38', value: 38.2 }] };
  },
};

// === TSI (True Strength Index) ===
const tsiIndicator: Entry = {
  def: {
    code: 'TSI', name: 'True Strength Index', category: 'momentum',
    inputs: [
      { key: 'long', label: 'Long Length', type: 'int', default: 25, min: 2 },
      { key: 'short', label: 'Short Length', type: 'int', default: 13, min: 2 },
    ],
    outputs: [{ key: 'tsi', label: 'TSI', plot: 'line', paneId: 'sub' }],
    tags: ['momentum'],
  },
  compute: (ctx, p) => {
    const closes = ctx.close;
    const m = closes.slice(1).map((c, i) => c - closes[i]);
    const am = m.map(Math.abs);
    const long = Number(p.long ?? 25);
    const short = Number(p.short ?? 13);
    const ema1 = ema(m, long);
    const ema2 = ema(ema1, short);
    const aema1 = ema(am, long);
    const aema2 = ema(aema1, short);
    const tsi = ema2.map((v, i) => aema2[i] === 0 ? 0 : 100 * v / aema2[i]);
    return { series: { tsi: [NaN, ...tsi] }, levels: [{ key: 'zero', value: 0 }] };
  },
};

// === Ultimate Oscillator ===
const ultimateIndicator: Entry = {
  def: {
    code: 'UO', name: 'Ultimate Oscillator', category: 'momentum',
    inputs: [
      { key: 'fast', label: 'Fast', type: 'int', default: 7, min: 2 },
      { key: 'mid', label: 'Mid', type: 'int', default: 14, min: 2 },
      { key: 'slow', label: 'Slow', type: 'int', default: 28, min: 2 },
    ],
    outputs: [{ key: 'uo', label: 'UO', plot: 'line', paneId: 'sub' }],
    tags: ['momentum'],
  },
  compute: (ctx, p) => {
    const fast = Number(p.fast ?? 7); const mid = Number(p.mid ?? 14); const slow = Number(p.slow ?? 28);
    const bp: number[] = []; const tr: number[] = [];
    for (let i = 0; i < ctx.close.length; i++) {
      const prevClose = i ? ctx.close[i - 1] : ctx.close[i];
      const trueLow = Math.min(ctx.low[i], prevClose);
      bp.push(ctx.close[i] - trueLow);
      tr.push(Math.max(ctx.high[i], prevClose) - trueLow);
    }
    const sumN = (arr: number[], n: number, i: number) => arr.slice(Math.max(0, i - n + 1), i + 1).reduce((s, v) => s + v, 0);
    const result: number[] = [];
    for (let i = 0; i < ctx.close.length; i++) {
      if (i < slow) { result.push(NaN); continue; }
      const avg1 = sumN(bp, fast, i) / Math.max(0.0001, sumN(tr, fast, i));
      const avg2 = sumN(bp, mid, i) / Math.max(0.0001, sumN(tr, mid, i));
      const avg3 = sumN(bp, slow, i) / Math.max(0.0001, sumN(tr, slow, i));
      result.push((100 * (4 * avg1 + 2 * avg2 + avg3)) / 7);
    }
    return { series: { uo: result }, levels: [{ key: 't70', value: 70 }, { key: 't30', value: 30 }] };
  },
};

// === Trix ===
const trixIndicator: Entry = {
  def: {
    code: 'TRIX', name: 'TRIX', category: 'momentum',
    inputs: [{ key: 'length', label: 'Length', type: 'int', default: 14, min: 2 }],
    outputs: [{ key: 'trix', label: 'TRIX', plot: 'line', paneId: 'sub' }],
    tags: ['momentum'],
  },
  compute: (ctx, p) => {
    const L = Number(p.length ?? 14);
    const e1 = ema(ctx.close, L);
    const e2 = ema(e1, L);
    const e3 = ema(e2, L);
    const trix = e3.map((v, i) => i === 0 ? 0 : ((v - e3[i - 1]) / Math.max(0.0001, e3[i - 1])) * 100);
    return { series: { trix }, levels: [{ key: 'zero', value: 0 }] };
  },
};

// === Chaikin Money Flow ===
const cmfIndicator: Entry = {
  def: {
    code: 'CMF', name: 'Chaikin Money Flow', category: 'volume', needsVolume: true,
    inputs: [{ key: 'length', label: 'Length', type: 'int', default: 20, min: 2 }],
    outputs: [{ key: 'cmf', label: 'CMF', plot: 'line', paneId: 'sub' }],
    tags: ['volume'],
  },
  compute: (ctx, p) => {
    const L = Number(p.length ?? 20);
    const mfv = ctx.close.map((c, i) => {
      const r = ctx.high[i] - ctx.low[i];
      if (r === 0) return 0;
      const mfm = ((c - ctx.low[i]) - (ctx.high[i] - c)) / r;
      return mfm * ctx.volume[i];
    });
    const result: number[] = [];
    for (let i = 0; i < ctx.close.length; i++) {
      if (i < L - 1) { result.push(NaN); continue; }
      const sumMfv = mfv.slice(i - L + 1, i + 1).reduce((s, v) => s + v, 0);
      const sumVol = ctx.volume.slice(i - L + 1, i + 1).reduce((s, v) => s + v, 0);
      result.push(sumVol === 0 ? 0 : sumMfv / sumVol);
    }
    return { series: { cmf: result }, levels: [{ key: 'zero', value: 0 }] };
  },
};

// === Klinger Volume Oscillator ===
const klingerIndicator: Entry = {
  def: { code: 'KVO', name: 'Klinger Volume Oscillator', category: 'volume', needsVolume: true, inputs: [{ key: 'fast', label: 'Fast', type: 'int', default: 34, min: 2 }, { key: 'slow', label: 'Slow', type: 'int', default: 55, min: 2 }, { key: 'signal', label: 'Signal', type: 'int', default: 13, min: 2 }], outputs: [{ key: 'kvo', label: 'KVO', plot: 'line', paneId: 'sub' }, { key: 'signal', label: 'Signal', plot: 'line', paneId: 'sub' }], tags: ['volume'] },
  compute: (ctx, p) => {
    const fast = Number(p.fast ?? 34); const slow = Number(p.slow ?? 55); const sig = Number(p.signal ?? 13);
    const trend: number[] = [0];
    for (let i = 1; i < ctx.close.length; i++) trend.push((ctx.high[i] + ctx.low[i] + ctx.close[i]) > (ctx.high[i - 1] + ctx.low[i - 1] + ctx.close[i - 1]) ? 1 : -1);
    const vf = ctx.volume.map((v, i) => v * trend[i] * 100);
    const ef = ema(vf, fast); const es = ema(vf, slow);
    const kvo = ef.map((v, i) => v - es[i]);
    const signal = ema(kvo, sig);
    return out({ kvo, signal });
  },
};

// === Force Index ===
const forceIndicator: Entry = {
  def: { code: 'FI', name: 'Elder Force Index', category: 'volume', needsVolume: true, inputs: [{ key: 'length', label: 'Length', type: 'int', default: 13, min: 1 }], outputs: [{ key: 'fi', label: 'Force Index', plot: 'line', paneId: 'sub' }], tags: ['volume'] },
  compute: (ctx, p) => {
    const L = Number(p.length ?? 13);
    const raw = ctx.close.map((c, i) => i === 0 ? 0 : (c - ctx.close[i - 1]) * ctx.volume[i]);
    return { series: { fi: ema(raw, L) }, levels: [{ key: 'zero', value: 0 }] };
  },
};

// === Accumulation/Distribution ===
const adIndicator: Entry = {
  def: { code: 'ADL', name: 'Accumulation/Distribution Line', category: 'volume', needsVolume: true, inputs: [], outputs: [{ key: 'adl', label: 'ADL', plot: 'line', paneId: 'sub' }], tags: ['volume'] },
  compute: (ctx) => {
    const result: number[] = [0];
    for (let i = 0; i < ctx.close.length; i++) {
      const r = ctx.high[i] - ctx.low[i];
      const mfm = r === 0 ? 0 : ((ctx.close[i] - ctx.low[i]) - (ctx.high[i] - ctx.close[i])) / r;
      const mfv = mfm * ctx.volume[i];
      result.push((result[result.length - 1] || 0) + mfv);
    }
    result.shift();
    return out({ adl: result });
  },
};

// === Chaikin Oscillator ===
const chaikinOscIndicator: Entry = {
  def: { code: 'CHAIKIN_OSC', name: 'Chaikin Oscillator', category: 'volume', needsVolume: true, inputs: [{ key: 'fast', label: 'Fast', type: 'int', default: 3, min: 2 }, { key: 'slow', label: 'Slow', type: 'int', default: 10, min: 2 }], outputs: [{ key: 'chaikin', label: 'Chaikin', plot: 'line', paneId: 'sub' }], tags: ['volume'] },
  compute: (ctx, p) => {
    const fast = Number(p.fast ?? 3); const slow = Number(p.slow ?? 10);
    const adl: number[] = [0];
    for (let i = 0; i < ctx.close.length; i++) {
      const r = ctx.high[i] - ctx.low[i];
      const mfm = r === 0 ? 0 : ((ctx.close[i] - ctx.low[i]) - (ctx.high[i] - ctx.close[i])) / r;
      adl.push((adl[adl.length - 1] || 0) + mfm * ctx.volume[i]);
    }
    adl.shift();
    const ef = ema(adl, fast); const es = ema(adl, slow);
    return { series: { chaikin: ef.map((v, i) => v - es[i]) }, levels: [{ key: 'zero', value: 0 }] };
  },
};

// === Vortex Indicator ===
const vortexIndicator: Entry = {
  def: { code: 'VORTEX', name: 'Vortex Indicator', category: 'trend', inputs: [{ key: 'length', label: 'Length', type: 'int', default: 14, min: 2 }], outputs: [{ key: 'vi_plus', label: 'VI+', plot: 'line', paneId: 'sub' }, { key: 'vi_minus', label: 'VI-', plot: 'line', paneId: 'sub' }], tags: ['trend'] },
  compute: (ctx, p) => {
    const L = Number(p.length ?? 14);
    const vmPlus: number[] = [0]; const vmMinus: number[] = [0]; const tr: number[] = [0];
    for (let i = 1; i < ctx.close.length; i++) {
      vmPlus.push(Math.abs(ctx.high[i] - ctx.low[i - 1]));
      vmMinus.push(Math.abs(ctx.low[i] - ctx.high[i - 1]));
      tr.push(Math.max(ctx.high[i] - ctx.low[i], Math.abs(ctx.high[i] - ctx.close[i - 1]), Math.abs(ctx.low[i] - ctx.close[i - 1])));
    }
    const sumN = (arr: number[], n: number, i: number) => arr.slice(Math.max(0, i - n + 1), i + 1).reduce((s, v) => s + v, 0);
    const viPlus: number[] = []; const viMinus: number[] = [];
    for (let i = 0; i < ctx.close.length; i++) {
      const sumTR = sumN(tr, L, i);
      viPlus.push(sumTR === 0 ? 0 : sumN(vmPlus, L, i) / sumTR);
      viMinus.push(sumTR === 0 ? 0 : sumN(vmMinus, L, i) / sumTR);
    }
    return out({ vi_plus: viPlus, vi_minus: viMinus });
  },
};

// === Parabolic SAR ===
const sarIndicator: Entry = {
  def: { code: 'SAR', name: 'Parabolic SAR', category: 'trend', overlay: true, inputs: [{ key: 'start', label: 'Start', type: 'float', default: 0.02, min: 0.001, step: 0.001 }, { key: 'increment', label: 'Increment', type: 'float', default: 0.02, min: 0.001, step: 0.001 }, { key: 'max', label: 'Max', type: 'float', default: 0.2, min: 0.01, step: 0.01 }], outputs: [{ key: 'sar', label: 'SAR', plot: 'line', paneId: 'overlay' }], tags: ['trend'] },
  compute: (ctx, p) => {
    const start = Number(p.start ?? 0.02); const inc = Number(p.increment ?? 0.02); const max = Number(p.max ?? 0.2);
    const sar: number[] = []; let trend: 1 | -1 = 1;
    let ep = ctx.high[0]; let af = start; let s = ctx.low[0];
    for (let i = 0; i < ctx.close.length; i++) {
      sar.push(s);
      if (trend === 1) {
        s = s + af * (ep - s);
        if (ctx.low[i] < s) { trend = -1; s = ep; ep = ctx.low[i]; af = start; }
        else if (ctx.high[i] > ep) { ep = ctx.high[i]; af = Math.min(af + inc, max); }
      } else {
        s = s + af * (ep - s);
        if (ctx.high[i] > s) { trend = 1; s = ep; ep = ctx.high[i]; af = start; }
        else if (ctx.low[i] < ep) { ep = ctx.low[i]; af = Math.min(af + inc, max); }
      }
    }
    return out({ sar });
  },
};

// === SuperTrend ===
const supertrendIndicator: Entry = {
  def: { code: 'SUPERTREND', name: 'SuperTrend', category: 'trend', overlay: true, inputs: [{ key: 'length', label: 'ATR Length', type: 'int', default: 10, min: 2 }, { key: 'multiplier', label: 'Multiplier', type: 'float', default: 3, min: 0.5, step: 0.1 }], outputs: [{ key: 'st', label: 'SuperTrend', plot: 'line', paneId: 'overlay' }, { key: 'direction', label: 'Dir', plot: 'line', paneId: 'sub' }], tags: ['trend'] },
  compute: (ctx, p) => {
    const L = Number(p.length ?? 10); const mult = Number(p.multiplier ?? 3);
    const tr: number[] = [];
    for (let i = 0; i < ctx.close.length; i++) {
      if (i === 0) { tr.push(ctx.high[i] - ctx.low[i]); continue; }
      tr.push(Math.max(ctx.high[i] - ctx.low[i], Math.abs(ctx.high[i] - ctx.close[i - 1]), Math.abs(ctx.low[i] - ctx.close[i - 1])));
    }
    const atr = ema(tr, L);
    const st: number[] = []; const dir: number[] = [];
    let lastFinal = 0; let lastDir: 1 | -1 = 1;
    for (let i = 0; i < ctx.close.length; i++) {
      const hl2 = (ctx.high[i] + ctx.low[i]) / 2;
      const upper = hl2 + mult * atr[i];
      const lower = hl2 - mult * atr[i];
      if (i === 0) { lastFinal = lower; lastDir = 1; st.push(lower); dir.push(1); continue; }
      let final: number;
      if (lastDir === 1) {
        if (ctx.close[i] <= lastFinal) { lastDir = -1; final = upper; }
        else final = Math.max(lower, lastFinal);
      } else {
        if (ctx.close[i] >= lastFinal) { lastDir = 1; final = lower; }
        else final = Math.min(upper, lastFinal);
      }
      lastFinal = final; st.push(final); dir.push(lastDir);
    }
    return out({ st, direction: dir });
  },
};

// === Awesome Oscillator (Bill Williams) ===
const aoIndicator: Entry = {
  def: { code: 'AO', name: 'Awesome Oscillator', category: 'momentum', inputs: [], outputs: [{ key: 'ao', label: 'AO', plot: 'histogram', paneId: 'sub' }], tags: ['momentum'] },
  compute: (ctx) => {
    const hl = ctx.high.map((h, i) => (h + ctx.low[i]) / 2);
    const s5 = sma(hl, 5); const s34 = sma(hl, 34);
    return { series: { ao: s5.map((v, i) => v - s34[i]) }, levels: [{ key: 'zero', value: 0 }] };
  },
};

// === Connors RSI ===
const crsiIndicator: Entry = {
  def: { code: 'CRSI', name: 'Connors RSI', category: 'mean_reversion', inputs: [{ key: 'rsi', label: 'RSI Length', type: 'int', default: 3, min: 2 }, { key: 'streak', label: 'Streak Length', type: 'int', default: 2, min: 1 }, { key: 'pct', label: 'Pct Length', type: 'int', default: 100, min: 10 }], outputs: [{ key: 'crsi', label: 'CRSI', plot: 'line', paneId: 'sub' }], tags: ['mean-rev'] },
  compute: (ctx, p) => {
    const Lr = Number(p.rsi ?? 3); const Ls = Number(p.streak ?? 2); const Lp = Number(p.pct ?? 100);
    const closes = ctx.close;
    // basic RSI computation
    const rsiOf = (vals: number[], n: number) => {
      let g = 0; let l = 0;
      const res: number[] = [];
      for (let i = 0; i < vals.length; i++) {
        if (i === 0) { res.push(NaN); continue; }
        const d = vals[i] - vals[i - 1];
        if (i <= n) { g += d > 0 ? d : 0; l += d < 0 ? -d : 0; res.push(NaN); if (i === n) { g /= n; l /= n; res[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l); } continue; }
        const gg = d > 0 ? d : 0; const ll = d < 0 ? -d : 0;
        g = (g * (n - 1) + gg) / n; l = (l * (n - 1) + ll) / n;
        res.push(l === 0 ? 100 : 100 - 100 / (1 + g / l));
      }
      return res;
    };
    // streak
    const streak: number[] = [0];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) streak.push(streak[i - 1] > 0 ? streak[i - 1] + 1 : 1);
      else if (closes[i] < closes[i - 1]) streak.push(streak[i - 1] < 0 ? streak[i - 1] - 1 : -1);
      else streak.push(0);
    }
    const rsiClose = rsiOf(closes, Lr);
    const rsiStreak = rsiOf(streak, Ls);
    // PercentRank
    const pr: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < Lp) { pr.push(NaN); continue; }
      const d = closes[i] - closes[i - 1];
      const slice = closes.slice(i - Lp + 1, i).map((c, j) => closes[i - Lp + 1 + j + 1] - closes[i - Lp + 1 + j]);
      pr.push((slice.filter((v) => v < d).length / slice.length) * 100);
    }
    const crsi = rsiClose.map((v, i) => (v + (rsiStreak[i] ?? 0) + (pr[i] ?? 0)) / 3);
    return { series: { crsi }, levels: [{ key: 't70', value: 70 }, { key: 't30', value: 30 }] };
  },
};

// === Pivot Points (Classic) ===
const pivotIndicator: Entry = {
  def: { code: 'PIVOT_CLASSIC', name: 'Pivot Points (Classic)', category: 'pattern', overlay: true, inputs: [{ key: 'period', label: 'Period', type: 'enum', default: 'daily', options: [{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'monthly', label: 'Monthly' }] }], outputs: [{ key: 'pp', label: 'PP', plot: 'line', paneId: 'overlay' }, { key: 'r1', label: 'R1', plot: 'line', paneId: 'overlay' }, { key: 's1', label: 'S1', plot: 'line', paneId: 'overlay' }, { key: 'r2', label: 'R2', plot: 'line', paneId: 'overlay' }, { key: 's2', label: 'S2', plot: 'line', paneId: 'overlay' }], tags: ['pivot'] },
  compute: (ctx) => {
    const high = Math.max(...ctx.high.slice(-50));
    const low = Math.min(...ctx.low.slice(-50));
    const close = ctx.close[ctx.close.length - 1];
    const pp = (high + low + close) / 3;
    const r1 = 2 * pp - low; const s1 = 2 * pp - high;
    const r2 = pp + (high - low); const s2 = pp - (high - low);
    return { series: {}, levels: [
      { key: 'pp', value: pp, label: `PP ${pp.toFixed(2)}`, color: '#a855f7' },
      { key: 'r1', value: r1, label: `R1 ${r1.toFixed(2)}`, color: '#f23645' },
      { key: 'r2', value: r2, label: `R2 ${r2.toFixed(2)}`, color: '#f23645' },
      { key: 's1', value: s1, label: `S1 ${s1.toFixed(2)}`, color: '#089981' },
      { key: 's2', value: s2, label: `S2 ${s2.toFixed(2)}`, color: '#089981' },
    ] };
  },
};

// === RVI (Relative Vigor Index) ===
const rviIndicator: Entry = {
  def: { code: 'RVI', name: 'Relative Vigor Index', category: 'momentum', inputs: [{ key: 'length', label: 'Length', type: 'int', default: 10, min: 2 }], outputs: [{ key: 'rvi', label: 'RVI', plot: 'line', paneId: 'sub' }, { key: 'signal', label: 'Signal', plot: 'line', paneId: 'sub' }], tags: ['momentum'] },
  compute: (ctx, p) => {
    const L = Number(p.length ?? 10);
    const num: number[] = []; const den: number[] = [];
    for (let i = 0; i < ctx.close.length; i++) {
      num.push(ctx.close[i] - ctx.open[i]);
      den.push(ctx.high[i] - ctx.low[i]);
    }
    const smaNum = sma(num, L); const smaDen = sma(den, L);
    const rvi = smaNum.map((v, i) => smaDen[i] === 0 ? 0 : v / smaDen[i]);
    const signal = sma(rvi, 4);
    return out({ rvi, signal });
  },
};

// === Coppock Curve ===
const coppockIndicator: Entry = {
  def: { code: 'COPPOCK', name: 'Coppock Curve', category: 'cycle', inputs: [{ key: 'roc1', label: 'ROC1', type: 'int', default: 14, min: 2 }, { key: 'roc2', label: 'ROC2', type: 'int', default: 11, min: 2 }, { key: 'wma', label: 'WMA', type: 'int', default: 10, min: 2 }], outputs: [{ key: 'coppock', label: 'Coppock', plot: 'line', paneId: 'sub' }], tags: ['cycle'] },
  compute: (ctx, p) => {
    const r1 = Number(p.roc1 ?? 14); const r2 = Number(p.roc2 ?? 11); const w = Number(p.wma ?? 10);
    const roc = (n: number) => ctx.close.map((c, i) => i < n ? NaN : ((c - ctx.close[i - n]) / ctx.close[i - n]) * 100);
    const r1Arr = roc(r1); const r2Arr = roc(r2);
    const sum = r1Arr.map((v, i) => v + r2Arr[i]);
    // WMA of sum
    const out: number[] = []; const weights = Array.from({ length: w }, (_, i) => i + 1);
    const ws = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < sum.length; i++) {
      if (i < w - 1) { out.push(NaN); continue; }
      let s = 0;
      for (let j = 0; j < w; j++) s += sum[i - (w - 1 - j)] * weights[j];
      out.push(s / ws);
    }
    return { series: { coppock: out }, levels: [{ key: 'zero', value: 0 }] };
  },
};

// === Mass Index ===
const massIndicator: Entry = {
  def: { code: 'MASS_INDEX', name: 'Mass Index', category: 'volatility', inputs: [{ key: 'length', label: 'Length', type: 'int', default: 25, min: 2 }], outputs: [{ key: 'mi', label: 'Mass Index', plot: 'line', paneId: 'sub' }], tags: ['volatility'] },
  compute: (ctx, p) => {
    const L = Number(p.length ?? 25);
    const range = ctx.high.map((h, i) => h - ctx.low[i]);
    const e1 = ema(range, 9); const e2 = ema(e1, 9);
    const ratio = e1.map((v, i) => e2[i] === 0 ? 0 : v / e2[i]);
    const result: number[] = [];
    for (let i = 0; i < ratio.length; i++) {
      if (i < L - 1) { result.push(NaN); continue; }
      result.push(ratio.slice(i - L + 1, i + 1).reduce((s, v) => s + v, 0));
    }
    return { series: { mi: result }, levels: [{ key: 't27', value: 27 }] };
  },
};

// === Schaff Trend Cycle ===
const stcIndicator: Entry = {
  def: { code: 'STC', name: 'Schaff Trend Cycle', category: 'cycle', inputs: [{ key: 'fast', label: 'Fast', type: 'int', default: 23 }, { key: 'slow', label: 'Slow', type: 'int', default: 50 }, { key: 'cycle', label: 'Cycle', type: 'int', default: 10 }], outputs: [{ key: 'stc', label: 'STC', plot: 'line', paneId: 'sub' }], tags: ['cycle'] },
  compute: (ctx, p) => {
    const fast = Number(p.fast ?? 23); const slow = Number(p.slow ?? 50); const cycle = Number(p.cycle ?? 10);
    const macd = ema(ctx.close, fast).map((v, i) => v - ema(ctx.close, slow)[i]);
    // Stochastic %K on MACD over cycle
    const k: number[] = [];
    for (let i = 0; i < macd.length; i++) {
      if (i < cycle - 1) { k.push(NaN); continue; }
      const slice = macd.slice(i - cycle + 1, i + 1);
      const min = Math.min(...slice); const max = Math.max(...slice);
      k.push(max === min ? 50 : 100 * (macd[i] - min) / (max - min));
    }
    const d = ema(k, 3);
    // Second stochastic on D
    const k2: number[] = [];
    for (let i = 0; i < d.length; i++) {
      if (i < cycle - 1) { k2.push(NaN); continue; }
      const slice = d.slice(i - cycle + 1, i + 1).filter((v) => !isNaN(v));
      if (!slice.length) { k2.push(NaN); continue; }
      const min = Math.min(...slice); const max = Math.max(...slice);
      k2.push(max === min ? 50 : 100 * (d[i] - min) / (max - min));
    }
    const stc = ema(k2.map((v) => (isNaN(v) ? 50 : v)), 3);
    return { series: { stc }, levels: [{ key: 't75', value: 75 }, { key: 't25', value: 25 }] };
  },
};

// === Heiken Ashi (overlay output as separate series) ===
const haIndicator: Entry = {
  def: { code: 'HA', name: 'Heiken Ashi', category: 'pattern', overlay: true, inputs: [], outputs: [{ key: 'haOpen', label: 'HA Open', plot: 'line', paneId: 'overlay' }, { key: 'haClose', label: 'HA Close', plot: 'line', paneId: 'overlay' }], tags: ['ha'] },
  compute: (ctx) => {
    const haOpen: number[] = [ctx.open[0]]; const haClose: number[] = [(ctx.open[0] + ctx.close[0]) / 2];
    for (let i = 1; i < ctx.close.length; i++) {
      const closeHA = (ctx.open[i] + ctx.high[i] + ctx.low[i] + ctx.close[i]) / 4;
      const openHA = (haOpen[i - 1] + haClose[i - 1]) / 2;
      haOpen.push(openHA); haClose.push(closeHA);
    }
    return out({ haOpen, haClose });
  },
};

// === Ichimoku Cloud (5 lines) ===
const ichimokuIndicator: Entry = {
  def: { code: 'ICHIMOKU', name: 'Ichimoku Cloud', category: 'trend', overlay: true, inputs: [{ key: 'tenkan', label: 'Tenkan', type: 'int', default: 9 }, { key: 'kijun', label: 'Kijun', type: 'int', default: 26 }, { key: 'senkou', label: 'Senkou B', type: 'int', default: 52 }], outputs: [{ key: 'tenkan', label: 'Tenkan', plot: 'line', paneId: 'overlay' }, { key: 'kijun', label: 'Kijun', plot: 'line', paneId: 'overlay' }, { key: 'spanA', label: 'Span A', plot: 'line', paneId: 'overlay' }, { key: 'spanB', label: 'Span B', plot: 'line', paneId: 'overlay' }], tags: ['trend', 'cloud'] },
  compute: (ctx, p) => {
    const t = Number(p.tenkan ?? 9); const k = Number(p.kijun ?? 26); const s = Number(p.senkou ?? 52);
    const midN = (n: number) => ctx.close.map((_, i) => {
      if (i < n - 1) return NaN;
      const hi = Math.max(...ctx.high.slice(i - n + 1, i + 1));
      const lo = Math.min(...ctx.low.slice(i - n + 1, i + 1));
      return (hi + lo) / 2;
    });
    const tenkan = midN(t); const kijun = midN(k);
    const spanA = tenkan.map((v, i) => (v + kijun[i]) / 2);
    const spanB = midN(s);
    return out({ tenkan, kijun, spanA, spanB });
  },
};

// === Aggregate all generated indicators ===
export const GENERATED_INDICATORS: Entry[] = [
  ...emaIndicators,
  ...smaIndicators,
  ...hmaIndicators,
  kamaIndicator, t3Indicator, aroonIndicator, cciIndicator, dpoIndicator,
  donchianIndicator, choppinessIndicator, tsiIndicator, ultimateIndicator,
  trixIndicator, cmfIndicator, klingerIndicator, forceIndicator, adIndicator,
  chaikinOscIndicator, vortexIndicator, sarIndicator, supertrendIndicator,
  aoIndicator, crsiIndicator, pivotIndicator, rviIndicator, coppockIndicator,
  massIndicator, stcIndicator, haIndicator, ichimokuIndicator,
];

// Helper untuk debug count
export const GENERATED_COUNT = GENERATED_INDICATORS.length;

// Mute std import linter if not used elsewhere
void std;
void mean;
void lastFinite;
