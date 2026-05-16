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
import { ema } from './math';

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

  // === Box (mean ± (hi-lo)/2 * mult)
  const topBox: (number | null)[] = [];
  const btmBox: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - boxLb + 1);
    const hi = Math.max(...ctx.high.slice(start, i + 1));
    const lo = Math.min(...ctx.low.slice(start, i + 1));
    const m = (ctx.close.slice(start, i + 1).reduce((s, x) => s + x, 0)) / Math.max(1, i - start + 1);
    const range = hi - lo;
    topBox.push(m + range * boxMult);
    btmBox.push(m - range * boxMult);
  }

  // === HMF — momentum EMA dari close delta
  const deltas = ctx.close.map((c, i) => (i === 0 ? 0 : c - ctx.close[i - 1]));
  const hmf = ema(deltas, hmfLen);

  // === Regime strength — color-coded histogram
  const regimeStrengthRaw: number[] = [];
  const regimeColors: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = ctx.close[i];
    const bb = backbone[i] ?? c;
    const slopeIdx = Math.max(0, i - slopeWin);
    const slope = (backbone[i] ?? c) - (backbone[slopeIdx] ?? c);
    let color = colorNeutral;
    let value = 5;
    if (c > bb && slope > 0) { color = colorBull; value = 7; }
    else if (c < bb && slope < 0) { color = colorBear; value = 7; }
    else { color = colorNeutral; value = 4; }
    regimeStrengthRaw.push(value);
    regimeColors.push(color);
  }

  // ---- Final snapshot for UI panel
  const last = n - 1;
  const lastBackbone = backbone[last] ?? ctx.close[last];
  const lastMagenta = magenta[last] ?? ctx.close[last];
  const distAbs = ctx.close[last] - lastBackbone;
  const distPct = (distAbs / lastBackbone) * 100;
  const structurePct = ((lastMagenta - lastBackbone) / lastBackbone) * 100;

  return {
    series: {
      backbone: backbone.map((v) => (Number.isFinite(v) ? v : null)),
      magenta: magenta.map((v) => (Number.isFinite(v) ? v : null)),
      topBox,
      btmBox,
      hmf: hmf.map((v) => (Number.isFinite(v) ? v : null)),
      regimeStrength: regimeStrengthRaw,
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
      params: { backboneLen, magentaLen, boxLb, boxMult, hmfLen, slopeWin },
    },
  };
};

export const T1MO_INDICATORS = [{ def: t1moDef, compute: t1moCompute }];
