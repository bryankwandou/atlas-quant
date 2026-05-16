/**
 * Common math helpers untuk indikator (pure functions, side-effect free).
 */

export const NaNArr = (n: number): (number | null)[] => Array(n).fill(null);

export const last = <T>(arr: T[]): T | undefined => arr[arr.length - 1];

export function rolling<T, R>(
  arr: T[],
  window: number,
  fn: (slice: T[], idx: number) => R | null
): (R | null)[] {
  const out: (R | null)[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) {
      out.push(null);
      continue;
    }
    out.push(fn(arr.slice(i - window + 1, i + 1), i));
  }
  return out;
}

export function mean(values: number[]): number {
  if (!values.length) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

export function std(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let acc = 0;
  for (const v of values) acc += (v - m) ** 2;
  return Math.sqrt(acc / values.length);
}

export function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)));
  return sorted[idx];
}

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i++) {
    if (i === 0) { out.push(values[0]); continue; }
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function sma(values: number[], period: number): (number | null)[] {
  return rolling(values, period, (slice) => mean(slice));
}

export function wma(values: number[], period: number): (number | null)[] {
  const weights = Array.from({ length: period }, (_, i) => i + 1);
  const wsum = weights.reduce((a, b) => a + b, 0);
  return rolling(values, period, (slice) => {
    let s = 0;
    for (let i = 0; i < period; i++) s += slice[i] * weights[i];
    return s / wsum;
  });
}

export function dema(values: number[], period: number): number[] {
  const e1 = ema(values, period);
  const e2 = ema(e1, period);
  return e1.map((v, i) => 2 * v - e2[i]);
}

export function tema(values: number[], period: number): number[] {
  const e1 = ema(values, period);
  const e2 = ema(e1, period);
  const e3 = ema(e2, period);
  return e1.map((v, i) => 3 * v - 3 * e2[i] + e3[i]);
}

export function vwmaCalc(values: number[], volumes: number[], period: number): (number | null)[] {
  return rolling(values, period, (_slice, idx) => {
    let nv = 0, vv = 0;
    for (let i = idx - period + 1; i <= idx; i++) {
      nv += values[i] * volumes[i];
      vv += volumes[i];
    }
    return vv === 0 ? null : nv / vv;
  });
}

export function alma(
  values: number[],
  period = 21,
  sigma = 6,
  offset = 0.85
): (number | null)[] {
  const m = Math.floor(offset * (period - 1));
  const s = period / sigma;
  return rolling(values, period, (slice) => {
    let norm = 0, sum = 0;
    for (let j = 0; j < period; j++) {
      const w = Math.exp(-((j - m) ** 2) / (2 * s * s));
      norm += w;
      sum += slice[j] * w;
    }
    return sum / norm;
  });
}

export function kama(values: number[], period = 10, fast = 2, slow = 30): (number | null)[] {
  const out: (number | null)[] = NaNArr(period);
  const fastSC = 2 / (fast + 1);
  const slowSC = 2 / (slow + 1);
  let prev = values[period] ?? values[0];
  for (let i = period; i < values.length; i++) {
    const change = Math.abs(values[i] - values[i - period]);
    let volatility = 0;
    for (let j = i - period + 1; j <= i; j++) volatility += Math.abs(values[j] - values[j - 1]);
    const er = volatility === 0 ? 0 : change / volatility;
    const sc = (er * (fastSC - slowSC) + slowSC) ** 2;
    prev = i === period ? values[i] : prev + sc * (values[i] - prev);
    out.push(prev);
  }
  return out;
}

export function crossover(a: number[], b: number[]): boolean[] {
  return a.map((v, i) => i === 0 ? false : a[i - 1] <= b[i - 1] && v > b[i]);
}

export function crossunder(a: number[], b: number[]): boolean[] {
  return a.map((v, i) => i === 0 ? false : a[i - 1] >= b[i - 1] && v < b[i]);
}

export function trueRange(high: number[], low: number[], close: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < high.length; i++) {
    if (i === 0) { out.push(high[i] - low[i]); continue; }
    out.push(Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    ));
  }
  return out;
}

export function wilderSmooth(values: number[], period: number): number[] {
  const out: number[] = [];
  let init = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { out.push(NaN); init += values[i]; continue; }
    if (i === period - 1) { init += values[i]; out.push(init / period); continue; }
    out.push((out[i - 1] * (period - 1) + values[i]) / period);
  }
  return out;
}

export function highestHigh(high: number[], period: number): (number | null)[] {
  return rolling(high, period, (slice) => Math.max(...slice));
}

export function lowestLow(low: number[], period: number): (number | null)[] {
  return rolling(low, period, (slice) => Math.min(...slice));
}

export function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  let sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += x[i]; sy += y[i];
    sxx += x[i] * x[i]; syy += y[i] * y[i];
    sxy += x[i] * y[i];
  }
  const num = n * sxy - sx * sy;
  const den = Math.sqrt((n * sxx - sx * sx) * (n * syy - sy * sy));
  return den === 0 ? 0 : num / den;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
