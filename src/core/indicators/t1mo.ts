/**
 * T1MO INDICATOR — versi parameterizable Atlas Quant.
 * Replica setup T1MO (Discovery DISCK reference frame):
 *   - Backbone EMA (default 50) — cyan line
 *   - Magenta EMA (default 10) — pink dotted
 *   - Top Box / Bottom Box (default 20-bar acceptance area) — orange/brown steps
 *   - HMF (Higher Moving Force) — momentum EMA delta
 *   - Regime Strength histogram — green/red/yellow colored
 *   - P$ / P% — distance & percent dari backbone
 *
 * Semua parameter dapat di-override via UI param panel.
 */
import type { IndicatorContext, IndicatorComputeResult, IndicatorDef } from '@/domain/indicator';
import { ema, trueRange } from './math';

const logistic = (x: number) => 1 / (1 + Math.exp(-x));

export const t1moDef: IndicatorDef = {
  code: 'T1MO_CORE',
  name: 'T1MO Core (Backbone + Magenta + Box)',
  nameId: 'T1MO Inti (Backbone + Magenta + Box)',
  category: 'composite',
  subCategory: 'T1MO',
  description: 'Composite T1MO indicator: backbone EMA, magenta EMA, acceptance box, HMF momentum, regime strength.',
  descriptionId: 'Indikator komposit T1MO: EMA backbone, EMA magenta, kotak acceptance, momentum HMF, regime strength.',
  inputs: [
    { key: 'backbone', label: 'Backbone EMA Length', labelId: 'Panjang EMA Backbone', type: 'int', default: 50, min: 5, max: 400 },
    { key: 'magenta', label: 'Magenta EMA Length', labelId: 'Panjang EMA Magenta', type: 'int', default: 10, min: 2, max: 200 },
    { key: 'boxLookback', label: 'Box Lookback Bars', labelId: 'Lookback Box', type: 'int', default: 20, min: 5, max: 200 },
    { key: 'boxMultiplier', label: 'Box Range Multiplier', labelId: 'Multiplier Range Box', type: 'float', default: 0.5, min: 0.1, max: 2, step: 0.05 },
    { key: 'hmfPeriod', label: 'HMF Smoothing', labelId: 'Smoothing HMF', type: 'int', default: 10, min: 2, max: 50 },
    { key: 'strengthSlopeBars', label: 'Strength Slope Window', labelId: 'Slope Window Strength', type: 'int', default: 4, min: 2, max: 30 },
    { key: 'colorBackbone', label: 'Backbone Color', type: 'color', default: '#00bcd4' },
    { key: 'colorMagenta', label: 'Magenta Color', type: 'color', default: '#e91e63' },
    { key: 'colorTopBox', label: 'Top Box Color', type: 'color', default: '#ff9800' },
    { key: 'colorBtmBox', label: 'Btm Box Color', type: 'color', default: '#795548' },
    { key: 'colorBull', label: 'Bull Strength Color', type: 'color', default: '#00e676' },
    { key: 'colorBear', label: 'Bear Strength Color', type: 'color', default: '#ff1744' },
    { key: 'colorNeutral', label: 'Neutral Strength Color', type: 'color', default: '#ffea00' },
  ],
  outputs: [
    { key: 'backbone', label: 'Backbone EMA', plot: 'line', paneId: 'overlay' },
    { key: 'magenta', label: 'Magenta EMA', plot: 'line', paneId: 'overlay' },
    { key: 'topBox', label: 'Top Box', plot: 'line', paneId: 'overlay' },
    { key: 'btmBox', label: 'Bottom Box', plot: 'line', paneId: 'overlay' },
    { key: 'hmf', label: 'HMF Momentum', plot: 'line', paneId: 'sub' },
    { key: 'regimeStrength', label: 'Regime Strength', plot: 'histogram', paneId: 'sub' },
  ],
  overlay: true,
  tags: ['t1mo', 'composite', 'regime'],
};

