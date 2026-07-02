/**
 * ════════════════════════════════════════════════════════════════════════════
 *  VELO CRYPTO PACK — 250+ indikator kuant khusus crypto, Velo-Data-style.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Terinspirasi katalog metrik Velo Data (docs.velo.xyz: CVD, funding, basis,
 * open interest, liquidations) dan ekosistem indikator TradingView. Data
 * derivatif mentah (funding/OI per exchange) butuh feed berbayar, jadi setiap
 * indikator di sini dihitung NYATA dari OHLCV — metrik yang secara definisi
 * derivatif ditandai "Proxy" dan memakai formula proxy yang jujur & terdokumentasi.
 *
 * Arsitektur: FAMILIES (formula) × PARAM GRID (variasi) → preset. Satu fungsi
 * `computeVeloPreset(id, ctx)` mengeksekusi formula family → siap dirender
 * generik oleh ChartContainer (pane 'main' = overlay, pane 'sub' = oscillator
 * overlay di bawah chart dengan price-scale terpisah).
 */
import type { IndicatorPreset } from './registry';

export interface VeloCtx {
  open: number[]; high: number[]; low: number[]; close: number[]; volume: number[];
}
export interface VeloPlot {
  key: string; label: string; color: string;
  type: 'line' | 'hist';
  values: number[]; // NaN = gap
}
export interface VeloResult { pane: 'main' | 'sub'; plots: VeloPlot[]; }

// ── primitives ───────────────────────────────────────────────────────────────
const emaA = (v: number[], p: number): number[] => {
  const k = 2 / (p + 1); const o = new Array<number>(v.length); let prev = NaN;
  for (let i = 0; i < v.length; i++) {
    const x = v[i];
    if (!Number.isFinite(x)) { o[i] = prev; continue; }
    prev = Number.isFinite(prev) ? x * k + prev * (1 - k) : x; o[i] = prev;
  }
  return o;
};
const smaA = (v: number[], p: number): number[] => {
  const o = new Array<number>(v.length).fill(NaN); let s = 0; let n = 0;
  for (let i = 0; i < v.length; i++) {
    const x = Number.isFinite(v[i]) ? v[i] : 0; s += x; n++;
    if (n > p) { s -= Number.isFinite(v[i - p]) ? v[i - p] : 0; n = p; }
    if (n === p) o[i] = s / p;
  }
  return o;
};
const rollStd = (v: number[], p: number): number[] => {
  const m = smaA(v, p);
  return v.map((_, i) => {
    if (i < p - 1 || !Number.isFinite(m[i])) return NaN;
    let s = 0; for (let j = i - p + 1; j <= i; j++) { const d = v[j] - m[i]; s += d * d; }
    return Math.sqrt(s / p);
  });
};
const rollMax = (v: number[], p: number): number[] => v.map((_, i) => Math.max(...v.slice(Math.max(0, i - p + 1), i + 1)));
const rollMin = (v: number[], p: number): number[] => v.map((_, i) => Math.min(...v.slice(Math.max(0, i - p + 1), i + 1)));
const logRet = (c: number[]): number[] => c.map((v, i) => (i === 0 || c[i - 1] <= 0 ? NaN : Math.log(v / c[i - 1])));
const cum = (v: number[]): number[] => { let s = 0; return v.map((x) => (s += Number.isFinite(x) ? x : 0)); };
const trArr = (x: VeloCtx): number[] => x.close.map((c, i) =>
  i === 0 ? x.high[0] - x.low[0] : Math.max(x.high[i] - x.low[i], Math.abs(x.high[i] - x.close[i - 1]), Math.abs(x.low[i] - x.close[i - 1])));

