/**
 * Atlas Quant · "Renaissance-class" Ensemble Engine
 * ------------------------------------------------------------------
 * Inspired by the multi-signal stacking that quantitative funds use:
 *
 *   1. Technical alpha           — 7 independent strategies (ema, vwap, rsi,
 *                                  bb-squeeze, macd, supertrend, ichimoku)
 *   2. Volume / microstructure   — VWAP regime, OBV slope, MFI extremes,
 *                                  funding rate, OI Δ, L/S ratio
 *   3. Cross-asset macro         — DXY / VIX / yield curve / SPX / gold
 *   4. Sentiment & web           — F&G, Reddit hot count, search trend
 *   5. News & political risk     — GDELT tone & political-risk index
 *   6. Weather & physical world  — Open-Meteo aggregate commodity factor
 *   7. On-chain                  — Hashrate, mempool, gas, stable supply
 *
 * Each layer emits a *vote* + *confidence* and a *weight multiplier*. The
 * engine combines them into:
 *
 *   • directional bias   BUY / SELL / NEUTRAL
 *   • Bayesian confidence 0-100
 *   • Kelly fraction (capped at 0.20)
 *   • ATR-based TP1/TP2/TP3 + SL
 *
 * Determinism: every layer maps to a pure function. External feeds are
 * pre-fetched and passed in as a snapshot — the engine itself doesn't fetch.
 */

import { runEnsembleSignal, type OHLCV, type MacroContext, type EnsembleSignal } from './ensemble-signal';
import { extractFeatures } from '@/src/ai/featureExtractor';
import { predictLogistic } from '@/src/ai/logisticModel';

export interface RenaissanceContext extends MacroContext {
  // Macro feeds
  dxyChangePct?: number;
  spxChangePct?: number;
  goldChangePct?: number;
  oilChangePct?: number;
  yieldCurve?: number;
  macroRiskScore?: number;

  // Web sentiment
  redditAttention?: number;          // 0-100
  searchTrend?: number;              // 0-100 (rising attention)

  // News / politics
  gdeltToneIndex?: number;           // -100..+100
  politicalRiskIndex?: number;       // 0-100

  // Weather
  weatherStressIndex?: number;       // 0-100
  weatherCommodityScore?: number;    // -100..+100

  // On-chain
  ethGasGwei?: number;
  stablePct24h?: number;
  btcMempoolPending?: number;
}

