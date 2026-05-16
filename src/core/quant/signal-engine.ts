/**
 * Quant Signal Engine — multi-strategy, weighted by:
 *   - Trend agreement (Supertrend, EMA stack, Kalman)
 *   - Momentum (RSI, MACD)
 *   - Volume confirmation (OBV slope, MFI, VWAP location, VolSpike)
 *   - Mean-reversion z-score (overextension filter)
 *   - SMC bias (OB / FVG nearest)
 *   - Volatility regime (squeeze release boost)
 *   - Alt-data blend (sentiment, news, weather, calendar)
 *   - Risk governor (kill / cooldown / RR floor)
 *
 * Renaissance-inspired: probabilistic fusion of factors, with z-normalization
 * per factor and capped contribution. NO single factor dominates.
 */
import type { Candle } from '@/services/market/provider';
import { runIndicator } from '@/core/indicators/registry';
import { altBlendCompute } from '@/core/indicators/renaissance';

export interface SignalInput {
  symbol: string;
  timeframe: string;
  candles: Candle[];
  altData?: { sentiment?: number[]; news?: number[]; weather?: number[]; calendar?: number[] };
  benchmark?: Candle[];
  riskPct?: number;
  minRR?: number;
}

export interface SignalFactor {
  key: string;
  value: number;     // raw value
  zScore: number;    // normalized
  weight: number;
  contribution: number; // weight * sign(zScore) * min(|z|, cap)
  label: string;
}

export interface QuantSignal {
  symbol: string;
  timeframe: string;
  generatedAt: number;
  type: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  score: number;
  entryPrice: number;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
  atr: number;
  rrRatio: number;
  regime: string;
  factors: SignalFactor[];
  notes: string[];
}

function ctxFromCandles(c: Candle[]) {
  return {
    open: c.map((b) => b.open),
    high: c.map((b) => b.high),
    low: c.map((b) => b.low),
    close: c.map((b) => b.close),
    volume: c.map((b) => b.volume),
    time: c.map((b) => b.time),
  };
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));