/** Signed volume per bar — proxy taker delta: posisi close dalam range bar. */
const signedVol = (x: VeloCtx): number[] => x.close.map((c, i) => {
  const r = x.high[i] - x.low[i];
  return r > 0 ? x.volume[i] * ((2 * (c - x.low[i])) / r - 1) : 0;
});
/** Rolling VWAP over W bars (W=0 → cumulative dari awal data). */
const rollVwap = (x: VeloCtx, W: number): number[] => {
  const tp = x.close.map((c, i) => (x.high[i] + x.low[i] + c) / 3);
  if (W <= 0) { const pv = cum(tp.map((t, i) => t * x.volume[i])); const vv = cum(x.volume); return pv.map((p, i) => (vv[i] > 0 ? p / vv[i] : NaN)); }
  return tp.map((_, i) => {
    const s = Math.max(0, i - W + 1); let pv = 0, vv = 0;
    for (let j = s; j <= i; j++) { pv += tp[j] * x.volume[j]; vv += x.volume[j]; }
    return vv > 0 ? pv / vv : NaN;
  });
};

// ── colors per family group ──────────────────────────────────────────────────
const C = { flow: '#00bcd4', deriv: '#ff9800', vol: '#ab47bc', stat: '#26a69a', liq: '#f23645', trend: '#2962ff' };

// ── FAMILY COMPUTES ──────────────────────────────────────────────────────────
type Fam = (x: VeloCtx, p: number[]) => VeloResult;
const line = (values: number[], label: string, color: string): VeloPlot => ({ key: 'v', label, color, type: 'line', values });
const hist = (values: number[], label: string, color: string): VeloPlot => ({ key: 'v', label, color, type: 'hist', values });

