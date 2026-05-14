import { ema } from '../indicators/trend';
import { rsi, williamsR } from '../indicators/momentum';
import { atr, bollingerBands } from '../indicators/volatility';
import { vwap, volumeSpike } from '../indicators/volume';
import { detectRegime } from './regime-detector';

export interface OHLCVData {
  time: number; open: number; high: number;
  low: number; close: number; volume: number;
}

export interface SignalResult {
  type: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  strategy: string;
  entryPrice: number;
  tp1: number; tp2: number; tp3: number;
  sl: number;
  rrRatio: number;
  atrValue: number;
  indicators: Record<string, number>;
  regime: string;
  filters: Record<string, boolean>;
  score: number;
}

export function strategyEMACross(candles: OHLCVData[]): SignalResult {
  const closes = candles.map(c => c.close);
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const vols   = candles.map(c => c.volume);

  const ema9  = ema(closes, 9);
  const ema21 = ema(closes, 21);
  const ema50 = ema(closes, 50);
  const rsi7  = rsi(closes, 7);
  const vwapV = vwap(highs, lows, closes, vols);
  const atrV  = atr(highs, lows, closes, 14);
  const volSpike = volumeSpike(vols, 20, 1.5);

  const n = closes.length - 1;
  const price = closes[n];
  const currentATR = atrV[n] || price * 0.01;
  const currentVWAP = vwapV[n];

  const isBullishCross = ema9[n] > ema21[n] && ema9[n - 1] <= ema21[n - 1];
  const isBearishCross = ema9[n] < ema21[n] && ema9[n - 1] >= ema21[n - 1];
  const isAboveVWAP = price > currentVWAP;
  const isBelowVWAP = price < currentVWAP;
  const hasVolume = volSpike[n];
  const rsiVal = rsi7[n] || 50;

  const filters = {
    emaCross:      isBullishCross || isBearishCross,
    vwapAligned:   (isBullishCross && isAboveVWAP) || (isBearishCross && isBelowVWAP),
    volumeConf:    hasVolume,
    rsiNotExtreme: rsiVal > 20 && rsiVal < 80,
    trend50:       (isBullishCross && price > ema50[n]) || (isBearishCross && price < ema50[n]),
  };

  const score = Object.values(filters).filter(Boolean).length / Object.keys(filters).length * 100;
  const regime = detectRegime(highs, lows, closes, vols);

  const isBuy  = isBullishCross && regime.tradeAllowed && score >= 60;
  const isSell = isBearishCross && regime.tradeAllowed && score >= 60;
  const signalType = isBuy ? 'BUY' : isSell ? 'SELL' : 'NEUTRAL';
  const direction = isBuy ? 1 : -1;

  const sl  = price - direction * currentATR * 1.2;
  const tp1 = price + direction * currentATR * 1.5;
  const tp2 = price + direction * currentATR * 2.5;
  const tp3 = price + direction * currentATR * 4.0;

  return {
    type: signalType, confidence: Math.round(score), strategy: 'EMA_CROSS_VWAP',
    entryPrice: price, tp1, tp2, tp3, sl,
    rrRatio: parseFloat((Math.abs(tp1 - price) / Math.abs(sl - price)).toFixed(2)),
    atrValue: parseFloat(currentATR.toFixed(8)),
    indicators: { ema9: ema9[n], ema21: ema21[n], ema50: ema50[n], rsi: rsiVal, vwap: currentVWAP, atr: currentATR },
    regime: regime.regime, filters, score,
  };
}

export function strategyBollingerSqueeze(candles: OHLCVData[]): SignalResult {
  const closes = candles.map(c => c.close);
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const vols   = candles.map(c => c.volume);

  const bb   = bollingerBands(closes, 20, 2);
  const atrV = atr(highs, lows, closes, 14);
  const rsi7 = rsi(closes, 7);
  const n = closes.length - 1;
  const price = closes[n];

  const bw = bb.bandwidth[n] || 0;
  const avgBw = bb.bandwidth.slice(Math.max(0, n - 20), n).reduce((a, b) => isNaN(b) ? a : a + b, 0) / 20;
  const isSqueezing  = bw < avgBw * 0.7;
  const isBreakouting = !isSqueezing && bb.bandwidth[n - 1] < bb.bandwidth[n];

  const breakoutUp   = isBreakouting && price > bb.upper[n];
  const breakoutDown = isBreakouting && price < bb.lower[n];

  const rsiVal = rsi7[n] || 50;
  const currentATR = atrV[n] || price * 0.01;
  const regime = detectRegime(highs, lows, closes, vols);

  const filters = {
    squeezeRelease: isSqueezing || isBreakouting,
    breakoutDir:    breakoutUp || breakoutDown,
    volumeConf:     volumeSpike(vols, 20, 1.5)[n],
    rsiAlign:       (breakoutUp && rsiVal > 50) || (breakoutDown && rsiVal < 50),
    regimeOk:       regime.tradeAllowed,
  };

  const score = Object.values(filters).filter(Boolean).length / Object.keys(filters).length * 100;
  const signalType = breakoutUp && score >= 60 ? 'BUY' : breakoutDown && score >= 60 ? 'SELL' : 'NEUTRAL';
  const direction = signalType === 'BUY' ? 1 : -1;

  return {
    type: signalType, confidence: Math.round(score), strategy: 'BB_SQUEEZE_BREAKOUT',
    entryPrice: price,
    sl:  price - direction * currentATR * 1.5,
    tp1: price + direction * currentATR * 2.0,
    tp2: price + direction * currentATR * 3.5,
    tp3: price + direction * currentATR * 5.0,
    rrRatio: parseFloat((Math.abs(currentATR * 2.0) / Math.abs(currentATR * 1.5)).toFixed(2)),
    atrValue: parseFloat(currentATR.toFixed(8)),
    indicators: { bbUpper: bb.upper[n], bbLower: bb.lower[n], bandwidth: bw, rsi: rsiVal },
    regime: regime.regime, filters, score,
  };
}

