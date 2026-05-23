export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values[0];
  for (let i = 0; i < values.length; i++) {
    if (i === 0) { result.push(values[0]); continue; }
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

export function sma(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    const slice = values.slice(i - period + 1, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}

export function wma(values: number[], period: number): number[] {
  const result: number[] = [];
  const weights = Array.from({ length: period }, (_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += values[i - (period - 1 - j)] * weights[j];
    }
    result.push(sum / weightSum);
  }
  return result;
}

export function dema(values: number[], period: number): number[] {
  const e1 = ema(values, period);
  const e2 = ema(e1, period);
  return e1.map((v, i) => 2 * v - e2[i]);
}

export function alma(values: number[], period = 21, sigma = 6, offset = 0.85): number[] {
  const m = Math.floor(offset * (period - 1));
  const s = period / sigma;
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    let norm = 0, sum = 0;
    for (let j = 0; j < period; j++) {
      const w = Math.exp(-((j - m) ** 2) / (2 * s * s));
      norm += w;
      sum += values[i - (period - 1 - j)] * w;
    }
    result.push(sum / norm);
  }
  return result;
}

export function crossover(fast: number[], slow: number[]): boolean[] {
  return fast.map((f, i) => {
    if (i === 0) return false;
    return fast[i - 1] <= slow[i - 1] && f > slow[i];
  });
}

export function crossunder(fast: number[], slow: number[]): boolean[] {
  return fast.map((f, i) => {
    if (i === 0) return false;
    return fast[i - 1] >= slow[i - 1] && f < slow[i];
  });
}