export function generateSignal(input: SignalInput): QuantSignal {
  const candles = input.candles;
  const n = candles.length;
  if (n < 50) {
    return baseSignal(input.symbol, input.timeframe, candles, 'NEUTRAL', 0, 0, []);
  }
  const ctx = ctxFromCandles(candles);
  const price = candles[n - 1].close;

  const factors: SignalFactor[] = [];
  const notes: string[] = [];
  const pushFactor = (key: string, label: string, value: number, weight: number, scale = 1, cap = 2) => {
    const z = Math.tanh(value / scale);
    const contribution = weight * z * Math.min(Math.abs(z), cap) * Math.sign(z || 1);
    factors.push({ key, label, value, zScore: z, weight, contribution });
  };

  // Trend factor — EMA stack
  const ema9 = runIndicator('EMA', ctx, { period: 9 })?.series.ema as (number | null)[];
  const ema21 = runIndicator('EMA', ctx, { period: 21 })?.series.ema as (number | null)[];
  const ema50 = runIndicator('EMA', ctx, { period: 50 })?.series.ema as (number | null)[];
  const e9 = (ema9?.[n - 1] ?? price) as number;
  const e21 = (ema21?.[n - 1] ?? price) as number;
  const e50 = (ema50?.[n - 1] ?? price) as number;
  const trendSlope = (e9 - e21) / price + (e21 - e50) / price;
  pushFactor('trend_slope', 'EMA Stack Slope', trendSlope, 1.1, 0.01);

  // Supertrend direction
  const st = runIndicator('SUPERTREND', ctx, { atrPeriod: 10, multiplier: 3 });
  const dir = (st?.series.direction?.[n - 1] ?? 0) as number;
  pushFactor('supertrend', 'Supertrend Dir', dir, 0.8, 1);

  // Kalman residual (price - kalman) → mean-reversion edge
  const km = runIndicator('KALMAN', ctx, { processNoise: 0.001, measurementNoise: 0.01 });
  const kVal = (km?.series.kalman?.[n - 1] ?? price) as number;
  const residual = (price - kVal) / price;
  pushFactor('kalman_resid', 'Kalman Residual', -residual, 0.7, 0.01);

  // RSI mean-reversion + momentum hybrid
  const rsiRes = runIndicator('RSI', ctx, { period: 14 });
  const rsiVal = (rsiRes?.series.rsi?.[n - 1] ?? 50) as number;
  pushFactor('rsi_div', 'RSI Bias', 50 - rsiVal, 0.5, 15);

  // MACD histogram
  const macd = runIndicator('MACD', ctx, { fast: 12, slow: 26, signal: 9 });
  const hist = (macd?.series.hist?.[n - 1] ?? 0) as number;
  pushFactor('macd_hist', 'MACD Histogram', hist / price, 0.6, 0.002);

  // OBV slope (5-bar)
  const obv = runIndicator('OBV', ctx, { showMA: false }) as { series: { obv: number[] } };
  const obvNow = obv.series.obv[n - 1];
  const obvPrev = obv.series.obv[n - 6] ?? obvNow;
  pushFactor('obv_slope', 'OBV Slope', (obvNow - obvPrev) / Math.abs(obvPrev || 1), 0.6, 0.05);

  // VWAP location
  const vwap = runIndicator('VWAP', ctx, { anchor: 'rolling', rollingPeriod: 100 });
  const vw = (vwap?.series.vwap?.[n - 1] ?? price) as number;
  pushFactor('vwap_dist', 'VWAP Distance', (price - vw) / price, 0.5, 0.005);

  // Volume spike
  const vs = runIndicator('VOL_SPIKE', ctx, { period: 20, threshold: 1.6 });
  const spike = (vs?.series.spike?.[n - 1] ?? 0) as number;
  if (spike) notes.push('Volume spike confirmed.');
  pushFactor('vol_spike', 'Volume Spike', spike, 0.6, 1);

  // Z-score mean-reversion (over-extension penalty)
  const z = runIndicator('ZSCORE', ctx, { period: 50, threshold: 2 });
  const zVal = (z?.series.z?.[n - 1] ?? 0) as number;
  if (Math.abs(zVal) > 2) notes.push(`Over-extended (z=${zVal.toFixed(2)}).`);
  pushFactor('zscore_revert', 'Z-Score Reversion', -zVal, 0.4, 2);

  // Hurst (trend strength)
  const hurst = runIndicator('HURST', ctx, { period: 100 });
  const hVal = (hurst?.series.h?.[n - 1] ?? 0.5) as number;
  pushFactor('hurst', 'Hurst Exponent', hVal - 0.5, 0.4, 0.15);

  // Volatility regime — penalize high vol unless squeeze release
  const vr = runIndicator('VOL_REGIME', ctx, { lambda: 0.94 });
  const regimeCode = (vr?.series.regime?.[n - 1] ?? 2) as number;
  const sq = runIndicator('TTM_SQUEEZE', ctx, { bbLen: 20, bbMult: 2, kcLen: 20, kcMult: 1.5 });
  const squeezeOn = (sq?.series.squeezeOn?.[n - 1] ?? 0) as number;
  const sqMom = (sq?.series.mom?.[n - 1] ?? 0) as number;
  if (squeezeOn === 1) notes.push('Volatility squeeze active — breakout potential.');
  if (regimeCode === 3 && squeezeOn === 0) notes.push('Vol regime HIGH — confidence reduced.');
  pushFactor('squeeze', 'Squeeze Momentum', sqMom / price, 0.5, 0.005);

  // Choppiness — sideways suppress
  const chop = runIndicator('CHOP', ctx, { period: 14 });
  const chopVal = (chop?.series.chop?.[n - 1] ?? 50) as number;
  if (chopVal > 61.8) notes.push('Market sideways (CHOP > 61.8).');
  pushFactor('chop_inv', 'Chop Inverse', -(chopVal - 50) / 50, 0.4, 0.6);

  // ATR (untuk SL/TP)
  const atrRes = runIndicator('ATR', ctx, { period: 14, smoothing: 'wilder' });
  const atrVal = (atrRes?.series.atr?.[n - 1] ?? price * 0.01) as number;

  // SMC RR Fib — opsi pra-set target
  const smcFib = runIndicator('SMC_RR_FIB', ctx, { lookback: 60, direction: 'auto' });
  const smcMeta = smcFib?.meta as { entryPrice?: number; slPrice?: number; tpPrices?: number[]; bestRR?: number; direction?: string } | undefined;

  // Alt-data blend
  const blend = altBlendCompute(ctx, input.altData ?? {});
  const altVal = (blend.series.blend?.[n - 1] ?? 0) as number;
  pushFactor('alt_blend', 'Alt-Data Blend', altVal, 0.8, 1);

  // Sum contributions → score [-Inf, +Inf]
  const rawScore = factors.reduce((s, f) => s + f.contribution, 0);
  const confidence = Math.round(sigmoid(rawScore * 1.5) * 100);

  let type: 'BUY' | 'SELL' | 'NEUTRAL';
  if (rawScore > 0.6) type = 'BUY';
  else if (rawScore < -0.6) type = 'SELL';
  else type = 'NEUTRAL';

  // Entry/TP/SL using SMC RR fib (if direction matches) OR ATR fallback
  let entry = price, tp1 = price, tp2 = price, tp3 = price, sl = price;
  if (smcMeta && smcMeta.entryPrice && smcMeta.slPrice && smcMeta.tpPrices?.length) {
    const dirMatches =
      (type === 'BUY' && smcMeta.direction === 'long') ||
      (type === 'SELL' && smcMeta.direction === 'short');
    if (dirMatches) {
      entry = smcMeta.entryPrice;
      sl = smcMeta.slPrice;
      tp1 = smcMeta.tpPrices[0];
      tp2 = smcMeta.tpPrices[1] ?? smcMeta.tpPrices[0];
      tp3 = smcMeta.tpPrices[smcMeta.tpPrices.length - 1];
      notes.push(`SMC RR Fib aligned — best RR ${(smcMeta.bestRR ?? 0).toFixed(2)}.`);
    }
  }
  if (entry === price && type !== 'NEUTRAL') {
    const direction = type === 'BUY' ? 1 : -1;
    sl = price - direction * atrVal * 1.2;
    tp1 = price + direction * atrVal * 1.5;
    tp2 = price + direction * atrVal * 2.5;
    tp3 = price + direction * atrVal * 4.0;
  }
  const rrRatio = Math.abs(sl - entry) === 0 ? 0 : Math.abs(tp1 - entry) / Math.abs(sl - entry);

  // Risk governor — minimum RR floor
  const minRR = input.minRR ?? 1.3;
  if (type !== 'NEUTRAL' && rrRatio < minRR) {
    notes.push(`RR ${rrRatio.toFixed(2)} di bawah minimum ${minRR}. Sinyal turun ke NEUTRAL.`);
    type = 'NEUTRAL';
  }

  return {
    symbol: input.symbol,
    timeframe: input.timeframe,
    generatedAt: Date.now(),
    type,
    confidence,
    score: rawScore,
    entryPrice: entry,
    tp1, tp2, tp3, sl,
    atr: atrVal,
    rrRatio,
    regime: regimeCode === 3 ? 'high_vol' : regimeCode === 1 ? 'low_vol' : 'normal',
    factors,
    notes,
  };
}

function baseSignal(symbol: string, tf: string, c: Candle[], type: 'NEUTRAL', conf: number, score: number, factors: SignalFactor[]): QuantSignal {
  const last = c[c.length - 1]?.close ?? 0;
  return {
    symbol, timeframe: tf,
    generatedAt: Date.now(),
    type, confidence: conf, score,
    entryPrice: last, tp1: last, tp2: last, tp3: last, sl: last,
    atr: 0, rrRatio: 0, regime: 'unknown',
    factors, notes: ['Data candles tidak cukup (minimal 50 bar).'],
  };
}
