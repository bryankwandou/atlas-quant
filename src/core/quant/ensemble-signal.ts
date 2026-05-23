/**
 * Atlas Quant v2 — Multi-Factor Ensemble Signal Engine
 *
 * Accuracy target: 98%+
 * Architecture:
 *   1. Technical Layer (6 independent strategies)
 *   2. Regime Filter (ADX + volatility + EMAs)
 *   3. Risk Governor (ATR-based position sizing)
 *   4. Macro Layer (Fear/Greed + VIX + CB rates + Events)
 *   5. Bayesian Composite (weighted vote with Kelly criterion)
 */

import { computeIndicators } from '../indicators/client';

export interface OHLCV {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

export interface StrategyVote {
  name: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;   // 0-100
  reason: string;
  weight: number;       // 0-1 (importance of this strategy)
}

export interface MacroContext {
  fearGreedValue?: number;          // 0-100
  vix?: number;                     // CBOE VIX
  macroRegimeScore?: number;        // -100 to +100
  fundingRatePct?: number;          // decimal percent
  longShortRatio?: number;          // Binance L/S ratio
  eventRisk?: 'low' | 'medium' | 'high';
  rateEnvironment?: 'tightening' | 'easing' | 'neutral' | 'unknown';
  compositeMultiplier?: number;     // 0.5 to 1.5
}

export interface EnsembleSignal {
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;        // 0-100
  adjustedConfidence: number; // confidence after macro adjustment
  rawScore: number;          // -100 to +100 (negative = sell)
  votes: StrategyVote[];
  bullVotes: number;
  bearVotes: number;
  neutralVotes: number;
  consensus: number;         // 0-100 (100 = all agree)
  regime: string;
  regime_label: string;
  entryPrice: number;
  sl: number;
  tp1: number; tp2: number; tp3: number;
  rrRatio: number;
  atrValue: number;
  kellyFraction: number;    // Recommended position size as fraction of capital
  macroNotes: string[];
  indicators: Record<string, number>;
  timestamp: number;
}

// ── Individual Strategies ─────────────────────────────────────────────────────

function stratEMACross(ind: ReturnType<typeof computeIndicators>, closes: number[], n: number): StrategyVote {
  const e9 = ind.ema(9), e21 = ind.ema(21), e50 = ind.ema(50), e200 = ind.ema(200);
  const bullAlign = e9[n] > e21[n] && e21[n] > e50[n] && closes[n] > e200[n];
  const bearAlign  = e9[n] < e21[n] && e21[n] < e50[n] && closes[n] < e200[n];
  const cross9o21  = e9[n] > e21[n] && e9[n - 1] <= e21[n - 1]; // Golden cross
  const cross9u21  = e9[n] < e21[n] && e9[n - 1] >= e21[n - 1]; // Death cross
  const score = (bullAlign ? 2 : 0) + (cross9o21 ? 2 : 0) - (bearAlign ? 2 : 0) - (cross9u21 ? 2 : 0);
  const signal = score > 1 ? 'BUY' : score < -1 ? 'SELL' : 'NEUTRAL';
  return { name: 'EMA_CROSS', signal, confidence: Math.min(100, Math.abs(score) * 25), reason: `EMA alignment ${bullAlign ? 'bull' : bearAlign ? 'bear' : 'neutral'}`, weight: 0.20 };
}

function stratVWAP(ind: ReturnType<typeof computeIndicators>, closes: number[], highs: number[], lows: number[], volumes: number[], n: number): StrategyVote {
  const vwapArr = ind.vwap();
  const vwapBands = ind.vwapBands(2);
  const price = closes[n];
  const vwapVal = vwapArr[n];
  const aboveVWAP = price > vwapVal;
  const nearUpper = price >= vwapBands.upper[n] * 0.998;
  const nearLower = price <= vwapBands.lower[n] * 1.002;
  const bullBounce = nearLower && closes[n] > closes[n - 1];
  const bearBounce = nearUpper && closes[n] < closes[n - 1];
  let score = aboveVWAP ? 1 : -1;
  if (bullBounce) score += 1.5;
  if (bearBounce) score -= 1.5;
  const signal = score > 1 ? 'BUY' : score < -1 ? 'SELL' : 'NEUTRAL';
  return { name: 'VWAP_BOUNCE', signal, confidence: Math.min(100, Math.abs(score) * 33), reason: `Price ${(((price - vwapVal) / vwapVal) * 100).toFixed(2)}% from VWAP`, weight: 0.15 };
}

function stratRSIDiv(ind: ReturnType<typeof computeIndicators>, closes: number[], n: number): StrategyVote {
  const rsiArr = ind.rsi(14);
  const rsi = rsiArr[n];
  const rsiPrev = rsiArr[n - 3] || rsi;
  const priceTrend = closes[n] > closes[n - 3];
  const rsiTrend = rsi > rsiPrev;
  const bullDiv = !priceTrend && rsiTrend && rsi < 45;   // Price falling, RSI rising = hidden bull div
  const bearDiv = priceTrend && !rsiTrend && rsi > 55;   // Price rising, RSI falling = hidden bear div
  const oversold = rsi < 30;
  const overbought = rsi > 70;
  let score = (oversold ? 2 : 0) + (bullDiv ? 1.5 : 0) - (overbought ? 2 : 0) - (bearDiv ? 1.5 : 0);
  const signal = score >= 1.5 ? 'BUY' : score <= -1.5 ? 'SELL' : 'NEUTRAL';
  return { name: 'RSI_DIV', signal, confidence: Math.min(100, Math.abs(score) * 30), reason: `RSI=${rsi.toFixed(1)} ${oversold ? 'OVERSOLD' : overbought ? 'OVERBOUGHT' : bullDiv ? 'BULL_DIV' : bearDiv ? 'BEAR_DIV' : ''}`, weight: 0.15 };
}

function stratBBSqueeze(ind: ReturnType<typeof computeIndicators>, closes: number[], n: number): StrategyVote {
  const bb = ind.bollingerBands(20, 2);
  const kc = ind.keltner(20, 10, 1.5);
  // Squeeze: BB inside KC
  const squeeze = bb.upper[n] < kc.upper[n] && bb.lower[n] > kc.lower[n];
  const squeezeRelease = !squeeze && (bb.upper[n - 1] < kc.upper[n - 1]);
  const aboveUpper = closes[n] > bb.upper[n];
  const belowLower = closes[n] < bb.lower[n];
  const momLine = ind.squeezeMomentum(20);
  const momNow = momLine[n] || 0;
  const momPrev = momLine[n - 1] || 0;
  const momRising = momNow > momPrev;
  let score = (squeezeRelease && momNow > 0 && momRising ? 2 : 0)
    + (aboveUpper ? 1 : 0)
    - (squeezeRelease && momNow < 0 && !momRising ? 2 : 0)
    - (belowLower ? 1 : 0);
  const signal = score >= 1.5 ? 'BUY' : score <= -1.5 ? 'SELL' : 'NEUTRAL';
  return { name: 'BB_SQUEEZE', signal, confidence: Math.min(100, Math.abs(score) * 35), reason: `BB squeeze ${squeeze ? 'ON' : squeezeRelease ? 'RELEASED' : 'OFF'} mom=${momNow.toFixed(4)}`, weight: 0.15 };
}

function stratMACD(ind: ReturnType<typeof computeIndicators>, n: number): StrategyVote {
  const { macd: macdLine, signal: sigLine, histogram } = ind.macd(12, 26, 9);
  const histNow  = histogram[n] || 0;
  const histPrev = histogram[n - 1] || 0;
  const cross_bull = macdLine[n] > sigLine[n] && macdLine[n - 1] <= sigLine[n - 1];
  const cross_bear = macdLine[n] < sigLine[n] && macdLine[n - 1] >= sigLine[n - 1];
  const histAccel = histNow > 0 && histNow > histPrev;
  const histDecel = histNow < 0 && histNow < histPrev;
  let score = (cross_bull ? 2 : 0) + (histAccel ? 1 : 0) - (cross_bear ? 2 : 0) - (histDecel ? 1 : 0);
  const signal = score >= 2 ? 'BUY' : score <= -2 ? 'SELL' : 'NEUTRAL';
  return { name: 'MACD_CROSS', signal, confidence: Math.min(100, Math.abs(score) * 33), reason: `MACD ${cross_bull ? 'bull cross' : cross_bear ? 'bear cross' : 'no cross'} hist=${histNow.toFixed(5)}`, weight: 0.15 };
}

function stratSupertrend(ind: ReturnType<typeof computeIndicators>, closes: number[], n: number): StrategyVote {
  const st = ind.supertrend(10, 3);
  const dir = st.direction[n];
  const dirPrev = st.direction[n - 1];
  const flip_bull = dir === 1 && dirPrev === -1;
  const flip_bear = dir === -1 && dirPrev === 1;
  let score = dir === 1 ? 1.5 : -1.5;
  if (flip_bull) score += 2;
  if (flip_bear) score -= 2;
  const signal = score >= 2 ? 'BUY' : score <= -2 ? 'SELL' : 'NEUTRAL';
  return { name: 'SUPERTREND', signal, confidence: Math.min(100, Math.abs(score) * 28), reason: `Supertrend ${dir === 1 ? 'UP' : 'DOWN'}${flip_bull ? ' FLIP-BULL' : flip_bear ? ' FLIP-BEAR' : ''}`, weight: 0.10 };
}

function stratICH(ind: ReturnType<typeof computeIndicators>, closes: number[], n: number): StrategyVote {
  const ich = ind.ichimoku();
  const price = closes[n];
  const cloudTop    = Math.max(ich.senkouA[n] || 0, ich.senkouB[n] || 0);
  const cloudBottom = Math.min(ich.senkouA[n] || 0, ich.senkouB[n] || 0);
  const aboveCloud  = price > cloudTop;
  const belowCloud  = price < cloudBottom;
  const tenkanAbove = ich.tenkan[n] > ich.kijun[n];
  const chikouBull  = (ich.chikou[n - 26] || price) < price;
  let score = (aboveCloud ? 2 : 0) + (tenkanAbove ? 1 : 0) + (chikouBull ? 1 : 0)
    - (belowCloud ? 2 : 0) - (!tenkanAbove ? 1 : 0) - (!chikouBull ? 1 : 0);
  const signal = score >= 2.5 ? 'BUY' : score <= -2.5 ? 'SELL' : 'NEUTRAL';
  return { name: 'ICHIMOKU', signal, confidence: Math.min(100, Math.abs(score) * 20), reason: `${aboveCloud ? 'Above cloud' : belowCloud ? 'Below cloud' : 'In cloud'} | TK ${tenkanAbove ? '>' : '<'} KJ`, weight: 0.10 };
}

// ── Regime Filter ─────────────────────────────────────────────────────────────

function getRegime(ind: ReturnType<typeof computeIndicators>, closes: number[], highs: number[], lows: number[], volumes: number[], n: number) {
  const adxArr = ind.adx(14);
  const adx = adxArr[n] || 25;
  const atrArr = ind.atr(14);
  const atr = atrArr[n] || closes[n] * 0.02;
  const rng20 = Math.max(...closes.slice(n - 20, n + 1)) - Math.min(...closes.slice(n - 20, n + 1));
  const atrPct = (atr / closes[n]) * 100;
  const e20 = ind.ema(20)[n];
  const e50 = ind.ema(50)[n];
  const trending = adx > 25;
  const volatile = atrPct > 5;
  let label = trending
    ? (closes[n] > e50 ? 'TRENDING_UP' : 'TRENDING_DOWN')
    : volatile ? 'VOLATILE' : 'RANGING';

  return { adx, atr, atrPct, trending, volatile, label, tradeAllowed: adx > 20 || volatile };
}

// ── Main Ensemble Engine ──────────────────────────────────────────────────────

export function runEnsembleSignal(candles: OHLCV[], macro?: MacroContext): EnsembleSignal {
  const len = candles.length;
  const closes  = candles.map(c => c.close);
  const highs   = candles.map(c => c.high);
  const lows    = candles.map(c => c.low);
  const volumes = candles.map(c => c.volume);
  const n = len - 1;

  const ind = computeIndicators(closes, highs, lows, volumes);
  const regime = getRegime(ind, closes, highs, lows, volumes, n);
  const atrArr = ind.atr(14);
  const atr = atrArr[n] || closes[n] * 0.02;

  // Collect votes
  const votes: StrategyVote[] = [
    stratEMACross(ind, closes, n),
    stratVWAP(ind, closes, highs, lows, volumes, n),
    stratRSIDiv(ind, closes, n),
    stratBBSqueeze(ind, closes, n),
    stratMACD(ind, n),
    stratSupertrend(ind, closes, n),
    stratICH(ind, closes, n),
  ];

  // Weighted ensemble scoring
  let bullScore = 0, bearScore = 0;
  let bullVotes = 0, bearVotes = 0, neutralVotes = 0;

  for (const v of votes) {
    if (v.signal === 'BUY') {
      bullScore += v.confidence * v.weight;
      bullVotes++;
    } else if (v.signal === 'SELL') {
      bearScore += v.confidence * v.weight;
      bearVotes++;
    } else {
      neutralVotes++;
    }
  }

  const totalWeight = votes.reduce((s, v) => s + v.weight, 0);
  const rawScore = ((bullScore - bearScore) / totalWeight);   // -100 to +100
  const consensus = ((Math.max(bullVotes, bearVotes, neutralVotes) / votes.length) * 100);

  // Base signal determination
  let signal: EnsembleSignal['signal'] = 'NEUTRAL';
  let confidence = 0;

  if (rawScore >= 15 && bullVotes >= 3) {
    signal = 'BUY';
    confidence = Math.min(98, rawScore + consensus * 0.3);
  } else if (rawScore <= -15 && bearVotes >= 3) {
    signal = 'SELL';
    confidence = Math.min(98, Math.abs(rawScore) + consensus * 0.3);
  } else {
    confidence = 100 - Math.abs(rawScore) * 0.5;
  }

  // Regime filter: reduce confidence in ranging/volatile
  if (!regime.tradeAllowed) confidence *= 0.6;
  if (regime.volatile) confidence *= 0.75;

  // ── Macro adjustment ──────────────────────────────────────────
  let macroMult = macro?.compositeMultiplier ?? 1.0;
  const macroNotes: string[] = [];

  if (macro) {
    // Event risk: don't trade in high-event windows
    if (macro.eventRisk === 'high') {
      signal = 'NEUTRAL';
      confidence = Math.min(confidence, 40);
      macroNotes.push('HIGH-IMPACT EVENT: signal suppressed');
    }
    // VIX spike: reduce confidence sharply
    if (macro.vix && macro.vix > 35) {
      macroMult *= 0.70;
      macroNotes.push(`VIX=${macro.vix.toFixed(1)}: extreme fear, confidence reduced`);
    }
    // Extreme greed in crypto (F&G > 85): shorts more likely to work, longs risky
    if (macro.fearGreedValue && macro.fearGreedValue > 85 && signal === 'BUY') {
      macroMult *= 0.85;
      macroNotes.push(`F&G=${macro.fearGreedValue}: extreme greed, long risk elevated`);
    }
    // Extreme fear (F&G < 15): contrarian longs have higher probability
    if (macro.fearGreedValue && macro.fearGreedValue < 15 && signal === 'BUY') {
      macroMult *= 1.15;
      macroNotes.push(`F&G=${macro.fearGreedValue}: extreme fear = contrarian long opportunity`);
    }
    // Funding rate overcrowding
    if (macro.fundingRatePct && Math.abs(macro.fundingRatePct) > 0.1) {
      macroMult *= 0.88;
      macroNotes.push(`Funding ${macro.fundingRatePct > 0 ? '+' : ''}${macro.fundingRatePct.toFixed(3)}%: overcrowded`);
    }
  }

  const adjustedConfidence = Math.min(98, confidence * macroMult);

  // ── TP/SL via ATR ─────────────────────────────────────────────
  const price = closes[n];
  const dir = signal === 'BUY' ? 1 : signal === 'SELL' ? -1 : 0;
  const atrMult = confidence > 70 ? 1.2 : 1.5;
  const sl  = price - dir * atr * atrMult;
  const tp1 = price + dir * atr * 1.5;
  const tp2 = price + dir * atr * 2.5;
  const tp3 = price + dir * atr * 4.0;
  const risk = Math.abs(price - sl);
  const reward = Math.abs(tp1 - price);
  const rrRatio = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0;

  // Kelly Criterion: f = (p*(b+1) - 1) / b  where p = win probability, b = RR ratio
  const pWin = adjustedConfidence / 100;
  const kellyFraction = rrRatio > 0
    ? Math.max(0, Math.min(0.25, (pWin * (rrRatio + 1) - 1) / rrRatio))
    : 0;

  const rsiArr = ind.rsi(14);
  const vwapArr = ind.vwap();

  return {
    signal,
    confidence: Math.round(confidence),
    adjustedConfidence: Math.round(adjustedConfidence),
    rawScore: parseFloat(rawScore.toFixed(2)),
    votes,
    bullVotes, bearVotes, neutralVotes,
    consensus: Math.round(consensus),
    regime: regime.label,
    regime_label: regime.label,
    entryPrice: price,
    sl, tp1, tp2, tp3, rrRatio,
    atrValue: parseFloat(atr.toFixed(8)),
    kellyFraction: parseFloat(kellyFraction.toFixed(4)),
    macroNotes,
    indicators: {
      rsi: rsiArr[n] || 50,
      adx: regime.adx,
      atr: atr,
      vwap: vwapArr[n] || price,
      ema9: ind.ema(9)[n] || price,
      ema21: ind.ema(21)[n] || price,
      ema50: ind.ema(50)[n] || price,
      ema200: ind.ema(200)[n] || price,
    },
    timestamp: Date.now(),
  };
}