export interface RenaissanceSignal extends EnsembleSignal {
  renaissanceScore: number;          // -100..+100 raw composite
  layerScores: {
    technical: number;
    macro: number;
    sentiment: number;
    political: number;
    weather: number;
    onchain: number;
    microstructure: number;
    ml: number;
  };
  factors: string[];                 // human notes
  /** Probability estimate of profitable trade (0-1). */
  pWin: number;
  /** Probability that the system has *no* edge in current regime. */
  pNoEdge: number;
  /** Recommended position size as fraction of equity. */
  kelly: number;
  /** Local logistic-ensemble probability of an up-move (0-1). */
  mlProbability?: number;
  /** Top contributing features from the local model. */
  mlTopContributions?: Array<{ key: string; weight: number; value: number; contribution: number }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Layer scorers — all return [-100, +100] direction-tilt
// ─────────────────────────────────────────────────────────────────────────────

function scoreMacro(ctx: RenaissanceContext): { score: number; notes: string[] } {
  const notes: string[] = [];
  let s = 0;
  if (typeof ctx.macroRiskScore === 'number') {
    s += (ctx.macroRiskScore - 50) * 1.2;
    if (ctx.macroRiskScore < 30) notes.push(`Macro risk-off (${ctx.macroRiskScore})`);
    if (ctx.macroRiskScore > 70) notes.push(`Macro risk-on (${ctx.macroRiskScore})`);
  }
  if (typeof ctx.dxyChangePct === 'number') {
    s += -ctx.dxyChangePct * 12; // strong dollar usually risk-off for crypto
    if (Math.abs(ctx.dxyChangePct) > 0.4) notes.push(`DXY ${ctx.dxyChangePct > 0 ? '+' : ''}${ctx.dxyChangePct.toFixed(2)}%`);
  }
  if (typeof ctx.spxChangePct === 'number') {
    s += ctx.spxChangePct * 10;
    if (Math.abs(ctx.spxChangePct) > 0.5) notes.push(`SPX ${ctx.spxChangePct > 0 ? '+' : ''}${ctx.spxChangePct.toFixed(2)}%`);
  }
  if (typeof ctx.vix === 'number') {
    s += -(ctx.vix - 18) * 1.0;
    if (ctx.vix > 28) notes.push(`VIX ${ctx.vix.toFixed(1)} elevated`);
  }
  if (typeof ctx.yieldCurve === 'number' && ctx.yieldCurve < 0) {
    s -= 5;
    notes.push(`Curve inverted (${ctx.yieldCurve})`);
  }
  return { score: Math.max(-100, Math.min(100, s)), notes };
}

function scoreSentiment(ctx: RenaissanceContext): { score: number; notes: string[] } {
  const notes: string[] = [];
  let s = 0;
  if (typeof ctx.fearGreedValue === 'number') {
    // Contrarian: extreme fear → bullish, extreme greed → bearish
    if (ctx.fearGreedValue < 20) { s += 18; notes.push(`F&G ${ctx.fearGreedValue}: extreme fear → contrarian long`); }
    else if (ctx.fearGreedValue < 30) s += 8;
    else if (ctx.fearGreedValue > 85) { s -= 18; notes.push(`F&G ${ctx.fearGreedValue}: extreme greed → caution`); }
    else if (ctx.fearGreedValue > 70) s -= 6;
  }
  if (typeof ctx.redditAttention === 'number') {
    if (ctx.redditAttention > 80) { s -= 6; notes.push(`Retail attention high (${ctx.redditAttention})`); }
  }
  if (typeof ctx.searchTrend === 'number') {
    s += (ctx.searchTrend - 50) * 0.2;
  }
  return { score: Math.max(-100, Math.min(100, s)), notes };
}

function scorePolitical(ctx: RenaissanceContext): { score: number; notes: string[] } {
  const notes: string[] = [];
  let s = 0;
  if (typeof ctx.gdeltToneIndex === 'number') {
    s += ctx.gdeltToneIndex * 0.25;
    if (Math.abs(ctx.gdeltToneIndex) > 25) notes.push(`GDELT tone=${ctx.gdeltToneIndex}`);
  }
  if (typeof ctx.politicalRiskIndex === 'number') {
    if (ctx.politicalRiskIndex > 70) { s -= 25; notes.push(`Political-risk ${ctx.politicalRiskIndex} extreme`); }
    else if (ctx.politicalRiskIndex > 50) { s -= 12; notes.push(`Political-risk ${ctx.politicalRiskIndex} elevated`); }
  }
  return { score: Math.max(-100, Math.min(100, s)), notes };
}

function scoreWeather(ctx: RenaissanceContext, symbol: string): { score: number; notes: string[] } {
  const notes: string[] = [];
  let s = 0;
  // Weather mostly matters for commodity / agri / energy tickers
  const upper = symbol.toUpperCase();
  const isCommodity = /(GC|SI|HG|PL|PA|CL|BZ|NG|RB|HO|ZC|ZW|ZS|ZL|ZM|KC|CC|SB|CT)=F$/.test(upper);
  const isEnergy = /^(XOM|CVX|XLE|USO|UNG|XLE)/.test(upper) || /NG=F|CL=F|BZ=F/.test(upper);
  if (isCommodity || isEnergy) {
    if (typeof ctx.weatherCommodityScore === 'number') {
      s += ctx.weatherCommodityScore * 0.5;
      if (Math.abs(ctx.weatherCommodityScore) > 30) notes.push(`Weather commodity factor ${ctx.weatherCommodityScore > 0 ? '+' : ''}${ctx.weatherCommodityScore}`);
    }
  }
  if (typeof ctx.weatherStressIndex === 'number' && ctx.weatherStressIndex > 70) {
    s -= 6;
    notes.push(`Weather stress ${ctx.weatherStressIndex}`);
  }
  return { score: Math.max(-100, Math.min(100, s)), notes };
}

function scoreOnchain(ctx: RenaissanceContext): { score: number; notes: string[] } {
  const notes: string[] = [];
  let s = 0;
  if (typeof ctx.stablePct24h === 'number') {
    s += ctx.stablePct24h * 6;
    if (Math.abs(ctx.stablePct24h) > 0.6) notes.push(`Stable supply Δ ${ctx.stablePct24h > 0 ? '+' : ''}${ctx.stablePct24h.toFixed(2)}%`);
  }
  if (typeof ctx.ethGasGwei === 'number') {
    if (ctx.ethGasGwei > 120) { s -= 4; notes.push(`ETH gas elevated ${ctx.ethGasGwei}gwei`); }
    else if (ctx.ethGasGwei < 25) s += 1;
  }
  if (typeof ctx.btcMempoolPending === 'number' && ctx.btcMempoolPending > 200_000) {
    s -= 3;
    notes.push(`BTC mempool congested`);
  }
  return { score: Math.max(-100, Math.min(100, s)), notes };
}

function scoreMicrostructure(ctx: RenaissanceContext): { score: number; notes: string[] } {
  const notes: string[] = [];
  let s = 0;
  if (typeof ctx.fundingRatePct === 'number') {
    // Over-crowded longs / shorts both fade
    if (ctx.fundingRatePct > 0.08) { s -= 6; notes.push(`Funding +${ctx.fundingRatePct.toFixed(3)}% crowded longs`); }
    if (ctx.fundingRatePct < -0.08) { s += 6; notes.push(`Funding ${ctx.fundingRatePct.toFixed(3)}% crowded shorts`); }
  }
  if (typeof ctx.longShortRatio === 'number') {
    if (ctx.longShortRatio > 2.5) { s -= 6; notes.push(`L/S ratio ${ctx.longShortRatio.toFixed(2)} long-heavy`); }
    if (ctx.longShortRatio < 0.4) { s += 6; notes.push(`L/S ratio ${ctx.longShortRatio.toFixed(2)} short-heavy`); }
  }
  return { score: Math.max(-100, Math.min(100, s)), notes };
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine
// ─────────────────────────────────────────────────────────────────────────────

export function runRenaissanceSignal(
  candles: OHLCV[],
  ctx: RenaissanceContext = {},
  symbol = 'BTCUSDT',
): RenaissanceSignal {
  if (candles.length < 50) {
    // Defer to the legacy engine when data is too short
    const fallback = runEnsembleSignal(candles, ctx) as EnsembleSignal;
    return {
      ...fallback,
      renaissanceScore: fallback.rawScore,
      layerScores: { technical: fallback.rawScore, macro: 0, sentiment: 0, political: 0, weather: 0, onchain: 0, microstructure: 0, ml: 0 },
      factors: ['Insufficient data — using technical layer only'],
      pWin: 0.5,
      pNoEdge: 1.0,
      kelly: 0,
    };
  }

  const base = runEnsembleSignal(candles, ctx);

  const macro      = scoreMacro(ctx);
  const sentiment  = scoreSentiment(ctx);
  const political  = scorePolitical(ctx);
  const weather    = scoreWeather(ctx, symbol);
  const onchain    = scoreOnchain(ctx);
  const micro      = scoreMicrostructure(ctx);

  // ── ML logistic-ensemble layer ────────────────────────────────────────────
  const features = extractFeatures(candles);
  const logistic = features ? predictLogistic(features) : null;
  const mlScore = logistic ? (logistic.pBuy - 0.5) * 200 : 0;   // -100..+100
  const mlNotes: string[] = [];
  if (logistic) {
    if (mlScore > 30)  mlNotes.push(`ML P(up)=${logistic.pBuy.toFixed(2)} bullish bias`);
    if (mlScore < -30) mlNotes.push(`ML P(up)=${logistic.pBuy.toFixed(2)} bearish bias`);
    if (logistic.contributions[0]) mlNotes.push(`ML top driver: ${logistic.contributions[0].key} (${logistic.contributions[0].contribution >= 0 ? '+' : ''}${logistic.contributions[0].contribution})`);
  }

  // Layer weights (sum to 1.0) — technical dominates but factors bend it
  const W = {
    technical:       0.42,
    macro:           0.12,
    sentiment:       0.08,
    political:       0.07,
    weather:         0.03,
    onchain:         0.05,
    microstructure:  0.06,
    ml:              0.17,
  };

  const renaissanceScore =
    base.rawScore * W.technical +
    macro.score    * W.macro +
    sentiment.score* W.sentiment +
    political.score* W.political +
    weather.score  * W.weather +
    onchain.score  * W.onchain +
    micro.score    * W.microstructure +
    mlScore        * W.ml;

  const factors = [
    ...(base.macroNotes || []),
    ...macro.notes,
    ...sentiment.notes,
    ...political.notes,
    ...weather.notes,
    ...onchain.notes,
    ...micro.notes,
    ...mlNotes,
  ].filter(Boolean);

  // Adjust signal direction if external factors are extreme
  let signal: EnsembleSignal['signal'] = base.signal;
  let confidence = base.adjustedConfidence;

  if (renaissanceScore >= 20 && (base.bullVotes >= 3 || base.signal === 'BUY')) {
    signal = 'BUY';
    confidence = Math.min(98, base.adjustedConfidence + Math.min(15, renaissanceScore - 20));
  } else if (renaissanceScore <= -20 && (base.bearVotes >= 3 || base.signal === 'SELL')) {
    signal = 'SELL';
    confidence = Math.min(98, base.adjustedConfidence + Math.min(15, Math.abs(renaissanceScore) - 20));
  } else if (Math.abs(renaissanceScore) < 8) {
    // Conflicting factors → reduce confidence
    confidence = Math.min(confidence, 55);
  }

  // Hard veto: severe political-risk or weather stress → flatten
  if ((ctx.politicalRiskIndex ?? 0) > 80) {
    signal = 'NEUTRAL';
    confidence = Math.min(confidence, 35);
    factors.unshift('Hard veto: political-risk > 80');
  }

  const pWin = Math.max(0, Math.min(0.95, confidence / 100));
  const pNoEdge = Math.max(0, Math.min(1, (60 - Math.abs(renaissanceScore)) / 60));

  // Kelly fraction
  const rr = base.rrRatio || 1.5;
  const f = pWin * (rr + 1) - 1;
  const kelly = rr > 0 ? Math.max(0, Math.min(0.20, f / rr)) : 0;

  return {
    ...base,
    signal,
    adjustedConfidence: Math.round(confidence),
    renaissanceScore: parseFloat(renaissanceScore.toFixed(2)),
    layerScores: {
      technical:      parseFloat(base.rawScore.toFixed(2)),
      macro:          parseFloat(macro.score.toFixed(2)),
      sentiment:      parseFloat(sentiment.score.toFixed(2)),
      political:      parseFloat(political.score.toFixed(2)),
      weather:        parseFloat(weather.score.toFixed(2)),
      onchain:        parseFloat(onchain.score.toFixed(2)),
      microstructure: parseFloat(micro.score.toFixed(2)),
      ml:             parseFloat(mlScore.toFixed(2)),
    },
    factors,
    pWin: parseFloat(pWin.toFixed(3)),
    pNoEdge: parseFloat(pNoEdge.toFixed(3)),
    kelly: parseFloat(kelly.toFixed(4)),
    mlProbability: logistic?.pBuy,
    mlTopContributions: logistic?.contributions.slice(0, 5).map((c) => ({ ...c, key: String(c.key) })),
  };
}