const FAMILIES: Record<string, Fam> = {
  /** CVD — cumulative volume delta (rolling window W, EMA smooth S). Velo core metric. */
  cvd: (x, [W, S]) => {
    const sv = signedVol(x);
    const base = W > 0 ? sv.map((_, i) => { let s = 0; for (let j = Math.max(0, i - W + 1); j <= i; j++) s += sv[j]; return s; }) : cum(sv);
    return { pane: 'sub', plots: [line(S > 1 ? emaA(base, S) : base, `CVD${W ? ' ' + W : ''}${S > 1 ? ' e' + S : ''}`, C.flow)] };
  },
  /** Volume Delta oscillator — signed volume EMA-smoothed (per-bar taker delta proxy). */
  vdelta: (x, [S]) => ({ pane: 'sub', plots: [hist(emaA(signedVol(x), S), `VolΔ e${S}`, C.flow)] }),
  /** Taker Buy Pressure — upVol/(totalVol) rolling ratio 0..1 (aggressor proxy). */
  taker: (x, [W]) => {
    const sv = signedVol(x);
    const r = sv.map((_, i) => {
      const s = Math.max(0, i - W + 1); let up = 0, tot = 0;
      for (let j = s; j <= i; j++) { const v = x.volume[j]; tot += v; up += (v + sv[j]) / 2; }
      return tot > 0 ? up / tot : NaN;
    });
    return { pane: 'sub', plots: [line(r, `Taker ${W}`, C.flow)] };
  },
  /** Liquidation Wick Score — panjang wick (×ATR) saat volume z-spike (liq-cascade proxy). */
  liqwick: (x, [wm, vz]) => {
    const atr = emaA(trArr(x), 14); const vm = smaA(x.volume, 50); const vs = rollStd(x.volume, 50);
    const s = x.close.map((c, i) => {
      const a = atr[i] || 1;
      const upW = x.high[i] - Math.max(x.open[i], c), dnW = Math.min(x.open[i], c) - x.low[i];
      const z = Number.isFinite(vs[i]) && vs[i] > 0 ? (x.volume[i] - vm[i]) / vs[i] : 0;
      if (z < vz) return 0;
      const w = Math.max(upW, dnW) / a;
      return w >= wm ? (dnW > upW ? w : -w) : 0; // + = long-liq flush bawah, − = short-liq spike atas
    });
    return { pane: 'sub', plots: [hist(s, `LiqWick ${wm}×/z${vz}`, C.liq)] };
  },
  /** Whale Volume Z — z-score volume (deteksi partisipasi abnormal). */
  whalez: (x, [W]) => {
    const m = smaA(x.volume, W), sd = rollStd(x.volume, W);
    return { pane: 'sub', plots: [hist(x.volume.map((v, i) => (Number.isFinite(sd[i]) && sd[i] > 0 ? (v - m[i]) / sd[i] : NaN)), `WhaleZ ${W}`, C.flow)] };
  },
  /** Funding Proxy — premium harga vs rolling-VWAP W (per-mille), EMA S. Proxy funding periodik. */
  fundp: (x, [W, S]) => {
    const vw = rollVwap(x, W);
    const prem = x.close.map((c, i) => (Number.isFinite(vw[i]) && vw[i] > 0 ? ((c - vw[i]) / vw[i]) * 1000 : NaN));
    return { pane: 'sub', plots: [line(S > 1 ? emaA(prem, S) : prem, `Fund‰ ${W}${S > 1 ? '/e' + S : ''}`, C.deriv)] };
  },
  /** Basis Momentum Proxy — spread ROC fast vs slow, annualization-free (term-structure proxy). */
  basisp: (x, [F, L, S]) => {
    const roc = (n: number) => x.close.map((c, i) => (i >= n && x.close[i - n] > 0 ? ((c / x.close[i - n]) - 1) * 100 : NaN));
    const sp = roc(F).map((v, i) => v - (roc(L)[i] ?? NaN));
    return { pane: 'sub', plots: [line(S > 1 ? emaA(sp, S) : sp, `Basis ${F}/${L}`, C.deriv)] };
  },
  /** Realized Volatility — estimator E (0 c2c,1 Parkinson,2 Garman-Klass,3 Rogers-Satchell), window W, %annualized-per-bar-free. */
  rvol: (x, [E, W]) => {
    const n = x.close.length; const per = new Array<number>(n).fill(NaN);
    for (let i = 1; i < n; i++) {
      const h = x.high[i], l = x.low[i], o = x.open[i], c = x.close[i];
      if (E === 1) per[i] = (Math.log(h / l) ** 2) / (4 * Math.LN2);
      else if (E === 2) per[i] = 0.5 * Math.log(h / l) ** 2 - (2 * Math.LN2 - 1) * Math.log(c / o) ** 2;
      else if (E === 3) per[i] = Math.log(h / c) * Math.log(h / o) + Math.log(l / c) * Math.log(l / o);
      else { const r = Math.log(c / x.close[i - 1]); per[i] = r * r; }
    }
    const m = smaA(per, W);
    const names = ['C2C', 'Park', 'GK', 'RS'];
    return { pane: 'sub', plots: [line(m.map((v) => (Number.isFinite(v) && v >= 0 ? Math.sqrt(v) * 100 : NaN)), `RV-${names[E]} ${W}`, C.vol)] };
  },
  /** Vol Regime Ratio — realized vol fast/slow (>1 = ekspansi volatilitas). */
  vratio: (x, [F, L]) => {
    const r = logRet(x.close).map((v) => (Number.isFinite(v) ? v * v : NaN));
    const f = smaA(r, F), s = smaA(r, L);
    return { pane: 'sub', plots: [line(f.map((v, i) => (Number.isFinite(s[i]) && s[i] > 0 ? Math.sqrt(v / s[i]) : NaN)), `VolRatio ${F}/${L}`, C.vol)] };
  },
  /** ATR Percentile — persentil ATR(14) dalam window W (0..100). */
  atrpct: (x, [W]) => {
    const a = emaA(trArr(x), 14);
    const p = a.map((v, i) => {
      if (i < W) return NaN; let c = 0; for (let j = i - W + 1; j <= i; j++) if (a[j] <= v) c++;
      return (c / W) * 100;
    });
    return { pane: 'sub', plots: [line(p, `ATR%ile ${W}`, C.vol)] };
  },
  /** Price Z-Score — (close − SMA)/σ window W. */
  zprice: (x, [W]) => {
    const m = smaA(x.close, W), sd = rollStd(x.close, W);
    return { pane: 'sub', plots: [line(x.close.map((c, i) => (Number.isFinite(sd[i]) && sd[i] > 0 ? (c - m[i]) / sd[i] : NaN)), `Z ${W}`, C.stat)] };
  },
  /** Kaufman Efficiency Ratio — |net move| / Σ|moves| (0 chop → 1 trend). */
  ker: (x, [W]) => {
    const e = x.close.map((c, i) => {
      if (i < W) return NaN; let s = 0;
      for (let j = i - W + 1; j <= i; j++) s += Math.abs(x.close[j] - x.close[j - 1]);
      return s > 0 ? Math.abs(c - x.close[i - W]) / s : 0;
    });
    return { pane: 'sub', plots: [line(e, `ER ${W}`, C.stat)] };
  },
  /** Hurst-lite — log2(R/S) / log2(W) rolling (≈0.5 random walk). */
  hurst: (x, [W]) => {
    const r = logRet(x.close);
    const h = r.map((_, i) => {
      if (i < W) return NaN;
      const win = r.slice(i - W + 1, i + 1).filter(Number.isFinite) as number[];
      if (win.length < W * 0.9) return NaN;
      const m = win.reduce((a, b) => a + b, 0) / win.length;
      let cs = 0, mx = -Infinity, mn = Infinity, ss = 0;
      for (const v of win) { cs += v - m; if (cs > mx) mx = cs; if (cs < mn) mn = cs; ss += (v - m) ** 2; }
      const S = Math.sqrt(ss / win.length);
      return S > 0 && mx > mn ? Math.log2((mx - mn) / S) / Math.log2(win.length) : NaN;
    });
    return { pane: 'sub', plots: [line(h, `Hurst ${W}`, C.stat)] };
  },
  /** Drawdown — % dari rolling high W (0 = ATH sepanjang data). */
  ddown: (x, [W]) => {
    const hi = W > 0 ? rollMax(x.close, W) : (() => { let m = -Infinity; return x.close.map((c) => (m = Math.max(m, c))); })();
    return { pane: 'sub', plots: [line(x.close.map((c, i) => (hi[i] > 0 ? ((c - hi[i]) / hi[i]) * 100 : NaN)), `DD ${W || 'ATH'}`, C.liq)] };
  },
  /** Rolling Sharpe (M=0) / Sortino (M=1) — mean/vol return window W (per-bar). */
  sharpe: (x, [W, M]) => {
    const r = logRet(x.close);
    const v = r.map((_, i) => {
      if (i < W) return NaN;
      const win = r.slice(i - W + 1, i + 1).filter(Number.isFinite) as number[];
      const m = win.reduce((a, b) => a + b, 0) / win.length;
      const dn = M === 1 ? win.filter((q) => q < 0) : win;
      const sd = Math.sqrt(dn.reduce((a, b) => a + (b - (M === 1 ? 0 : m)) ** 2, 0) / Math.max(1, dn.length));
      return sd > 0 ? (m / sd) * Math.sqrt(W) : NaN;
    });
    return { pane: 'sub', plots: [line(v, `${M === 1 ? 'Sortino' : 'Sharpe'} ${W}`, C.stat)] };
  },
  /** Rolling VWAP overlay — window W (0 = anchored ke awal data). */
  rvwap: (x, [W]) => ({ pane: 'main', plots: [line(rollVwap(x, W), `rVWAP ${W || '∞'}`, C.trend)] }),
  /** VWAP Bands — rolling VWAP W ± K·σ(harga). */
  vwapb: (x, [W, K]) => {
    const vw = rollVwap(x, W); const sd = rollStd(x.close, W);
    return { pane: 'main', plots: [
      line(vw, `VWAP ${W}`, C.trend),
      line(vw.map((v, i) => v + K * (sd[i] ?? NaN)), `+${K}σ`, C.vol),
      line(vw.map((v, i) => v - K * (sd[i] ?? NaN)), `−${K}σ`, C.vol),
    ] };
  },
  /** Anchored Momentum — ROC % periode N. */
  amom: (x, [N]) => ({ pane: 'sub', plots: [hist(x.close.map((c, i) => (i >= N && x.close[i - N] > 0 ? ((c / x.close[i - N]) - 1) * 100 : NaN)), `Mom ${N}`, C.trend)] }),
  /** Trend Intensity — % bar close>SMA(W) dalam W bar (0..100). */
  tii: (x, [W]) => {
    const m = smaA(x.close, W);
    const t = x.close.map((_, i) => {
      if (i < W * 2) return NaN; let c = 0;
      for (let j = i - W + 1; j <= i; j++) if (x.close[j] > m[j]) c++;
      return (c / W) * 100;
    });
    return { pane: 'sub', plots: [line(t, `TII ${W}`, C.trend)] };
  },
  /** Squeeze Intensity — BBwidth/KCwidth (<1 = squeeze on). */
  sqz: (x, [W]) => {
    const sd = rollStd(x.close, W); const atr = emaA(trArr(x), W);
    return { pane: 'sub', plots: [line(sd.map((s, i) => (atr[i] > 0 ? (2 * s) / (1.5 * atr[i]) : NaN)), `Squeeze ${W}`, C.vol)] };
  },
  /** Price-Volume Correlation — Pearson window W (−1..1). */
  corrpv: (x, [W]) => {
    const v = x.close.map((_, i) => {
      if (i < W) return NaN;
      const a = x.close.slice(i - W + 1, i + 1), b = x.volume.slice(i - W + 1, i + 1);
      const ma = a.reduce((s, q) => s + q, 0) / W, mb = b.reduce((s, q) => s + q, 0) / W;
      let cv = 0, va = 0, vb = 0;
      for (let j = 0; j < W; j++) { const da = a[j] - ma, db = b[j] - mb; cv += da * db; va += da * da; vb += db * db; }
      return va > 0 && vb > 0 ? cv / Math.sqrt(va * vb) : NaN;
    });
    return { pane: 'sub', plots: [line(v, `ρ(P,V) ${W}`, C.stat)] };
  },
  /** Donchian Position — posisi close dalam channel W (0..100). */
  dpos: (x, [W]) => {
    const hi = rollMax(x.high, W), lo = rollMin(x.low, W);
    return { pane: 'sub', plots: [line(x.close.map((c, i) => (hi[i] > lo[i] ? ((c - lo[i]) / (hi[i] - lo[i])) * 100 : 50)), `DonPos ${W}`, C.trend)] };
  },
  /** Vol-of-Vol — stdev dari realized vol (W2) atas window W1. */
  vov: (x, [W1, W2]) => {
    const r = logRet(x.close).map((v) => (Number.isFinite(v) ? v * v : NaN));
    const rv = smaA(r, W2).map((v) => (Number.isFinite(v) && v >= 0 ? Math.sqrt(v) : NaN));
    return { pane: 'sub', plots: [line(rollStd(rv as number[], W1).map((v) => v * 100), `VoV ${W1}/${W2}`, C.vol)] };
  },
  /** NVT-style Proxy — harga / SMA(volume) ternormalisasi z (aktivitas vs valuasi). */
  nvtp: (x, [W]) => {
    const nv = x.close.map((c, i) => { const mv = smaA(x.volume, W)[i]; return mv > 0 ? c / mv : NaN; });
    const m = smaA(nv, W), sd = rollStd(nv, W);
    return { pane: 'sub', plots: [line(nv.map((v, i) => (Number.isFinite(sd[i]) && sd[i] > 0 ? (v - m[i]) / sd[i] : NaN)), `NVTz ${W}`, C.stat)] };
  },
  /** OBV Slope — kemiringan OBV (per W bar) dinormalisasi σ. */
  obvs: (x, [W]) => {
    const obv = cum(x.close.map((c, i) => (i === 0 ? 0 : c > x.close[i - 1] ? x.volume[i] : c < x.close[i - 1] ? -x.volume[i] : 0)));
    const sd = rollStd(obv, W);
    return { pane: 'sub', plots: [hist(obv.map((v, i) => (i >= W && Number.isFinite(sd[i]) && sd[i] > 0 ? (v - obv[i - W]) / sd[i] : NaN)), `OBVslope ${W}`, C.flow)] };
  },
  /** Ulcer Index — akar mean kuadrat drawdown window W. */
  ulcer: (x, [W]) => {
    const u = x.close.map((_, i) => {
      if (i < W) return NaN; let s = 0; let m = -Infinity;
      for (let j = i - W + 1; j <= i; j++) { m = Math.max(m, x.close[j]); const d = ((x.close[j] - m) / m) * 100; s += d * d; }
      return Math.sqrt(s / W);
    });
    return { pane: 'sub', plots: [line(u, `Ulcer ${W}`, C.liq)] };
  },
  /** Choppiness Index — 100·log10(ΣTR/range)/log10(W). */
  chop: (x, [W]) => {
    const tr = trArr(x);
    const v = x.close.map((_, i) => {
      if (i < W) return NaN;
      let s = 0; for (let j = i - W + 1; j <= i; j++) s += tr[j];
      const hi = Math.max(...x.high.slice(i - W + 1, i + 1)), lo = Math.min(...x.low.slice(i - W + 1, i + 1));
      return hi > lo && s > 0 ? (100 * Math.log10(s / (hi - lo))) / Math.log10(W) : NaN;
    });
    return { pane: 'sub', plots: [line(v, `Chop ${W}`, C.stat)] };
  },
  /** Streak — jumlah bar berturut naik(+)/turun(−), EMA W. */
  streak: (x, [W]) => {
    let st = 0;
    const s = x.close.map((c, i) => {
      if (i === 0) return 0;
      st = c > x.close[i - 1] ? Math.max(1, st + 1) : c < x.close[i - 1] ? Math.min(-1, st - 1) : 0;
      return st;
    });
    return { pane: 'sub', plots: [hist(W > 1 ? emaA(s, W) : s, `Streak e${W}`, C.trend)] };
  },
};