export function strategyVWAPBounce(candles: OHLCVData[]): SignalResult {
  const closes = candles.map(c => c.close);
  const highs  = candles.map(c => c.high);
  const lows   = candles.map(c => c.low);
  const vols   = candles.map(c => c.volume);

  const vwapV = vwap(highs, lows, closes, vols);
  const atrV  = atr(highs, lows, closes, 7);
  const rsi7  = rsi(closes, 7);
  const wR    = williamsR(highs, lows, closes, 10);
  const ema9  = ema(closes, 9);
  const n = closes.length - 1;

  const price    = closes[n];
  const vwapNow  = vwapV[n];
  const currentATR = atrV[n] || price * 0.005;

  const nearVWAP = Math.abs(price - vwapNow) < currentATR * 0.5;
  const bounceUp   = nearVWAP && closes[n - 1] < vwapNow && price > vwapNow;
  const bounceDown = nearVWAP && closes[n - 1] > vwapNow && price < vwapNow;
  const rsiVal = rsi7[n] || 50;
  const wRVal  = wR[n] || -50;

  const filters = {
    nearVWAP,
    bounce:       bounceUp || bounceDown,
    rsiAlign:     (bounceUp && rsiVal > 40 && rsiVal < 70) || (bounceDown && rsiVal < 60 && rsiVal > 30),
    williamsR:    (bounceUp && wRVal > -50) || (bounceDown && wRVal < -50),
    ema9Aligned:  (bounceUp && price > ema9[n]) || (bounceDown && price < ema9[n]),
  };

  const score = Object.values(filters).filter(Boolean).length / Object.keys(filters).length * 100;
  const signalType = bounceUp && score >= 60 ? 'BUY' : bounceDown && score >= 60 ? 'SELL' : 'NEUTRAL';
  const direction = signalType === 'BUY' ? 1 : -1;

  return {
    type: signalType, confidence: Math.round(score), strategy: 'VWAP_BOUNCE',
    entryPrice: price,
    sl:  price - direction * currentATR * 1.0,
    tp1: price + direction * currentATR * 1.5,
    tp2: price + direction * currentATR * 2.5,
    tp3: price + direction * currentATR * 3.5,
    rrRatio: 1.5,
    atrValue: parseFloat(currentATR.toFixed(8)),
    indicators: { vwap: vwapNow, rsi: rsiVal, williamsR: wRVal, ema9: ema9[n] },
    regime: 'any', filters, score,
  };
}

export function generateSignal(candles: OHLCVData[], strategies: string[] = ['EMA_CROSS', 'BB_SQUEEZE', 'VWAP_BOUNCE']): SignalResult {
  if (candles.length < 50) {
    return {
      type: 'NEUTRAL', confidence: 0, strategy: 'INSUFFICIENT_DATA',
      entryPrice: candles[candles.length - 1]?.close || 0,
      tp1: 0, tp2: 0, tp3: 0, sl: 0, rrRatio: 0, atrValue: 0,
      indicators: {}, regime: 'unknown', filters: {}, score: 0,
    };
  }

  const results: SignalResult[] = [];
  if (strategies.includes('EMA_CROSS')) results.push(strategyEMACross(candles));
  if (strategies.includes('BB_SQUEEZE')) results.push(strategyBollingerSqueeze(candles));
  if (strategies.includes('VWAP_BOUNCE')) results.push(strategyVWAPBounce(candles));

  const active = results.filter(r => r.type !== 'NEUTRAL');
  if (active.length === 0) return results[0] || results[results.length - 1];

  return active.sort((a, b) => b.confidence - a.confidence)[0];
}