export const t1moCompute = (
  ctx: IndicatorContext,
  p: {
    backbone?: number;
    magenta?: number;
    boxLookback?: number;
    boxMultiplier?: number;
    hmfPeriod?: number;
    strengthSlopeBars?: number;
    colorBull?: string;
    colorBear?: string;
    colorNeutral?: string;
  }
): IndicatorComputeResult => {
  const n = ctx.close.length;
  if (n < 5) return { series: {}, levels: [], meta: { ready: false } };

  const backboneLen = p.backbone ?? 50;
  const magentaLen = p.magenta ?? 10;
  const boxLb = p.boxLookback ?? 20;
  const boxMult = p.boxMultiplier ?? 0.5;
  const hmfLen = p.hmfPeriod ?? 10;
  const slopeWin = p.strengthSlopeBars ?? 4;
  const colorBull = p.colorBull ?? '#00e676';
  const colorBear = p.colorBear ?? '#ff1744';
  const colorNeutral = p.colorNeutral ?? '#ffea00';

  // === Backbone (EMA backbone)
  const backbone = ema(ctx.close, backboneLen);
  const magenta = ema(ctx.close, magentaLen);

  // === Box — lagged Donchian (previous N bars, EXCLUDING current bar).
  // Using i as exclusive end means the box is always computed from historical bars only,
  // so the current candle CAN break outside the box — this is the signal (Spec Buy / Break TopBox).
  // Inclusive-current would clamp price inside the box forever, killing all breakout signals.
  const topBox: (number | null)[] = [];
  const btmBox: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - boxLb);
    const end   = i; // exclusive of current bar
    if (end <= start) {
      topBox.push(ctx.high[i]);
      btmBox.push(ctx.low[i]);
    } else {
      topBox.push(Math.max(...ctx.high.slice(start, end)));
      btmBox.push(Math.min(...ctx.low.slice(start, end)));
    }
  }

  // === ATR for volatility normalization (makes signals comparable across assets/TFs)
  const tr = trueRange(ctx.high, ctx.low, ctx.close);
  const atr = ema(tr, Math.max(hmfLen, 14));
  const atrAt = (i: number) => {
    const a = atr[i];
    return Number.isFinite(a) && a > 0 ? a : (ctx.close[i] * 0.001 || 1);
  };

  // === HMF — ATR-normalized momentum (volatility-adjusted, then smoothed).
  // v2: was raw EMA of price deltas (scale-dependent, noisy). Now momentum over
  // hmfLen bars divided by ATR → unit-less, comparable, far less noise.
  const momRaw = ctx.close.map((c, i) => (i >= hmfLen ? (c - ctx.close[i - hmfLen]) / atrAt(i) : 0));
  const hmf = ema(momRaw, Math.max(2, Math.round(hmfLen / 2)));

  // === Position within acceptance box (0=at bottom, 1=at top)
  const positionPct: number[] = [];
  for (let i = 0; i < n; i++) {
    const top = topBox[i] ?? ctx.close[i];
    const btm = btmBox[i] ?? ctx.close[i];
    const range = (top as number) - (btm as number);
    // No clamp — price can legitimately be outside the lagged box (signals: Spec Buy / Break TopBox)
    positionPct.push(range > 0 ? (ctx.close[i] - (btm as number)) / range : 0.5);
  }

  // === AI-assisted regime model (logistic ensemble of normalized features).
  // Same outputs/series as the original T1MO, but regimeStrength is now a
  // continuous 0–10 conviction and each bar carries a bull-probability.
  const regimeStrengthRaw: number[] = [];
  const regimeColors: string[] = [];
  const bullProb: number[] = [];
  // Feature weights (logistic-regression style). Tuned for trend+momentum+location.
  const W = { dist: 0.9, slope: 1.1, hmf: 1.3, pos: 1.0, struct: 0.7 };
  // Calibration temperature (Platt-style). Without it the 5-feature z easily hits ±3..5
  // and prob saturates at 95-99% for whole trends — every pixel goes max green/red.
  // T≈2.2 keeps probabilities graded (60-85% in normal trends) like the v1 reference.
  const Z_TEMP = 2.2;
  for (let i = 0; i < n; i++) {
    const c = ctx.close[i];
    const bb = backbone[i] ?? c;
    const mg = magenta[i] ?? c;
    const a = atrAt(i);
    const slopeIdx = Math.max(0, i - slopeWin);
    const dist = (c - bb) / a;                                   // price vs backbone, in ATRs
    const slope = ((backbone[i] ?? c) - (backbone[slopeIdx] ?? c)) / a; // backbone slope in ATRs
    const struct = (mg - bb) / a;                                // magenta vs backbone (micro-structure)
    const z =
      W.dist * dist + W.slope * slope + W.hmf * (hmf[i] ?? 0) +
      W.pos * (positionPct[i] - 0.5) * 2 + W.struct * struct;
    const prob = logistic(z / Z_TEMP);                           // 0..1 bullish probability (temperature-calibrated)
    bullProb.push(prob);
    const conviction = Math.abs(prob - 0.5) * 20;                // 0..10
    regimeStrengthRaw.push(conviction < 0.5 ? 0.5 : conviction);
    regimeColors.push(prob > 0.55 ? colorBull : prob < 0.45 ? colorBear : colorNeutral);
  }

  // ---- Final snapshot for UI panel
  const last = n - 1;
  const lastBackbone = backbone[last] ?? ctx.close[last];
  const lastMagenta = magenta[last] ?? ctx.close[last];
  const distAbs = ctx.close[last] - lastBackbone;
  const distPct = (distAbs / lastBackbone) * 100;
  const structurePct = ((lastMagenta - lastBackbone) / lastBackbone) * 100;

  // ---- AI-assisted regime read (statistical context + conviction)
  const lastProb = bullProb[last] ?? 0.5;
  const aiConfidence = Math.round(Math.abs(lastProb - 0.5) * 200); // 0..100
  const aiSignal: 'BUY' | 'SELL' | 'NEUTRAL' =
    lastProb > 0.58 ? 'BUY' : lastProb < 0.42 ? 'SELL' : 'NEUTRAL';
  // z-score of distance-from-backbone over a rolling window (statistical stretch)
  const distWin = ctx.close.slice(Math.max(0, n - 50)).map((c, k) => {
    const idx = Math.max(0, n - 50) + k;
    return c - (backbone[idx] ?? c);
  });
  const dMean = distWin.reduce((s, v) => s + v, 0) / (distWin.length || 1);
  const dStd = Math.sqrt(distWin.reduce((s, v) => s + (v - dMean) ** 2, 0) / (distWin.length || 1)) || 1;
  const distZ = (distAbs - dMean) / dStd;

  return {
    series: {
      backbone: backbone.map((v) => (Number.isFinite(v) ? v : null)),
      magenta: magenta.map((v) => (Number.isFinite(v) ? v : null)),
      topBox,
      btmBox,
      hmf: hmf.map((v) => (Number.isFinite(v) ? v : null)),
      regimeStrength: regimeStrengthRaw,
      bullProb: bullProb.map((v) => Math.round(v * 100)),
      positionPct: positionPct.map((v) => Math.round(v * 100)),
    },
    levels: [
      { key: 'backbone_now', value: lastBackbone, label: `Backbone (${backboneLen}) ${lastBackbone.toFixed(2)}`, color: '#00bcd4' },
      { key: 'magenta_now', value: lastMagenta, label: `Magenta (${magentaLen}) ${lastMagenta.toFixed(2)}`, color: '#e91e63' },
      { key: 'topbox_now', value: topBox[last] ?? 0, label: `Top Box ${(topBox[last] ?? 0).toFixed(2)}`, color: '#ff9800' },
      { key: 'btmbox_now', value: btmBox[last] ?? 0, label: `Btm Box ${(btmBox[last] ?? 0).toFixed(2)}`, color: '#795548' },
    ],
    meta: {
      ready: true,
      backboneLen,
      magentaLen,
      lastBackbone,
      lastMagenta,
      lastTopBox: topBox[last],
      lastBtmBox: btmBox[last],
      lastHmf: hmf[last] ?? 0,
      distAbs,
      distPct,
      structurePct,
      regimeColors,
      // ── AI-assisted read (v2) ──
      aiBullProb: Math.round(lastProb * 100),   // 0..100 probability bullish regime
      aiConfidence,                              // 0..100 conviction
      aiSignal,                                  // BUY / SELL / NEUTRAL
      positionPct: Math.round((positionPct[last] ?? 0.5) * 100),
      distZ: Number(distZ.toFixed(2)),           // statistical stretch vs backbone
      lastAtr: atrAt(last),
      params: { backboneLen, magentaLen, boxLb, boxMult, hmfLen, slopeWin },
    },
  };
};

export const T1MO_INDICATORS = [{ def: t1moDef, compute: t1moCompute }];
