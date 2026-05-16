/**
 * Atlas Quant · Feature extractor for ML signal scoring
 * ------------------------------------------------------------
 * Pulls 24 deterministic numeric features from OHLCV that map well
 * onto a logistic / gradient-boosted classifier. All features are
 * normalised to roughly [-3, +3] so a simple logistic model with
 * pre-trained coefficients is well-conditioned.
 */

import { computeIndicators } from '@/src/core/indicators/client';

export interface OHLCVBar {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

export interface FeatureVector {
  rsi14_z: number;
  stochK_z: number;
  macdHist_z: number;
  bbPercentB: number;
  adx14: number;
  emaSpread_9_21_z: number;
  emaSpread_21_50_z: number;
  emaSpread_50_200_z: number;
  vwapDist_z: number;
  volumeZ: number;
  obvSlope: number;
  cmf20: number;
  mfi14: number;
  atrPct: number;
  bbWidth: number;
  consolidationScore: number;
  candleBodyZ: number;
  upperWickRatio: number;
  lowerWickRatio: number;
  trendStrength: number;
  momentum10: number;
  zScore20: number;
  returnPct5: number;
  returnPct20: number;
}

function safeLast<T>(arr: T[], offset = 0): T | undefined {
  return arr[arr.length - 1 - offset];
}

function zscore(values: number[], n = 20): number {
  if (values.length < n + 1) return 0;
  const slice = values.slice(-n);
  const mean = slice.reduce((a, b) => a + b, 0) / n;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  return std > 0 ? (slice[slice.length - 1] - mean) / std : 0;
}

function clamp(v: number, min = -5, max = 5): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  return Math.max(min, Math.min(max, v));
}

export function extractFeatures(candles: OHLCVBar[]): FeatureVector | null {
  if (candles.length < 50) return null;
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const volumes = candles.map((c) => c.volume);
  const opens = candles.map((c) => c.open);

  const ind = computeIndicators(closes, highs, lows, volumes, opens);
  const last = candles.length - 1;

  const rsi = ind.rsi(14);
  const stoch = ind.stochastic();
  const macd = ind.macd();
  const bb = ind.bollingerBands(20, 2);
  const adx = ind.adx(14);
  const atr = ind.atr(14);
  const ema9 = ind.ema(9);
  const ema21 = ind.ema(21);
  const ema50 = ind.ema(50);
  const ema200 = ind.ema(200);
  const vwap = ind.vwap();
  const obv = ind.obv();
  const cmf = ind.cmf(20);
  const mfi = ind.mfi(14);

  const price = closes[last];
  const lastRsi = rsi[last] ?? 50;
  const lastStochK = stoch.k[last] ?? 50;
  const lastMacdH = macd.histogram[last] ?? 0;
  const lastAdx = adx.adx[last] ?? 20;
  const lastBbUp = bb.upper[last];
  const lastBbLow = bb.lower[last];
  const lastBbMid = bb.middle[last];
  const lastAtr = atr[last] ?? price * 0.01;
  const lastVwap = vwap[last] ?? price;
  const lastE9 = ema9[last] ?? price;
  const lastE21 = ema21[last] ?? price;
  const lastE50 = ema50[last] ?? price;
  const lastE200 = ema200[last] ?? price;

  const bbWidth = lastBbMid > 0 ? (lastBbUp - lastBbLow) / lastBbMid : 0;
  const bbPercentB = lastBbUp !== lastBbLow ? (price - lastBbLow) / (lastBbUp - lastBbLow) : 0.5;

  const obvSlope = (() => {
    if (obv.length < 21) return 0;
    const recent = obv[obv.length - 1];
    const prev = obv[obv.length - 21];
    return prev !== 0 ? (recent - prev) / Math.abs(prev) : 0;
  })();

  const volZ = zscore(volumes, 20);

  const consolidationScore = 1 / (1 + bbWidth * 100); // bigger = tighter range

  const candle = candles[last];
  const range = candle.high - candle.low;
  const body = Math.abs(candle.close - candle.open);
  const bodyZ = range > 0 ? body / range : 0;
  const upperWick = range > 0 ? (candle.high - Math.max(candle.open, candle.close)) / range : 0;
  const lowerWick = range > 0 ? (Math.min(candle.open, candle.close) - candle.low) / range : 0;

  const momentum10 = closes[last - 10] ? (price - closes[last - 10]) / closes[last - 10] : 0;
  const ret5 = closes[last - 5] ? (price - closes[last - 5]) / closes[last - 5] : 0;
  const ret20 = closes[last - 20] ? (price - closes[last - 20]) / closes[last - 20] : 0;

  // Trend strength: -1..+1 based on EMA stacking
  let trend = 0;
  if (lastE9 > lastE21) trend += 0.25; else trend -= 0.25;
  if (lastE21 > lastE50) trend += 0.25; else trend -= 0.25;
  if (lastE50 > lastE200) trend += 0.25; else trend -= 0.25;
  if (price > lastE200) trend += 0.25; else trend -= 0.25;

  return {
    rsi14_z: clamp((lastRsi - 50) / 18),
    stochK_z: clamp((lastStochK - 50) / 28),
    macdHist_z: clamp(lastMacdH / Math.max(0.0001, lastAtr * 0.5)),
    bbPercentB: clamp((bbPercentB - 0.5) * 2),
    adx14: clamp((lastAdx - 25) / 15),
    emaSpread_9_21_z: clamp((lastE9 - lastE21) / Math.max(0.0001, lastAtr * 0.5)),
    emaSpread_21_50_z: clamp((lastE21 - lastE50) / Math.max(0.0001, lastAtr * 0.5)),
    emaSpread_50_200_z: clamp((lastE50 - lastE200) / Math.max(0.0001, lastAtr)),
    vwapDist_z: clamp((price - lastVwap) / Math.max(0.0001, lastAtr * 0.5)),
    volumeZ: clamp(volZ),
    obvSlope: clamp(obvSlope * 10),
    cmf20: clamp((cmf[last] ?? 0) * 5),
    mfi14: clamp(((mfi[last] ?? 50) - 50) / 18),
    atrPct: clamp((lastAtr / price) * 100),
    bbWidth: clamp(bbWidth * 50),
    consolidationScore: clamp(consolidationScore),
    candleBodyZ: clamp((bodyZ - 0.5) * 2),
    upperWickRatio: clamp(upperWick * 2),
    lowerWickRatio: clamp(lowerWick * 2),
    trendStrength: clamp(trend * 3),
    momentum10: clamp(momentum10 * 25),
    zScore20: clamp(zscore(closes, 20)),
    returnPct5: clamp(ret5 * 30),
    returnPct20: clamp(ret20 * 15),
  };
}

export const FEATURE_KEYS: Array<keyof FeatureVector> = [
  'rsi14_z','stochK_z','macdHist_z','bbPercentB','adx14',
  'emaSpread_9_21_z','emaSpread_21_50_z','emaSpread_50_200_z',
  'vwapDist_z','volumeZ','obvSlope','cmf20','mfi14','atrPct',
  'bbWidth','consolidationScore','candleBodyZ','upperWickRatio',
  'lowerWickRatio','trendStrength','momentum10','zScore20',
  'returnPct5','returnPct20',
];
