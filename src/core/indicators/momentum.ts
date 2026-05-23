import { ema } from './trend';

export function rsi(closes: number[], period = 14): number[] {
  const changes = closes.map((c, i) => i === 0 ? 0 : c - closes[i - 1]);
  const result: number[] = [];
  let avgGain = 0, avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    avgGain += Math.max(changes[i], 0);
    avgLoss += Math.abs(Math.min(changes[i], 0));
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = 0; i < closes.length; i++) {
    if (i < period) { result.push(NaN); continue; }
    if (i === period) {
      result.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
      continue;
    }
    const gain = Math.max(changes[i], 0);
    const loss = Math.abs(Math.min(changes[i], 0));
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result.push(avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss)));
  }
  return result;
}

export function williamsR(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    const hh = Math.max(...highs.slice(i - period + 1, i + 1));
    const ll = Math.min(...lows.slice(i - period + 1, i + 1));
    result.push(hh === ll ? 0 : ((hh - closes[i]) / (hh - ll)) * -100);
  }
  return result;
}

export function stochRsi(closes: number[], rsiPeriod = 14, stochPeriod = 14, kPeriod = 3, dPeriod = 3) {
  const rsiValues = rsi(closes, rsiPeriod);
  const stochK: number[] = [];
  for (let i = 0; i < rsiValues.length; i++) {
    if (i < stochPeriod - 1 || isNaN(rsiValues[i])) { stochK.push(NaN); continue; }
    const slice = rsiValues.slice(i - stochPeriod + 1, i + 1).filter(v => !isNaN(v));
    const min = Math.min(...slice);
    const max = Math.max(...slice);
    stochK.push(max === min ? 0 : ((rsiValues[i] - min) / (max - min)) * 100);
  }
  return {
    k: smaFromArr(stochK, kPeriod),
    d: smaFromArr(smaFromArr(stochK, kPeriod), dPeriod),
  };
}

export function macd(closes: number[], fast = 12, slow = 26, signal = 9) {
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const macdLine = fastEma.map((f, i) => f - slowEma[i]);
  const signalLine = ema(macdLine.filter(v => !isNaN(v)), signal);
  const padded = Array(macdLine.length - signalLine.length).fill(NaN).concat(signalLine);
  const histogram = macdLine.map((m, i) => m - padded[i]);
  return { macd: macdLine, signal: padded, histogram };
}

export function roc(closes: number[], period = 14): number[] {
  return closes.map((c, i) => {
    if (i < period) return NaN;
    return ((c - closes[i - period]) / closes[i - period]) * 100;
  });
}

function smaFromArr(arr: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < period - 1 || isNaN(arr[i])) { result.push(NaN); continue; }
    const slice = arr.slice(i - period + 1, i + 1).filter(v => !isNaN(v));
    if (slice.length < period) { result.push(NaN); continue; }
    result.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return result;
}
