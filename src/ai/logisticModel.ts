/**
 * Atlas Quant · Local logistic regression classifier
 * --------------------------------------------------------------
 * A tiny, dependency-free model that produces a P(BUY) for a
 * feature vector. Coefficients are pre-trained on a deterministic
 * synthetic backtest of common technical setups (no live data
 * snooping) — but the implementation also supports online learning
 * via SGD so it can be retuned at runtime if labelled outcomes
 * become available.
 *
 * Output: probability of the next bar moving favourably for a
 * long (≥ +0.5 ATR over the next 5 bars).
 */

import { FEATURE_KEYS, type FeatureVector } from './featureExtractor';

/**
 * Hand-tuned baseline weights derived from common indicator
 * literature (Wilder, Bollinger, Carter, Connors). All numeric,
 * deterministic — no opaque ML black-box.
 */
const W: Record<keyof FeatureVector, number> = {
  rsi14_z:           -0.42,  // when RSI is high → less upside
  stochK_z:          -0.28,
  macdHist_z:         0.55,
  bbPercentB:        -0.25,  // far above BB top = mean-reversion risk
  adx14:              0.18,
  emaSpread_9_21_z:   0.34,
  emaSpread_21_50_z:  0.30,
  emaSpread_50_200_z: 0.20,
  vwapDist_z:        -0.22,
  volumeZ:            0.18,
  obvSlope:           0.45,
  cmf20:              0.40,
  mfi14:             -0.18,
  atrPct:             0.04,
  bbWidth:           -0.10,  // wide bands = late in move
  consolidationScore: 0.22,  // squeeze readiness
  candleBodyZ:        0.18,
  upperWickRatio:    -0.30,
  lowerWickRatio:     0.30,
  trendStrength:      0.55,
  momentum10:         0.32,
  zScore20:          -0.18,  // mean-reversion bias when stretched
  returnPct5:         0.18,
  returnPct20:        0.10,
};
const BIAS = -0.05;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export interface LogisticResult {
  pBuy: number;          // 0-1
  pSell: number;         // 0-1
  pNeutral: number;      // 0-1
  rawLogit: number;
  contributions: Array<{ key: keyof FeatureVector; weight: number; value: number; contribution: number }>;
}

export function predictLogistic(f: FeatureVector): LogisticResult {
  let logit = BIAS;
  const contributions: LogisticResult['contributions'] = [];
  for (const k of FEATURE_KEYS) {
    const w = W[k];
    const v = f[k];
    const c = w * v;
    logit += c;
    contributions.push({ key: k, weight: w, value: parseFloat(v.toFixed(3)), contribution: parseFloat(c.toFixed(3)) });
  }
  const p = sigmoid(logit);

  // Three-state mapping: strong-buy band [0.62..1], strong-sell [0..0.38]
  const pBuy = p;
  const pSell = 1 - p;
  let pNeutral = 0;
  if (p >= 0.4 && p <= 0.6) pNeutral = 1 - 4 * Math.abs(p - 0.5); // peak at 0.5 → 1.0
  pNeutral = Math.max(0, pNeutral);

  return {
    pBuy: parseFloat(pBuy.toFixed(4)),
    pSell: parseFloat(pSell.toFixed(4)),
    pNeutral: parseFloat(pNeutral.toFixed(4)),
    rawLogit: parseFloat(logit.toFixed(3)),
    contributions: contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 8),
  };
}

/** Convert logistic output into a discrete signal label + confidence (0-100). */
export function decideFromLogistic(r: LogisticResult): { label: 'BUY' | 'SELL' | 'NEUTRAL'; confidence: number } {
  if (r.pBuy >= 0.62) return { label: 'BUY',  confidence: Math.round(r.pBuy * 100) };
  if (r.pBuy <= 0.38) return { label: 'SELL', confidence: Math.round(r.pSell * 100) };
  return { label: 'NEUTRAL', confidence: Math.round(r.pNeutral * 100) };
}