// ── PRESET GRID ──────────────────────────────────────────────────────────────
type Grid = { fam: string; cat: IndicatorPreset['category']; sub: string; name: (p: number[]) => string; kw: string[]; grids: number[][]; pane: 'main' | 'sub' };
const G: Grid[] = [
  { fam: 'cvd',    cat: 'Volume',         sub: 'CVD',            name: (p) => `CVD ${p[0] === 0 ? 'Cumulative' : 'Rolling ' + p[0]}${p[1] > 1 ? ' · EMA ' + p[1] : ''}`, kw: ['cvd','delta','velo','taker','flow'], pane: 'sub',
    grids: [0, 20, 50, 100, 200, 365, 500].flatMap((w) => [1, 5, 9, 14, 21].map((s) => [w, s])) },                                    // 35
  { fam: 'vdelta', cat: 'Volume',         sub: 'Volume Delta',   name: (p) => `Volume Delta · EMA ${p[0]}`, kw: ['delta','volume','velo','aggressor'], pane: 'sub',
    grids: [[3], [5], [7], [14], [21]] },                                                                                             // 5
  { fam: 'taker',  cat: 'Microstructure', sub: 'Taker Pressure', name: (p) => `Taker Buy Pressure ${p[0]}`, kw: ['taker','buy','pressure','velo','aggressor'], pane: 'sub',
    grids: [[7], [14], [21], [34], [55], [89], [100], [144], [200], [365]] },                                                          // 10
  { fam: 'liqwick', cat: 'Microstructure', sub: 'Liquidations',  name: (p) => `Liquidation Wick ${p[0]}×ATR · z≥${p[1]}`, kw: ['liquidation','liq','wick','cascade','velo'], pane: 'sub',
    grids: [1.5, 2, 2.5, 3].flatMap((w) => [1.5, 2, 3].map((z) => [w, z])) },                                                          // 12
  { fam: 'whalez', cat: 'Volume',         sub: 'Whale Detect',   name: (p) => `Whale Volume Z ${p[0]}`, kw: ['whale','volume','zscore','anomaly'], pane: 'sub',
    grids: [[10], [20], [30], [50], [75], [100], [150], [200], [365]] },                                                               // 9
  { fam: 'fundp',  cat: 'Sentiment',      sub: 'Funding Proxy',  name: (p) => `Funding Proxy ‰ vs VWAP${p[0]}${p[1] > 1 ? ' · EMA ' + p[1] : ''}`, kw: ['funding','premium','perp','velo','proxy'], pane: 'sub',
    grids: [24, 72, 168, 336].flatMap((w) => [1, 8].map((s) => [w, s])) },                                                             // 8
  { fam: 'basisp', cat: 'Sentiment',      sub: 'Basis Proxy',    name: (p) => `Basis Momentum ${p[0]}/${p[1]}${p[2] > 1 ? ' · EMA ' + p[2] : ''}`, kw: ['basis','term','structure','contango','velo','proxy'], pane: 'sub',
    grids: [[8, 24], [24, 72], [72, 168], [168, 336]].flatMap(([f, l]) => [1, 8].map((s) => [f, l, s])) },                              // 8
  { fam: 'rvol',   cat: 'Volatility',     sub: 'Realized Vol',   name: (p) => `Realized Vol ${['Close-Close','Parkinson','Garman-Klass','Rogers-Satchell'][p[0]]} ${p[1]}`, kw: ['realized','volatility','parkinson','garman','klass'], pane: 'sub',
    grids: [0, 1, 2, 3].flatMap((e) => [7, 10, 14, 21, 30, 45, 60, 90, 120, 180].map((w) => [e, w])) },                                // 40
  { fam: 'vratio', cat: 'Volatility',     sub: 'Vol Regime',     name: (p) => `Vol Ratio ${p[0]}/${p[1]}`, kw: ['volatility','regime','expansion','ratio'], pane: 'sub',
    grids: [[7, 30], [7, 60], [14, 60], [14, 90], [30, 90], [30, 180], [60, 365]] },                                                   // 7
  { fam: 'atrpct', cat: 'Volatility',     sub: 'ATR Percentile', name: (p) => `ATR Percentile ${p[0]}`, kw: ['atr','percentile','volatility','rank'], pane: 'sub',
    grids: [[20], [50], [100], [150], [200], [365]] },                                                                                 // 6
  { fam: 'zprice', cat: 'Statistical',    sub: 'Z-Score',        name: (p) => `Price Z-Score ${p[0]}`, kw: ['zscore','mean','reversion','sigma'], pane: 'sub',
    grids: [[10], [20], [30], [50], [75], [100], [150], [200], [365]] },                                                               // 9
  { fam: 'ker',    cat: 'Statistical',    sub: 'Efficiency',     name: (p) => `Efficiency Ratio ${p[0]}`, kw: ['kaufman','efficiency','trend','chop'], pane: 'sub',
    grids: [[8], [10], [14], [20], [30], [50], [100], [200]] },                                                                        // 8
  { fam: 'hurst',  cat: 'Statistical',    sub: 'Hurst',          name: (p) => `Hurst Exponent ${p[0]}`, kw: ['hurst','fractal','persistence','random'], pane: 'sub',
    grids: [[32], [64], [128], [256]] },                                                                                               // 4
  { fam: 'ddown',  cat: 'Statistical',    sub: 'Drawdown',       name: (p) => `Drawdown % ${p[0] === 0 ? 'ATH' : 'High-' + p[0]}`, kw: ['drawdown','underwater','risk'], pane: 'sub',
    grids: [[0], [20], [50], [100], [200], [365]] },                                                                                   // 6
  { fam: 'sharpe', cat: 'Statistical',    sub: 'Risk-Adjusted',  name: (p) => `${p[1] === 1 ? 'Sortino' : 'Sharpe'} Rolling ${p[0]}`, kw: ['sharpe','sortino','risk','return'], pane: 'sub',
    grids: [14, 30, 60, 90, 180, 365].flatMap((w) => [0, 1].map((m) => [w, m])) },                                                     // 12
  { fam: 'rvwap',  cat: 'Moving Average', sub: 'Rolling VWAP',   name: (p) => `Rolling VWAP ${p[0] === 0 ? 'Anchored' : p[0]}`, kw: ['vwap','rolling','anchored','volume'], pane: 'main',
    grids: [[0], [10], [20], [30], [50], [100], [150], [200], [365]] },                                                                // 9
  { fam: 'vwapb',  cat: 'Volatility',     sub: 'VWAP Bands',     name: (p) => `VWAP Bands ${p[0]} ±${p[1]}σ`, kw: ['vwap','bands','deviation','sigma'], pane: 'main',
    grids: [20, 50, 100, 200].flatMap((w) => [1, 2, 3].map((k) => [w, k])) },                                                          // 12
  { fam: 'amom',   cat: 'Momentum',       sub: 'Anchored Mom',   name: (p) => `Momentum ROC ${p[0]}`, kw: ['momentum','roc','lookback'], pane: 'sub',
    grids: [[1], [2], [3], [5], [7], [10], [14], [21], [30], [45], [60], [90], [120], [150], [180], [270], [365]] },                   // 17
  { fam: 'tii',    cat: 'Trend',          sub: 'Trend Intensity', name: (p) => `Trend Intensity ${p[0]}`, kw: ['trend','intensity','strength'], pane: 'sub',
    grids: [[14], [21], [34], [55], [89]] },                                                                                           // 5
  { fam: 'sqz',    cat: 'Volatility',     sub: 'Squeeze',        name: (p) => `Squeeze Intensity ${p[0]}`, kw: ['squeeze','bollinger','keltner','ttm'], pane: 'sub',
    grids: [[20], [34], [55]] },                                                                                                       // 3
  { fam: 'corrpv', cat: 'Statistical',    sub: 'Correlation',    name: (p) => `Price-Volume ρ ${p[0]}`, kw: ['correlation','pearson','volume'], pane: 'sub',
    grids: [[20], [50], [100]] },                                                                                                      // 3
  { fam: 'dpos',   cat: 'Trend',          sub: 'Channel Position', name: (p) => `Donchian Position ${p[0]}`, kw: ['donchian','position','channel','breakout'], pane: 'sub',
    grids: [[20], [55], [100], [200]] },                                                                                               // 4
  { fam: 'vov',    cat: 'Volatility',     sub: 'Vol-of-Vol',     name: (p) => `Vol-of-Vol ${p[0]}/${p[1]}`, kw: ['vvix','vol','of','vol'], pane: 'sub',
    grids: [[30, 14], [60, 14], [30, 30], [60, 30]] },                                                                                 // 4
  { fam: 'nvtp',   cat: 'On-Chain',       sub: 'NVT Proxy',      name: (p) => `NVT-style Z ${p[0]}`, kw: ['nvt','network','value','onchain','proxy'], pane: 'sub',
    grids: [[30], [60], [90], [180]] },                                                                                                // 4
  { fam: 'obvs',   cat: 'Volume',         sub: 'OBV Slope',      name: (p) => `OBV Slope ${p[0]}`, kw: ['obv','slope','accumulation'], pane: 'sub',
    grids: [[20], [50], [100]] },                                                                                                      // 3
  { fam: 'ulcer',  cat: 'Statistical',    sub: 'Ulcer',          name: (p) => `Ulcer Index ${p[0]}`, kw: ['ulcer','drawdown','pain'], pane: 'sub',
    grids: [[14], [30], [90]] },                                                                                                       // 3
  { fam: 'chop',   cat: 'Statistical',    sub: 'Choppiness',     name: (p) => `Choppiness ${p[0]}`, kw: ['chop','choppiness','range'], pane: 'sub',
    grids: [[14], [28], [56]] },                                                                                                       // 3
  { fam: 'streak', cat: 'Momentum',       sub: 'Streak',         name: (p) => `Up/Down Streak · EMA ${p[0]}`, kw: ['streak','consecutive','runs'], pane: 'sub',
    grids: [[1], [3], [5], [8]] },                                                                                                     // 4
];

export const VELO_PRESETS: IndicatorPreset[] = G.flatMap((g) =>
  g.grids.map((params) => ({
    id: `velo_${g.fam}_${params.join('_').replace(/\./g, 'p')}`,
    name: g.name(params),
    short: g.name(params),
    category: g.cat,
    subcategory: `Velo · ${g.sub}`,
    keywords: [...g.kw, 'crypto', ...params.map(String)],
    indicator: `velo:${g.fam}`,
    params,
    author: 'ATLAS Velo Pack',
    description: `${g.name(params)} — Velo-Data-style crypto quant metric (computed from OHLCV).`,
    pane: g.pane,
  })),
);

export const VELO_INDEX: Record<string, IndicatorPreset> = Object.fromEntries(VELO_PRESETS.map((p) => [p.id, p]));
export const VELO_COUNT = VELO_PRESETS.length;

/** Execute a velo preset by id against OHLCV. Returns null for unknown ids. */
export function computeVeloPreset(id: string, ctx: VeloCtx): VeloResult | null {
  const p = VELO_INDEX[id];
  if (!p) return null;
  const fam = FAMILIES[p.indicator.slice(5)];
  if (!fam) return null;
  try { return fam(ctx, p.params as number[]); } catch { return null; }
}
