export interface OrderBlock {
  type: 'bullish' | 'bearish';
  high: number; low: number;
  time: number; strength: number;
  mitigated: boolean;
}

export interface FairValueGap {
  type: 'bullish' | 'bearish';
  top: number; bottom: number;
  time: number; filled: boolean;
}

export interface BOS {
  type: 'bullish' | 'bearish';
  level: number; time: number;
}

export function detectOrderBlocks(
  highs: number[], lows: number[], closes: number[], times: number[], lookback = 20
): OrderBlock[] {
  const obs: OrderBlock[] = [];
  for (let i = lookback; i < closes.length - 1; i++) {
    const impulseUp   = closes[i + 1] > highs[i] * 1.003;
    const impulseDown = closes[i + 1] < lows[i] * 0.997;

    if (impulseUp) {
      const isMitigated = closes.slice(i + 2).some(c => c <= lows[i]);
      obs.push({
        type: 'bullish', high: highs[i], low: lows[i],
        time: times[i], strength: closes[i + 1] / highs[i],
        mitigated: isMitigated,
      });
    } else if (impulseDown) {
      const isMitigated = closes.slice(i + 2).some(c => c >= highs[i]);
      obs.push({
        type: 'bearish', high: highs[i], low: lows[i],
        time: times[i], strength: lows[i] / closes[i + 1],
        mitigated: isMitigated,
      });
    }
  }
  return obs.slice(-10);
}

export function detectFVG(
  highs: number[], lows: number[], times: number[]
): FairValueGap[] {
  const fvgs: FairValueGap[] = [];
  for (let i = 1; i < lows.length - 1; i++) {
    const bullishFVG = lows[i + 1] > highs[i - 1];
    const bearishFVG = highs[i + 1] < lows[i - 1];

    if (bullishFVG) {
      const filled = lows.slice(i + 2).some(l => l <= highs[i - 1]);
      fvgs.push({ type: 'bullish', top: lows[i + 1], bottom: highs[i - 1], time: times[i], filled });
    } else if (bearishFVG) {
      const filled = highs.slice(i + 2).some(h => h >= lows[i - 1]);
      fvgs.push({ type: 'bearish', top: lows[i - 1], bottom: highs[i + 1], time: times[i], filled });
    }
  }
  return fvgs.slice(-10);
}

export function detectBOS(
  highs: number[], lows: number[], closes: number[], times: number[]
): BOS[] {
  const bosArr: BOS[] = [];
  const swingHighs: number[] = [];
  const swingLows: number[] = [];

  for (let i = 2; i < closes.length - 2; i++) {
    if (highs[i] > highs[i - 1] && highs[i] > highs[i - 2] && highs[i] > highs[i + 1] && highs[i] > highs[i + 2]) {
      swingHighs.push(highs[i]);
    }
    if (lows[i] < lows[i - 1] && lows[i] < lows[i - 2] && lows[i] < lows[i + 1] && lows[i] < lows[i + 2]) {
      swingLows.push(lows[i]);
    }

    const lastHigh = swingHighs[swingHighs.length - 1];
    const lastLow  = swingLows[swingLows.length - 1];

    if (lastHigh && closes[i] > lastHigh) {
      bosArr.push({ type: 'bullish', level: lastHigh, time: times[i] });
    }
    if (lastLow && closes[i] < lastLow) {
      bosArr.push({ type: 'bearish', level: lastLow, time: times[i] });
    }
  }
  return bosArr.slice(-5);
}

export function getSMCBias(
  highs: number[], lows: number[], closes: number[], times: number[]
): string {
  const bos = detectBOS(highs, lows, closes, times);
  if (bos.length === 0) return 'neutral';
  const last = bos[bos.length - 1];
  return last.type === 'bullish' ? 'bullish_ob' : 'bearish_ob';
}
