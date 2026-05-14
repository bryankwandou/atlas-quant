import { ema } from './trend';

export function atr(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const trueRanges = highs.map((h, i) => {
    if (i === 0) return h - lows[i];
    return Math.max(h - lows[i], Math.abs(h - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  });
  return smaSmoothed(trueRanges, period);
}

function smaSmoothed(values: number[], period: number): number[] {
  const result: number[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (i < period) {
      sum += values[i];
      result.push(i === period - 1 ? sum / period : NaN);
    } else {
      result.push((result[i - 1] * (period - 1) + values[i]) / period);
    }
  }
  return result;
}

export function bollingerBands(closes: number[], period = 20, stdMult = 2) {
  const middleBand: number[] = [];
  const upperBand: number[] = [];
  const lowerBand: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      middleBand.push(NaN); upperBand.push(NaN);
      lowerBand.push(NaN); bandwidth.push(NaN);
      continue;
    }
    const slice = closes.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const std = Math.sqrt(variance);
    const upper = mean + stdMult * std;
    const lower = mean - stdMult * std;
    middleBand.push(mean);
    upperBand.push(upper);
    lowerBand.push(lower);
    bandwidth.push(mean > 0 ? (upper - lower) / mean : 0);
  }

  return { middle: middleBand, upper: upperBand, lower: lowerBand, bandwidth };
}

export function keltnerChannel(
  highs: number[], lows: number[], closes: number[],
  emaPeriod = 20, atrPeriod = 10, mult = 1.5
) {
  const middle = ema(closes, emaPeriod);
  const atrValues = atr(highs, lows, closes, atrPeriod);
  const upper = middle.map((m, i) => m + mult * atrValues[i]);
  const lower = middle.map((m, i) => m - mult * atrValues[i]);
  return { middle, upper, lower };
}

export function volatilityPercentile(closes: number[], lookback = 14): number[] {
  const dailyReturns = closes.map((c, i) =>
    i === 0 ? 0 : Math.abs((c - closes[i - 1]) / closes[i - 1])
  );
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < lookback - 1) { result.push(NaN); continue; }
    const currentVol =
      dailyReturns.slice(Math.max(0, i - lookback + 1), i + 1).reduce((a, b) => a + b, 0) / lookback;
    const historicalVols: number[] = [];
    for (let j = lookback; j <= i; j++) {
      const slice = dailyReturns.slice(j - lookback, j);
      historicalVols.push(slice.reduce((a, b) => a + b, 0) / lookback);
    }
    if (historicalVols.length === 0) { result.push(50); continue; }
    const rank = historicalVols.filter(v => v <= currentVol).length;
    result.push((rank / historicalVols.length) * 100);
  }
  return result;
}
