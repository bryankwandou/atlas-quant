import { sma } from './trend';

export function zScore(values: number[], period = 20): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    result.push(std > 0 ? (values[i] - mean) / std : 0);
  }
  return result;
}

export function distanceFromMA(values: number[], period = 20): number[] {
  const ma = sma(values, period);
  return values.map((v, i) => (isNaN(ma[i]) ? NaN : ((v - ma[i]) / ma[i]) * 100));
}
