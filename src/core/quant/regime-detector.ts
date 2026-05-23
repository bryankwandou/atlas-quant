export type MarketRegime =
  | 'strong_trend_up' | 'weak_trend_up' | 'ranging'
  | 'weak_trend_down' | 'strong_trend_down' | 'volatile'
  | 'low_volume' | 'news_event';

export interface RegimeResult {
  regime: MarketRegime;
  confidence: number;
  adx: number;
  volatilityPct: number;
  trendStrength: number;
  isChop: boolean;
  label: string;
  labelId: string;
  color: string;
  tradeAllowed: boolean;
}

export function detectRegime(
  highs: number[], lows: number[], closes: number[], volumes: number[], n = 20
): RegimeResult {
  if (closes.length < 50) {
    return buildResult('ranging', 50, 0, 50, 0, volumes, n);
  }

  const adxArr = calculateADX(highs, lows, closes, 14);
  const currentAdx = adxArr[adxArr.length - 1] || 25;

  const returns = closes.map((c, i) => i === 0 ? 0 : (c - closes[i - 1]) / closes[i - 1]);
  const recentVol = std(returns.slice(-n)) * Math.sqrt(252) * 100;
  const histVol = std(returns) * Math.sqrt(252) * 100;
  const volPct = histVol > 0 ? (recentVol / histVol) * 50 : 50;

  const ema9  = emaLast(closes, 9);
  const ema21 = emaLast(closes, 21);
  const ema50 = emaLast(closes, 50);
  const price = closes[closes.length - 1];

  const aboveEma9  = price > ema9;
  const aboveEma21 = price > ema21;
  const aboveEma50 = price > ema50;
  const ema9AboveEma21 = ema9 > ema21;

  const avgVol = volumes.slice(-n).reduce((a, b) => a + b, 0) / n;
  const currentVol = volumes[volumes.length - 1];
  const isLowVolume = currentVol < avgVol * 0.5;

  let regime: MarketRegime;
  let confidence: number;

  if (volPct > 150) {
    regime = 'volatile';
    confidence = Math.min(volPct, 100);
  } else if (isLowVolume && currentAdx < 20) {
    regime = 'low_volume';
    confidence = 70;
  } else if (currentAdx > 35 && aboveEma9 && aboveEma21 && aboveEma50 && ema9AboveEma21) {
    regime = 'strong_trend_up';
    confidence = Math.min(currentAdx + 30, 95);
  } else if (currentAdx > 25 && aboveEma21) {
    regime = 'weak_trend_up';
    confidence = 65;
  } else if (currentAdx > 35 && !aboveEma9 && !aboveEma21 && !aboveEma50 && !ema9AboveEma21) {
    regime = 'strong_trend_down';
    confidence = Math.min(currentAdx + 30, 95);
  } else if (currentAdx > 25 && !aboveEma21) {
    regime = 'weak_trend_down';
    confidence = 65;
  } else {
    regime = 'ranging';
    confidence = 100 - currentAdx;
  }

  return buildResult(regime, confidence, currentAdx, volPct, recentVol, volumes, n);
}

function buildResult(
  regime: MarketRegime, confidence: number, adx: number,
  volatilityPct: number, trendStrength: number, volumes: number[], n: number
): RegimeResult {
  const configs: Record<MarketRegime, { label: string; labelId: string; color: string; tradeAllowed: boolean }> = {
    strong_trend_up:   { label: 'Strong Uptrend',    labelId: 'Tren Naik Kuat',    color: 'green',  tradeAllowed: true  },
    weak_trend_up:     { label: 'Weak Uptrend',      labelId: 'Tren Naik Lemah',   color: 'lime',   tradeAllowed: true  },
    ranging:           { label: 'Ranging/Sideways',  labelId: 'Sideways',           color: 'yellow', tradeAllowed: false },
    weak_trend_down:   { label: 'Weak Downtrend',    labelId: 'Tren Turun Lemah',  color: 'orange', tradeAllowed: true  },
    strong_trend_down: { label: 'Strong Downtrend',  labelId: 'Tren Turun Kuat',   color: 'red',    tradeAllowed: true  },
    volatile:          { label: 'High Volatility',   labelId: 'Volatil Tinggi',    color: 'purple', tradeAllowed: false },
    low_volume:        { label: 'Low Liquidity',     labelId: 'Likuiditas Rendah', color: 'gray',   tradeAllowed: false },
    news_event:        { label: 'News Event',        labelId: 'Berita/Event',       color: 'blue',   tradeAllowed: false },
  };

  const config = configs[regime];
  const isChop = adx < 20 && volatilityPct < 80;

  return {
    regime, confidence: Math.round(confidence),
    adx: Math.round(adx),
    volatilityPct: Math.round(volatilityPct),
    trendStrength: Math.round(trendStrength),
    isChop, ...config,
  };
}

function calculateADX(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];
  const tr: number[] = [highs[0] - lows[0]];

  for (let i = 1; i < closes.length; i++) {
    const highDiff = highs[i] - highs[i - 1];
    const lowDiff = lows[i - 1] - lows[i];
    plusDM.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    minusDM.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }

  const smoothTR  = wilderSmooth(tr, period);
  const smoothPDM = wilderSmooth(plusDM, period);
  const smoothMDM = wilderSmooth(minusDM, period);

  const plusDI  = smoothPDM.map((p, i) => smoothTR[i] > 0 ? (p / smoothTR[i]) * 100 : 0);
  const minusDI = smoothMDM.map((m, i) => smoothTR[i] > 0 ? (m / smoothTR[i]) * 100 : 0);
  const dx = plusDI.map((p, i) =>
    (p + minusDI[i]) > 0 ? Math.abs(p - minusDI[i]) / (p + minusDI[i]) * 100 : 0
  );

  return wilderSmooth(dx, period);
}

function wilderSmooth(values: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period) { result.push(NaN); continue; }
    if (i === period) {
      result.push(values.slice(0, period).reduce((a, b) => a + b, 0));
      continue;
    }
    result.push(result[i - 1] - result[i - 1] / period + values[i]);
  }
  return result;
}

function emaLast(values: number[], period: number): number {
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function std(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
