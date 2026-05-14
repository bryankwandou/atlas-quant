export function vwap(highs: number[], lows: number[], closes: number[], volumes: number[]): number[] {
  const result: number[] = [];
  let cumTPV = 0;
  let cumVol = 0;
  for (let i = 0; i < closes.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    cumTPV += typicalPrice * volumes[i];
    cumVol += volumes[i];
    result.push(cumVol > 0 ? cumTPV / cumVol : closes[i]);
  }
  return result;
}

export function williamsAD(highs: number[], lows: number[], closes: number[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    const tl = Math.min(lows[i], closes[i - 1]);
    const th = Math.max(highs[i], closes[i - 1]);
    let x = 0;
    if (closes[i] > closes[i - 1])      x = closes[i] - tl;
    else if (closes[i] < closes[i - 1]) x = closes[i] - th;
    result.push(result[i - 1] + x);
  }
  return result;
}

export function obv(closes: number[], volumes: number[]): number[] {
  const result: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1])      result.push(result[i - 1] + volumes[i]);
    else if (closes[i] < closes[i - 1]) result.push(result[i - 1] - volumes[i]);
    else                                 result.push(result[i - 1]);
  }
  return result;
}

export function volumeSpike(volumes: number[], period = 20, threshold = 2.0): boolean[] {
  return volumes.map((v, i) => {
    if (i < period) return false;
    const avgVol = volumes.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    return v >= avgVol * threshold;
  });
}

export function mfi(
  highs: number[], lows: number[], closes: number[], volumes: number[], period = 14
): number[] {
  const result: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (i < period) { result.push(NaN); continue; }
    let posFlow = 0, negFlow = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const tp = (highs[j] + lows[j] + closes[j]) / 3;
      const prevTp = j > 0 ? (highs[j - 1] + lows[j - 1] + closes[j - 1]) / 3 : tp;
      const rawFlow = tp * volumes[j];
      if (tp > prevTp) posFlow += rawFlow;
      else if (tp < prevTp) negFlow += rawFlow;
    }
    const mfRatio = negFlow === 0 ? 100 : posFlow / negFlow;
    result.push(100 - (100 / (1 + mfRatio)));
  }
  return result;
}
