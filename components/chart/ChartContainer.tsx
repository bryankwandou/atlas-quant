'use client';
import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries, BarSeries, AreaSeries } from 'lightweight-charts';
import { useTheme } from '@/hooks/useTheme';
import { useMarketData, useLiveBars } from '@/hooks/useMarketData';
import { useChartStore } from '@/store/chartStore';
import { BarChart2, TrendingUp, Activity, Zap, Layers, Maximize2, X, Plus } from 'lucide-react';
import { computeIndicators } from '@/core/indicators/client';
import { t1moCompute } from '@/src/core/indicators/t1mo';
import { runPine } from '@/lib/pineLite';

const CandlestickChartIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 4v16M9 7H5v10h4M15 4v16M15 7h4v10h-4M9 12h6"/>
  </svg>
);

const SUB_PANELS = [
  { id: 'atlas',    label: 'T1MO Pixel' },
  { id: 'rsi',      label: 'RSI(7)'       },
  { id: 'macd',     label: 'MACD'         },
  { id: 'williams', label: '%R(14)'       },
  { id: 'stochrsi', label: 'StochRSI'    },
  { id: 'mfi',      label: 'MFI(14)'     },
  { id: 'cci',      label: 'CCI'          },
  { id: 'adx',      label: 'ADX'          },
  { id: 'obv',      label: 'OBV'          },
  { id: 'aroon',    label: 'Aroon'        },
  { id: 'cmf',      label: 'CMF'          },
  { id: 'atr',      label: 'ATR'          },
  { id: 'elder',    label: 'Elder'        },
  // ── Bandarmologi suite (smart-money flow) ──
  { id: 'bandar',   label: 'Bandar Detect' },
  { id: 'bandarad', label: 'Bandar A/D'    },
  { id: 'cvd',      label: 'CVD Flow'      },
];
const SUB_PANEL_LABEL: Record<string, string> =
  Object.fromEntries(SUB_PANELS.map(p => [p.id, p.label]));

const CHART_TYPES = [
  { id: 'candlestick', icon: CandlestickChartIcon, tip: 'Candlestick' },
  { id: 'bars',        icon: BarChart2,             tip: 'Bars'        },
  { id: 'line',        icon: TrendingUp,            tip: 'Line'        },
  { id: 'area',        icon: Activity,              tip: 'Area'        },
];

// ── T1MO Pixel — 14-indicator signal matrix ──────────────────────────────────
// AUTHORITATIVE REFERENCE: "T1MO Pixel Showcase.html" → 14 rows, full mosaic (NO
// gaps). Each column is one OHLCV bar, each row one indicator. The red/yellow/green
// "blobs" emerge naturally because neighbouring bars share a regime → like colors
// cluster. Do NOT reduce row count or gate columns — that breaks the reference look.
const PIXEL_ROWS = ['RSI7','RSI14','MACD','EMA9','EMA21','EMA50','VWAP','HMF','MFI','%R','BB','ADX','Box','ATLAS'] as const;
const PIXEL_GUTTER = 50; // left label gutter (matches reference HEADER_W)

// 7-level score→color scale (identical to reference SCORE_COLORS)
const PIXEL_SCALE: Array<{ min: number; c: string }> = [
  { min: 80, c: '#00c853' }, // strong bull
  { min: 65, c: '#69f0ae' }, // bull
  { min: 52, c: '#b9f6ca' }, // weak bull
  { min: 48, c: '#ffd740' }, // neutral
  { min: 35, c: '#ff6e40' }, // weak bear
  { min: 20, c: '#ff3d00' }, // bear
  { min: -1, c: '#dd2c00' }, // strong bear
];
const pixelColor = (s: number) => (PIXEL_SCALE.find(b => s > b.min)?.c) || '#dd2c00';
// Hairline inter-row gap, scaled to row height (tiny rows → no gap, taller rows → 1px).
const rowHeightGap = (rowH: number) => (rowH < 6 ? 0 : rowH < 12 ? 0.5 : 1);

/** Deterministic [0,1) hash of two ints — replaces Math.random so the histogram is
 *  STABLE: bar `i` keeps its value across redraws / pans / data polls (no flicker). */
function hash01(a: number, b: number): number {
  let h = (Math.imul(a + 1, 374761393) + Math.imul(b + 1, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

/** Continuous red→orange→yellow→green colormap (score 0..100). Smooth blend so the
 *  histogram hills read as gradual colour transitions, not 7 hard steps. */
const PIXEL_STOPS: Array<[number, [number, number, number]]> = [
  [0.00, [0xdd, 0x2c, 0x00]], [0.30, [0xff, 0x3d, 0x00]], [0.45, [0xff, 0x6e, 0x40]],
  [0.50, [0xff, 0xd7, 0x40]], [0.60, [0xb9, 0xf6, 0xca]], [0.80, [0x69, 0xf0, 0xae]],
  [1.00, [0x00, 0xc8, 0x53]],
];
const pixelColorSmooth = (s: number): string => {
  const x = Math.max(0, Math.min(100, s)) / 100;
  let lo = PIXEL_STOPS[0], hi = PIXEL_STOPS[PIXEL_STOPS.length - 1];
  for (let i = 0; i < PIXEL_STOPS.length - 1; i++) {
    if (x >= PIXEL_STOPS[i][0] && x <= PIXEL_STOPS[i + 1][0]) { lo = PIXEL_STOPS[i]; hi = PIXEL_STOPS[i + 1]; break; }
  }
  const t = (x - lo[0]) / ((hi[0] - lo[0]) || 1);
  const ch = (k: number) => Math.round(lo[1][k] + (hi[1][k] - lo[1][k]) * t);
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
};

/**
 * T1MO Pixel scoring engine — v10 (2026-06-16). Rebuilt from the RECOVERED original
 * `PixelHeatmap_FINAL.tsx`: each candle column draws 3 stacked rounded blocks coloured by
 * a 5-level signal bucket. This engine emits ONE REAL composite bull score (0..100) per bar
 * (RSI7/RSI14/MFI/%R/MACD/EMA-dist/ATLAS) — so the heatmap follows ACTUAL price (green in
 * up-regimes, red in down-regimes) exactly like the recovered reference, not decorative noise.
 * The draw step derives each column's {bucket, isUp, strength} from this score.
 */
function computePixelScores(
  ind: any,
  t1mo: any,
  closes: number[],
): { scores: Record<string, number[]>; active: boolean[] } {
  const n = closes.length;
  const num = (arr: any[], i: number, d = 0) => Number.isFinite(arr?.[i]) ? arr[i] : d;
  const sig = (x: number) => 50 + 50 * Math.tanh(x);

  const rsi7  = ind.rsi(7);
  const rsi14 = ind.rsi(14);
  const mfi   = ind.mfi(14);
  const wr    = ind.williamsR(14);
  const macd  = ind.macd(12, 26, 9);
  const ema21 = ind.ema(21);
  const atr   = ind.atr(14) as number[];
  const bullProb = (t1mo?.series?.bullProb ?? []) as number[];
  const a = (i: number) => num(atr as any, i, 0) || (closes[i] * 0.01) || 1;

  // Real composite bull score 0..100 per bar.
  const rawScore = closes.map((c, i) => {
    const parts = [
      num(rsi7, i, 50),
      num(rsi14, i, 50),
      num(mfi, i, 50),
      Math.max(2, Math.min(98, 100 + num(wr, i, -50))),
      sig(num(macd.histogram, i, 0) / a(i) * 1.5),
      sig((c - num(ema21, i, c)) / a(i) * 0.8),
      num(bullProb, i, 50),
    ];
    return parts.reduce((x, y) => x + y, 0) / parts.length;
  });

  // EMA(5) smoothing → blocks transition gradually like the reference, not bar-to-bar flicker.
  const score = new Array<number>(n);
  const k = 2 / (5 + 1);
  let prev = Number.isFinite(rawScore[0]) ? rawScore[0] : 50;
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(rawScore[i])) prev = rawScore[i] * k + prev * (1 - k);
    score[i] = prev;
  }

  // All rows carry the same composite score (single-series heatmap; draw reads row 0).
  const scores: Record<string, number[]> = {};
  for (const key of PIXEL_ROWS) scores[key] = score;

  return { scores, active: new Array(n).fill(true) };
}

// ── T1MO signal classifier (single source of truth, matches RightPanel badge) ──
// Maps (bullProb, positionPct) → a discrete T1MO signal exactly like the reference
// screener (Hawk1 Detected / Green Bull / Break Top Box / Spec Buy / …).
type T1moSig = { badge: string; dir: 'up' | 'down'; color: string };
function classifyT1moSignal(bp: number, pos: number): T1moSig | null {
  if (bp >= 72)                    return { badge: 'Hawk1 Detected', dir: 'up',   color: '#00c853' };
  if (bp >= 58)                    return { badge: 'Green Bull',     dir: 'up',   color: '#26a69a' };
  if (bp <= 30 && pos >= 70)       return { badge: 'Break Top Box',  dir: 'up',   color: '#ffb300' };
  if (bp <= 42 && pos <= 30)       return { badge: 'Spec Buy',       dir: 'up',   color: '#42a5f5' };
  if (bp <= 42)                    return { badge: 'Short Setup',    dir: 'down', color: '#f23645' };
  return null; // NEUTRAL / Weak — no chart marker (avoids clutter)
}

/** Scan the full T1MO history and emit a marker ONLY where the signal CHANGES
 *  (discrete events, like the reference screener — not one arrow per bar). */
function computeT1moSignalMarkers(
  bullProbArr: number[], posArr: number[], formatted: any[],
): any[] {
  const out: any[] = [];
  let prevBadge = '';
  const n = Math.min(bullProbArr.length, posArr.length, formatted.length);
  for (let i = Math.max(0, n - 300); i < n; i++) {   // last ~300 bars keeps it readable
    const sig = classifyT1moSignal(bullProbArr[i] ?? 50, posArr[i] ?? 50);
    const badge = sig?.badge ?? '';
    if (sig && badge !== prevBadge) {
      out.push({
        time: formatted[i].time,
        position: sig.dir === 'up' ? 'belowBar' : 'aboveBar',
        color: sig.color,
        shape: sig.dir === 'up' ? 'arrowUp' : 'arrowDown',
        text: sig.badge,
        size: 1,
      });
    }
    prevBadge = badge;
  }
  return out;
}

interface Props { symbol: string; timeframe: string; }

export default function ChartContainer({ symbol, timeframe }: Props) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const mainRef  = useRef<HTMLDivElement>(null);
  const volRef   = useRef<HTMLDivElement>(null);
  const subRef   = useRef<HTMLDivElement>(null);  // sub-panel STACK container (flex column)
  const chartsRef = useRef<Record<string, any>>({});
  const seriesRef = useRef<Record<string, any>>({});
  // Stacked oscillator panels — one lightweight-chart per active subPanel id.
  // Heights are divided equally across the sub-area; each is independently removable.
  const subChartsRef = useRef<Array<{ id: string; chart: any; inner: HTMLDivElement; anchor: any }>>([]);
  const pixelCanvasRef = useRef<HTMLCanvasElement>(null);  // canvas for the 'atlas' slot
  const pixelRedrawRef = useRef<(() => void) | null>(null);
  // Live pixel scores — redraw reads from here so the heatmap advances with new
  // bars instead of freezing at the build-time snapshot. Refreshed on data polls.
  const pixelScoresRef = useRef<{ scores: Record<string, number[]>; nBars: number } | null>(null);
  // SMC (Lux Algo style) overlay on the main chart — restrained rendering.
  const smcCanvasRef = useRef<HTMLCanvasElement>(null);
  const smcRedrawRef = useRef<(() => void) | null>(null);
  const smcDataRef   = useRef<{ orderBlocks: any[]; fvg: any[]; series: any } | null>(null);

  const { theme }                        = useTheme();
  const { candles, isLoading, marketClosed } = useMarketData(symbol, timeframe);
  const { liveBars } = useLiveBars(symbol, timeframe);
  const { activeIndicators, showSignals, chartType, setChartType, subPanels, addSubPanel, removeSubPanel, timezone,
    compareSymbols, removeCompareSymbol,
    replayActive, replayIndex, replayPlaying, setReplayActive, setReplayIndex, setReplayPlaying,
    drawings, addDrawing, removeDrawing, clearDrawings, drawingTool, setDrawingTool,
    pineScripts } = useChartStore();

  // ── Compare symbols — fetched independently, overlaid as normalized % lines ──
  const [compareData, setCompareData] = useState<Record<string, Array<{ time: number; close: number }>>>({});
  // ── Drawing overlay (trendlines / rays / hlines / vlines / fib) ──
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawRedrawRef = useRef<(() => void) | null>(null);
  const draftRef = useRef<{ type: string; points: { time: number; price: number }[] } | null>(null);
  const drawingsRef = useRef(drawings);
  useEffect(() => { drawingsRef.current = drawings; }, [drawings]);
  const [drawCursor, setDrawCursor] = useState(false);

  // Stable ref for candles — prevents buildCharts from re-running on every SWR poll
  // (SWR creates a new array reference on each successful fetch even with same data)
  const candlesRef = useRef<typeof candles>([]);
  useEffect(() => { candlesRef.current = candles; }, [candles]);

  // ── Fetch compare-symbol histories (own SWR-free poll; aligned in buildCharts) ──
  useEffect(() => {
    if (!compareSymbols.length) { setCompareData({}); return; }
    let alive = true;
    const load = async () => {
      const next: Record<string, Array<{ time: number; close: number }>> = {};
      await Promise.all(compareSymbols.map(async (cs) => {
        try {
          const res = await fetch(`/api/market/ohlcv?symbol=${cs}&timeframe=${timeframe}&limit=1500`);
          const j = await res.json();
          const rows = (j?.data || []) as any[];
          next[cs] = rows
            .map(c => ({ time: Math.floor(+c.open_time / 1000), close: +c.close }))
            .filter(c => c.time > 0 && c.close > 0)
            .sort((a, b) => a.time - b.time);
        } catch { next[cs] = []; }
      }));
      if (alive) setCompareData(next);
    };
    load();
    const iv = setInterval(load, 30_000);
    return () => { alive = false; clearInterval(iv); };
  }, [compareSymbols, timeframe]);

  const [panelPct, setPanelPct] = useState([52, 10, 38]);
  const panelPctRef    = useRef([52, 10, 38]);
  const buildPendingRef = useRef(false);
  const dataLengthRef  = useRef(0);
  const defaultZoomedRef = useRef(false); // apply default zoom once per symbol
  useEffect(() => { panelPctRef.current = panelPct; }, [panelPct]);
  const [dragging, setDragging] = useState<number | null>(null);
  const dragRef    = useRef<any>(null);
  const [legend, setLegend]     = useState<any>(null);
  const [ctxMenu, setCtxMenu]   = useState<any>(null);
  const [activeRange, setActiveRange] = useState<string>('3M');

  // Reset default zoom flag when symbol changes so new symbol auto-zooms
  useEffect(() => { defaultZoomedRef.current = false; }, [symbol]);

  const isDark = theme === 'dark';
  // Memoize tk — prevents buildCharts from rebuilding on every render
  const tk = useMemo(() => ({
    bg:     isDark ? '#131722' : '#ffffff',
    text2:  isDark ? '#787b86' : '#787b86',
    border: isDark ? '#2a2e39' : '#e0e3eb',
    grid:   isDark ? 'rgba(255,255,255,0.04)' : 'rgba(42,46,57,0.06)',
    crosshair: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)',
    up: '#089981', down: '#f23645',
    ema9:  isDark ? '#f7a600' : '#e6a000',
    ema21: isDark ? '#2962ff' : '#1a56db',
    ema50: isDark ? '#e91e63' : '#c2185b',
    ema200:isDark ? '#9c27b0' : '#7b1fa2',
    vwap:  isDark ? '#00bcd4' : '#0097a7',
    bb:    isDark ? '#42a5f5' : '#1976d2',
  }), [isDark]);

  // ── Draggable Splitter ──────────────────────────────────────
  const startDrag = useCallback((idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    const totalH = wrapRef.current?.clientHeight || 600;
    dragRef.current = { idx, startY: e.clientY, startPct: [...panelPct], totalH };
    setDragging(idx);
    const onMove = (ev: MouseEvent) => {
      const { idx: i, startY, startPct: sp, totalH: th } = dragRef.current;
      const dp = ((ev.clientY - startY) / th) * 100;
      setPanelPct(prev => {
        const next = [...prev];
        if (i === 0) { next[0] = Math.max(25, Math.min(75, sp[0] + dp)); next[2] = Math.max(8, 100 - next[0] - next[1]); }
        else          { next[1] = Math.max(6, Math.min(25, sp[1] + dp));  next[2] = Math.max(8, 100 - next[0] - next[1]); }
        return next;
      });
    };
    const onUp = () => { setDragging(null); dragRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelPct]);

  const spl1Ref = useRef<HTMLDivElement>(null);
  const spl2Ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const th = wrapRef.current.clientHeight;
    const h0 = Math.floor(th * panelPct[0] / 100);
    const h1 = Math.floor(th * panelPct[1] / 100);
    const h2 = th - h0 - h1;
    // Absolute positioning: each panel has top+height
    if (mainRef.current) { mainRef.current.style.top = '0px'; mainRef.current.style.height = h0 + 'px'; }
    if (volRef.current)  { volRef.current.style.top  = h0 + 'px'; volRef.current.style.height = h1 + 'px'; }
    if (subRef.current)  { subRef.current.style.top  = (h0 + h1) + 'px'; subRef.current.style.height = h2 + 'px'; }
    // Splitters positioned at panel boundaries
    if (spl1Ref.current) spl1Ref.current.style.top = h0 + 'px';
    if (spl2Ref.current) spl2Ref.current.style.top = (h0 + h1) + 'px';
    if (chartsRef.current.main && mainRef.current) try { chartsRef.current.main.applyOptions({ width: mainRef.current.clientWidth, height: mainRef.current.clientHeight }); } catch {}
    if (chartsRef.current.vol && volRef.current) try { chartsRef.current.vol.applyOptions({ width: volRef.current.clientWidth, height: volRef.current.clientHeight }); } catch {}
    // Stacked sub-panels: flex divides the height; read each inner's measured size.
    for (const sp of subChartsRef.current) {
      if (sp.chart && sp.inner) try { sp.chart.applyOptions({ width: sp.inner.clientWidth, height: sp.inner.clientHeight }); } catch {}
    }
    // Redraw the T1MO pixel canvas (CSS keeps it sized to the atlas slot)
    requestAnimationFrame(() => { pixelRedrawRef.current?.(); smcRedrawRef.current?.(); drawRedrawRef.current?.(); });
  }, [panelPct, subPanels]);

  // Timezone IANA name for Intl.DateTimeFormat. Settings stores IANA strings
  // directly ('UTC','Asia/Tokyo',…); 'local' (or empty) → browser zone (undefined).
  const tzName = (!timezone || timezone === 'local') ? undefined
    : timezone === 'utc' ? 'UTC' : timezone === 'gmt+7' ? 'Asia/Jakarta' : timezone;
  // Short label for the axis tooltip (e.g. "Asia/Tokyo" → "TOKYO", "UTC" → "UTC")
  const tzLabel = !tzName ? 'Local' : (tzName.split('/').pop() || tzName).replace(/_/g, ' ').toUpperCase();

  const baseOpts = useCallback((el: HTMLDivElement) => {
    const showSecs = ['1s','5s','10s','15s','30s','45s'].includes(timeframe);
    const showTime = !['1M','3M','6M','12M'].includes(timeframe);

    const fmtTime = (t: number) => {
      const d = new Date(t * 1000);
      const opts: Intl.DateTimeFormatOptions = showSecs
        ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: tzName }
        : { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tzName };
      return d.toLocaleTimeString('en-GB', opts);
    };

    const fmtDate = (t: number) => {
      const d = new Date(t * 1000);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: tzName });
    };

    return {
      layout: { background: { type: ColorType.Solid, color: tk.bg }, textColor: tk.text2, fontFamily: 'Roboto Mono, monospace', fontSize: 10, attributionLogo: false },
      grid:   { vertLines: { color: tk.grid, style: 1 }, horzLines: { color: tk.grid, style: 1 } },
      crosshair: { mode: 1, vertLine: { color: tk.crosshair, width: 1, style: 3, labelVisible: true }, horzLine: { color: tk.crosshair, width: 1, style: 3, labelVisible: true } },
      // Fixed minimum width so every stacked panel's price axis is the same width →
      // their time columns line up exactly (pixel-locked panes, TradingView-style).
      rightPriceScale: { borderColor: tk.border, textColor: tk.text2, minimumWidth: 78 },
      timeScale: {
        borderColor: tk.border, textColor: tk.text2,
        timeVisible: showTime, secondsVisible: showSecs,
        rightOffset: 10, lockVisibleTimeRangeOnResize: true,
        tickMarkFormatter: (t: number, tickMarkType: number) => {
          // TickMarkType: 0=Year, 1=Month, 2=Day, 3=Time, 4=TimeWithSeconds
          if (tickMarkType <= 2) return fmtDate(t);
          return fmtTime(t);
        },
      },
      localization: {
        timeFormatter: (t: number) => `${fmtDate(t)}  ${fmtTime(t)}  ${tzLabel}`,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true } },
      width: el.clientWidth || 800, height: el.clientHeight || 400,
    };
  }, [tk, timeframe, timezone, tzName, tzLabel]);

  const buildCharts = useCallback(() => {
    if (chartsRef.current._obs) chartsRef.current._obs.disconnect();
    Object.entries(chartsRef.current).forEach(([k, c]) => { if (k !== '_obs') try { c.remove(); } catch {} });
    for (const sp of subChartsRef.current) { try { sp.chart.remove(); } catch {} }
    subChartsRef.current = [];
    chartsRef.current = {}; seriesRef.current = {};
    pixelRedrawRef.current = null;  // drop stale T1MO-pixel redraw closure
    smcRedrawRef.current = null;    // drop stale SMC overlay redraw closure

    const currentCandles = candlesRef.current;
    if (!mainRef.current || !volRef.current || !subRef.current || !currentCandles?.length) return;

    const fmtAll = currentCandles
      .map((c: any) => ({ time: Math.floor(c.open_time / 1000) as any, open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: +c.volume }))
      .sort((a: any, b: any) => a.time - b.time)
      .filter((c: any) => c.time > 0 && c.close > 0);

    // Bar-replay: truncate the visible history to the paused index so the chart
    // "plays back" candle-by-candle (TradingView-style). Indicators recompute on
    // the truncated set, exactly as if those future bars hadn't printed yet.
    const formatted = (replayActive && replayIndex >= 2 && replayIndex < fmtAll.length)
      ? fmtAll.slice(0, replayIndex)
      : fmtAll;

    if (formatted.length < 2) return;

    const closes  = formatted.map((c: any) => c.close);
    const highs   = formatted.map((c: any) => c.high);
    const lows    = formatted.map((c: any) => c.low);
    const volumes = formatted.map((c: any) => c.volume);
    const times   = formatted.map((c: any) => c.time);
    const ind = computeIndicators(closes, highs, lows, volumes);

    // ── MAIN CHART ──────────────────────────────────────────────
    // When oscillator panels are stacked below, only the BOTTOM pane shows the
    // date axis (TradingView-style) — so the main chart hides its own time axis.
    const mainBase = baseOpts(mainRef.current) as any;
    const main = createChart(mainRef.current, subPanels.length
      ? { ...mainBase, timeScale: { ...mainBase.timeScale, visible: false } }
      : mainBase);
    chartsRef.current.main = main;

    let candleSeries: any;
    if (chartType === 'line') {
      candleSeries = (main as any).addSeries(LineSeries, { color: tk.up, lineWidth: 2, priceLineVisible: true, lastValueVisible: true });
      candleSeries.setData(formatted.map((c: any) => ({ time: c.time, value: c.close })));
    } else if (chartType === 'area') {
      // Area: visible gradient fill — topColor must have strong opacity so it's distinct from Line
      candleSeries = (main as any).addSeries(AreaSeries, { topColor: `${tk.up}70`, bottomColor: `${tk.up}08`, lineColor: tk.up, lineWidth: 2 });
      candleSeries.setData(formatted.map((c: any) => ({ time: c.time, value: c.close })));
    } else if (chartType === 'bars') {
      candleSeries = (main as any).addSeries(BarSeries, { upColor: tk.up, downColor: tk.down });
      candleSeries.setData(formatted.map((c: any) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
    } else {
      candleSeries = (main as any).addSeries(CandlestickSeries, {
        upColor: tk.up, downColor: tk.down, borderUpColor: tk.up, borderDownColor: tk.down, wickUpColor: tk.up, wickDownColor: tk.down,
      });
      candleSeries.setData(formatted.map((c: any) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
    }
    seriesRef.current.candle = candleSeries;

    const addedSeries: Record<string, any> = {};

    const addLine = (vals: number[], color: string, title: string, lineStyle = 0, lineWidth = 1) => {
      const s = (main as any).addSeries(LineSeries, { color, lineWidth, lineStyle, title, priceLineVisible: false, lastValueVisible: true });
      s.setData(times.map((t: number, i: number) => ({ time: t, value: vals[i] })).filter((d: any) => !isNaN(d.value) && isFinite(d.value)));
      return s;
    };

    // EMA Lines
    [{ id: 'EMA_9', p: 9, c: tk.ema9 }, { id: 'EMA_21', p: 21, c: tk.ema21 }, { id: 'EMA_50', p: 50, c: tk.ema50 }, { id: 'EMA_200', p: 200, c: tk.ema200 }]
      .filter(x => activeIndicators.includes(x.id))
      .forEach(({ id, p, c }) => { const v = ind.ema(p); addedSeries[id] = { series: addLine(v, c, `EMA ${p}`), vals: v }; });

    // SMA
    if (activeIndicators.includes('SMA_20')) addLine(ind.sma(20), '#ff9800', 'SMA 20');
    if (activeIndicators.includes('SMA_50')) addLine(ind.sma(50), '#f44336', 'SMA 50');
    if (activeIndicators.includes('SMA_200')) addLine(ind.sma(200), '#e91e63', 'SMA 200');

    // VWAP
    if (activeIndicators.includes('VWAP')) {
      const vv = ind.vwap();
      const s = addLine(vv, tk.vwap, 'VWAP', 2);
      addedSeries['VWAP'] = { series: s, vals: vv };
    }

    // Bollinger Bands
    if (activeIndicators.includes('BB')) {
      const bb = ind.bollingerBands(20, 2);
      addLine(bb.upper, tk.bb, 'BB Upper', 0, 0.8);
      addLine(bb.middle, tk.bb, 'BB Mid',   2, 0.8);
      addLine(bb.lower, tk.bb, 'BB Lower',  0, 0.8);
    }

    // HMA, ALMA, DEMA, TEMA, ZLEMA
    if (activeIndicators.includes('HMA'))    addLine(ind.hma(14),  '#ff6b35', 'HMA(14)', 0, 1.5);
    if (activeIndicators.includes('ALMA'))   addLine(ind.alma(21), '#ab47bc', 'ALMA(21)');
    if (activeIndicators.includes('DEMA'))   addLine(ind.dema(21), '#26c6da', 'DEMA(21)');
    if (activeIndicators.includes('TEMA'))   addLine(ind.tema(21), '#66bb6a', 'TEMA(21)');
    if (activeIndicators.includes('ZLEMA'))  addLine(ind.zlema(21),'#ffa726', 'ZLEMA(21)');

    // Keltner Channel
    if (activeIndicators.includes('KELTNER')) {
      const kc = ind.keltner(20, 10, 1.5);
      addLine(kc.upper, 'rgba(255,193,7,0.6)', 'KC Upper', 2, 0.8);
      addLine(kc.lower, 'rgba(255,193,7,0.6)', 'KC Lower', 2, 0.8);
    }

    // Parabolic SAR
    if (activeIndicators.includes('PSAR')) {
      const sarV = ind.parabolicSAR(0.02, 0.2);
      const s = (main as any).addSeries(LineSeries, { color: '#ff5722', lineWidth: 0, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: true, crosshairMarkerRadius: 2 });
      s.setData(times.map((t: number, i: number) => ({ time: t, value: sarV[i] })).filter((d: any) => !isNaN(d.value)));
    }

    // Ichimoku Cloud
    if (activeIndicators.includes('ICHIMOKU')) {
      const ich = ind.ichimoku();
      addLine(ich.tenkan,  '#ef5350', 'Tenkan', 0, 1);
      addLine(ich.kijun,   '#2196f3', 'Kijun',  0, 1.5);
      addLine(ich.senkouA, 'rgba(76,175,80,0.4)',  'Senkou A', 0, 0.5);
      addLine(ich.senkouB, 'rgba(244,67,54,0.4)',  'Senkou B', 0, 0.5);
      addLine(ich.chikou,  'rgba(156,39,176,0.7)', 'Chikou',  0, 1);
    }

    // Supertrend
    if (activeIndicators.includes('SUPERTREND')) {
      const st = ind.supertrend(10, 3);
      const upS = (main as any).addSeries(LineSeries, { color: '#089981', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      upS.setData(times.map((t: number, i: number) => ({ time: t, value: st.direction[i] === 1 ? st.lower[i] : NaN })).filter((d: any) => !isNaN(d.value)));
      const dnS = (main as any).addSeries(LineSeries, { color: '#f23645', lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
      dnS.setData(times.map((t: number, i: number) => ({ time: t, value: st.direction[i] === -1 ? st.upper[i] : NaN })).filter((d: any) => !isNaN(d.value)));
    }

    // WMA / VWMA
    if (activeIndicators.includes('WMA_20'))   addLine(ind.wma(20),   '#ef9a9a', 'WMA(20)');
    if (activeIndicators.includes('VWMA'))     addLine(ind.vwma(20),  '#80cbc4', 'VWMA(20)');

    // Donchian Channel
    if (activeIndicators.includes('DONCHIAN')) {
      const dc = ind.donchian(20);
      addLine(dc.upper, 'rgba(255,193,7,0.7)', 'DC Upper', 0, 0.8);
      addLine(dc.middle,'rgba(255,193,7,0.4)', 'DC Mid',   2, 0.6);
      addLine(dc.lower, 'rgba(255,193,7,0.7)', 'DC Lower', 0, 0.8);
    }

    // VWAP Bands
    if (activeIndicators.includes('VWAP_BANDS')) {
      const vb = ind.vwapBands(2);
      addLine(vb.upper, 'rgba(0,188,212,0.5)', 'VWAP+2σ', 2, 0.8);
      addLine(vb.lower, 'rgba(0,188,212,0.5)', 'VWAP-2σ', 2, 0.8);
    }

    // Chandelier Exit
    if (activeIndicators.includes('CHANDELIER')) {
      const ce = ind.chandelierExit(22, 3);
      const upS = (main as any).addSeries(LineSeries, { color: '#26c6da', lineWidth: 1.5, lineStyle: 0, priceLineVisible: false, lastValueVisible: false });
      upS.setData(times.map((t: number, i: number) => ({ time: t, value: ce.longStop[i] })).filter((d: any) => !isNaN(d.value) && d.value > 0));
      const dnS = (main as any).addSeries(LineSeries, { color: '#ef5350', lineWidth: 1.5, lineStyle: 0, priceLineVisible: false, lastValueVisible: false });
      dnS.setData(times.map((t: number, i: number) => ({ time: t, value: ce.shortStop[i] })).filter((d: any) => !isNaN(d.value) && d.value > 0));
    }

    // Support & Resistance
    if (activeIndicators.includes('SR_LEVELS')) {
      const srData = ind.supportResistance(20);
      const supports = srData.supports || [];
      const resistances = srData.resistances || [];
      supports.slice(0, 3).forEach((sr: any) => {
        try { candleSeries.createPriceLine({ price: sr.price, color: 'rgba(8,153,129,0.6)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'S' }); } catch {}
      });
      resistances.slice(0, 3).forEach((sr: any) => {
        try { candleSeries.createPriceLine({ price: sr.price, color: 'rgba(242,54,69,0.6)', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: 'R' }); } catch {}
      });
    }

    // Pivot Points
    if (activeIndicators.includes('PIVOTS')) {
      const pp = ind.pivotPoints();
      const pivotColors: Record<string, string> = {
        pp: '#f7a600', r1: '#f23645', r2: '#f23645', r3: '#f23645',
        s1: '#089981', s2: '#089981', s3: '#089981',
      };
      Object.entries(pp).forEach(([key, val]) => {
        if (typeof val === 'number' && !isNaN(val) && val > 0) {
          try {
            candleSeries.createPriceLine({ price: val, color: pivotColors[key] || '#888', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: key.toUpperCase() });
          } catch {}
        }
      });
    }

    // SMC Fair Value Gaps
    if (activeIndicators.includes('SMC_FVG')) {
      const smc = ind.detectSMC();
      (smc.fvg ?? []).slice(-8).forEach((fvg: any) => {
        const color = fvg.type === 'bullish' ? 'rgba(8,153,129,0.25)' : 'rgba(242,54,69,0.25)';
        try {
          candleSeries.createPriceLine({ price: fvg.top ?? fvg.high, color, lineWidth: 1, lineStyle: 4, axisLabelVisible: false, title: '' });
          candleSeries.createPriceLine({ price: fvg.bottom ?? fvg.low, color, lineWidth: 1, lineStyle: 4, axisLabelVisible: false, title: fvg.type === 'bullish' ? 'FVG▲' : 'FVG▼' });
        } catch {}
      });
    }

    // ── SMC (Lux Algo style) — drawn on a canvas overlay, NOT as full-width price
    // lines. Only the most recent unmitigated zones are shown as boxes that extend
    // to the right edge, so the chart stays clean (the old createPriceLine approach
    // flooded the chart with "OB" lines everywhere). Gated by the SMC toggle.
    smcDataRef.current = null;
    smcRedrawRef.current = null;
    if (activeIndicators.includes('SMC_OB')) {
      try {
        const smc = ind.detectSMC();
        smcDataRef.current = {
          orderBlocks: (smc.orderBlocks ?? []).slice(-3),  // last 3 only — restraint
          fvg:         (smc.fvg ?? []).slice(-2),
          series:      candleSeries,
        };
        const drawSMC = () => {
          const canvas = smcCanvasRef.current;
          const data = smcDataRef.current;
          if (!canvas || !data || !chartsRef.current.main) return;
          const W = canvas.clientWidth, H = canvas.clientHeight;
          if (W < 2 || H < 2) return;
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, W, H);
          const ts = chartsRef.current.main.timeScale();
          const ser = data.series;
          const drawZone = (idx: number, top: number, bot: number, bull: boolean, label: string) => {
            let x = ts.logicalToCoordinate(idx as any);
            if (x == null) x = 0;
            const yTop = ser.priceToCoordinate(top), yBot = ser.priceToCoordinate(bot);
            if (yTop == null || yBot == null) return;
            const fill   = bull ? 'rgba(8,153,129,0.12)' : 'rgba(242,54,69,0.12)';
            const stroke = bull ? 'rgba(8,153,129,0.55)' : 'rgba(242,54,69,0.55)';
            ctx.fillStyle = fill;
            ctx.fillRect(x, Math.min(yTop, yBot), W - x, Math.abs(yBot - yTop));
            ctx.strokeStyle = stroke; ctx.lineWidth = 1;
            ctx.strokeRect(x, Math.min(yTop, yBot), W - x, Math.abs(yBot - yTop));
            ctx.fillStyle = stroke; ctx.font = '9px "Roboto Mono", monospace'; ctx.textBaseline = 'middle';
            ctx.fillText(label, W - 64, Math.min(yTop, yBot) + 7);
          };
          // FVG first (behind), then order blocks (front)
          for (const f of data.fvg) drawZone(f.idx, f.top, f.bottom, f.type === 'bullish', f.type === 'bullish' ? 'FVG ▲' : 'FVG ▼');
          for (const ob of data.orderBlocks) drawZone(ob.idx, ob.high, ob.low, ob.type === 'bullish', ob.type === 'bullish' ? 'Bull OB' : 'Bear OB');
        };
        smcRedrawRef.current = drawSMC;
        main.timeScale().subscribeVisibleLogicalRangeChange(drawSMC);
        requestAnimationFrame(() => { drawSMC(); requestAnimationFrame(drawSMC); });
      } catch { /* SMC compute error — non-fatal */ }
    }

    // ── T1MO Core — permanent overlay per DARURAT HUKUM design requirement ──
    // lastValueVisible:false — the four box/EMA lines sit close together, so their
    // axis price-labels clamp and overlap into an unreadable cluster (esp. when the
    // last value sits outside the visible window). Values are shown in the floating
    // legend on crosshair instead (reference shows them in a side table, not on-axis).
    // Series are stored in seriesRef so the live-tick effect can move their last point
    // in lock-step with the candle (otherwise the candle ticks up while the lines
    // stay at the build-time snapshot → the "deviating line" defect).
    try {
      const t1moResult = t1moCompute({ close: closes, high: highs, low: lows, volume: volumes, open: closes, time: times } as any, {});
      if (t1moResult.meta.ready) {
        const { backbone: t1moBB, magenta: t1moMG, topBox: t1moTop, btmBox: t1moBtm } = t1moResult.series;
        const addOverlay = (vals: any[], opts: any, key: string) => {
          const s = (main as any).addSeries(LineSeries, { priceLineVisible: false, lastValueVisible: false, ...opts });
          s.setData(times.map((t: number, i: number) => ({ time: t, value: vals?.[i] })).filter((d: any) => d.value != null && isFinite(d.value)));
          seriesRef.current[key] = s;
        };
        // No `title` → no price-axis tag (the four lines sit close together and their
        // tags overlapped into an unreadable cluster). Identify them by color instead.
        if (t1moBB)  addOverlay(t1moBB as any[],  { color: '#00bcd4', lineWidth: 2.5, lineStyle: 0 }, 't1moBB');
        if (t1moMG)  addOverlay(t1moMG as any[],  { color: '#e91e63', lineWidth: 1.5, lineStyle: 1 }, 't1moMG');
        if (t1moTop) addOverlay(t1moTop as any[], { color: '#ff9800', lineWidth: 3,   lineStyle: 0 }, 't1moTop');
        if (t1moBtm) addOverlay(t1moBtm as any[], { color: '#795548', lineWidth: 3,   lineStyle: 0 }, 't1moBtm');

        // ── Real T1MO signal markers (Spec Buy / Break Top Box / Green Bull / Hawk1) ──
        // Replaces the old fake (idx+symbol.length)%2 parity placeholder. Derived from
        // the same bullProb+positionPct the RightPanel badge uses, scanned across history.
        if (showSignals && formatted.length > 20) {
          const bpArr  = (t1moResult.series.bullProb ?? []) as number[];
          const posArr = (t1moResult.series.positionPct ?? []) as number[];
          const markers = computeT1moSignalMarkers(bpArr, posArr, formatted);
          if (markers.length) {
            try { candleSeries.setMarkers(markers); } catch {}
          }
        }
      }
    } catch { /* T1MO compute error — non-fatal */ }

    // ── COMPARE / OVERLAY SYMBOLS ──────────────────────────────────────────────
    // Each compare symbol is drawn as a normalized %-change line on a SEPARATE
    // left price scale, so the main candles keep their absolute right axis while
    // the user compares relative performance (shape) against the base symbol.
    const COMPARE_COLORS = ['#ff9800', '#ab47bc', '#26c6da', '#ec407a'];
    if (compareSymbols.length) {
      try { (main as any).priceScale('left').applyOptions({ visible: true, borderColor: tk.border, textColor: tk.text2 }); } catch {}
      compareSymbols.forEach((cs, ci) => {
        const rows = compareData[cs] || [];
        if (rows.length < 2) return;
        const map = new Map<number, number>();
        for (const r of rows) map.set(r.time, r.close);
        // Forward-fill align to the main timeline, then normalize to % vs first point.
        let base = NaN; let lastClose = NaN;
        const pct = times.map((t: number) => {
          const c = map.get(t);
          if (Number.isFinite(c)) lastClose = c as number;
          if (!Number.isFinite(lastClose)) return NaN;
          if (!Number.isFinite(base)) base = lastClose;
          return (lastClose / base - 1) * 100;
        });
        const color = COMPARE_COLORS[ci % COMPARE_COLORS.length];
        const s = (main as any).addSeries(LineSeries, {
          color, lineWidth: 1.5, priceScaleId: 'left', priceLineVisible: false,
          lastValueVisible: true, title: cs,
        });
        s.setData(times.map((t: number, i: number) => ({ time: t, value: pct[i] })).filter((d: any) => Number.isFinite(d.value)));
      });
    }

    // ── PINE-LITE SCRIPTS ──────────────────────────────────────────────────────
    // Enabled scripts are interpreted over the (replay-aware) OHLCV history; each
    // plot() becomes a line on the main pane, or — when panel="sub" — on a hidden
    // secondary scale so oscillators don't distort the candle scale.
    const enabledPine = pineScripts.filter(p => p.enabled && p.code.trim());
    if (enabledPine.length) {
      const opens = formatted.map((c: any) => c.open);
      for (const ps of enabledPine) {
        try {
          const res = runPine(ps.code, { open: opens, high: highs, low: lows, close: closes, volume: volumes });
          for (const pl of res.plots) {
            const scaleId = pl.panel === 'sub' ? 'pineOsc' : 'right';
            const s = (main as any).addSeries(LineSeries, {
              color: pl.color, lineWidth: pl.kind === 'hline' ? 1 : 1.6,
              lineStyle: pl.kind === 'hline' ? 2 : 0,
              priceScaleId: scaleId, priceLineVisible: false, lastValueVisible: pl.kind !== 'hline',
              title: pl.title,
            });
            s.setData(times.map((t: number, i: number) => ({ time: t, value: pl.data[i] })).filter((d: any) => Number.isFinite(d.value)));
          }
        } catch { /* per-script error — non-fatal, editor surfaces it */ }
      }
      try { (main as any).priceScale('pineOsc').applyOptions({ visible: false, scaleMargins: { top: 0.05, bottom: 0.05 } }); } catch {}
    }

    dataLengthRef.current = formatted.length;
    main.timeScale().fitContent();
    // Set a default visible range so the chart doesn't show the entire history
    {
      const ZOOM_CANDLES: Record<string, number> = {
        '1s':  180, '15s': 120, '30s': 90,
        '1m':  120, '3m':  100, '5m':  100,
        '10m': 96,  '15m': 96,  '30m': 90, '45m': 80,
        '1h':  168, '2h':  120, '3h':  90, '4h':  180,
        '6h':  90,  '8h':  60,  '12h': 60,
        '1d':  90,  '2d':  60,  '3d':  45,  // 3 months default — match reference design
        '1w':  52,  '2w':  26,
        '1M':  24,  '3M':  12,  '6M':  8,   '12M': 5,
      };
      const defaultCandles = ZOOM_CANDLES[timeframe] ?? 120;
      if (formatted.length > defaultCandles) {
        try {
          main.timeScale().setVisibleLogicalRange({
            from: formatted.length - defaultCandles - 1,
            to:   formatted.length + 5,
          });
        } catch {}
      }
    }

    // ── VOLUME CHART ──────────────────────────────────────────
    const volChart = createChart(volRef.current!, { ...(baseOpts(volRef.current!) as any), timeScale: { ...baseOpts(volRef.current!).timeScale, visible: false } });
    chartsRef.current.vol = volChart;
    const volSeries = (volChart as any).addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'right' });
    volSeries.setData(formatted.map((c: any) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? 'rgba(8,153,129,0.55)' : 'rgba(242,54,69,0.55)' })));
    if (activeIndicators.includes('VOLUME')) {
      const vsma = ind.sma(20);
      const vs = (volChart as any).addSeries(LineSeries, { color: '#ff9800', lineWidth: 1, priceScaleId: 'right', priceLineVisible: false, lastValueVisible: false });
      vs.setData(times.map((t: number, i: number) => ({ time: t, value: vsma[i] })).filter((d: any) => !isNaN(d.value)));
    }

    // ── SUB CHARTS (stacked, TradingView-style) ───────────────
    // One lightweight-chart per active subPanel id, rendered into its slot's
    // `.sub-chart-inner`. The per-indicator render branches below are unchanged —
    // we loop, binding `subPanel` to each slot's id so every branch still matches.
    // Only the bottom-most panel shows the time axis (the rest hide it, like TV).
    const subSlotEls = Array.from(subRef.current!.querySelectorAll<HTMLDivElement>('.sub-panel-slot'));
    for (let si = 0; si < subSlotEls.length; si++) {
      const slotEl = subSlotEls[si];
      const isLastSub = si === subSlotEls.length - 1;
      const subPanel = slotEl.dataset.panel || '';
      const subChartEl = slotEl.querySelector<HTMLDivElement>('.sub-chart-inner');
      if (!subChartEl) continue;
      let subAnchorSeries: any = null;
      const subBase = baseOpts(subChartEl) as any;
      const subChart = createChart(subChartEl, isLastSub ? subBase : { ...subBase, timeScale: { ...subBase.timeScale, visible: false } });

      // Invisible anchor on its OWN price scale so cross-panel crosshair can be
      // positioned in the sub panel without distorting the real indicator scale.
      try {
        subAnchorSeries = (subChart as any).addSeries(LineSeries, {
          priceScaleId: 'xhair', color: 'rgba(0,0,0,0)', lineWidth: 1,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        });
        subAnchorSeries.setData(times.map((t: number) => ({ time: t, value: 0 })));
        (subChart as any).priceScale('xhair').applyOptions({ visible: false, autoScale: true });
      } catch {}

      const addSubLine = (vals: number[], color: string, title: string, lw = 1.5) => {
        const s = (subChart as any).addSeries(LineSeries, { color, lineWidth: lw, priceLineVisible: false, lastValueVisible: true, title });
        s.setData(times.map((t: number, i: number) => ({ time: t, value: vals[i] })).filter((d: any) => !isNaN(d.value) && isFinite(d.value)));
        return s;
      };
      const addLevel = (val: number, color: string) => {
        const s = (subChart as any).addSeries(LineSeries, { color, lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
        s.setData(times.map((t: number) => ({ time: t, value: val })));
      };

      if (subPanel === 'atlas') {
        // ── T1MO Pixel — 4-row signal matrix (canvas overlay) ─────────────────
        // Rows: HMF · RSI7 · MACD · ATLAS. Each cell colored by a 0–100 score
        // (green=bull → red=bear). Columns are GAPPED — only drawn when the T1MO
        // regime has conviction (clustered look, matches the reference).
        // The lightweight-charts sub-chart keeps only a transparent anchor (for
        // the time axis + crosshair sync); the heatmap is drawn on <canvas>,
        // x-aligned to bars via subChart.timeScale().logicalToCoordinate().
        try {
          // Hide the sub-chart right price axis for the pixel matrix (no price meaning)
          try { (subChart as any).priceScale('right').applyOptions({ visible: false }); } catch {}

          const t1moSub = t1moCompute({ close: closes, high: highs, low: lows, volume: volumes, open: closes, time: times } as any, {});
          const { scores } = computePixelScores(ind, t1moSub.meta.ready ? t1moSub : null, closes);
          // Store in ref so the live-data effect can refresh scores without rebuilding charts
          pixelScoresRef.current = { scores, nBars: formatted.length };

          const redraw = () => {
            const canvas = pixelCanvasRef.current;
            const sc = subChart;
            if (!canvas || !sc) return;
            const W = canvas.clientWidth, H = canvas.clientHeight;
            if (W < 2 || H < 2) return;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, W, H);

            const ts = sc.timeScale();
            const range = ts.getVisibleLogicalRange();
            if (!range) return;
            // Leave room at the bottom for the time axis so dates stay visible
            const axisH = (() => { try { return ts.height() || 0; } catch { return 0; } })();
            const drawH = Math.max(10, H - axisH);
            // Opaque background only over the heatmap region (axis strip stays transparent)
            ctx.fillStyle = isDark ? '#0d1218' : '#ffffff';
            ctx.fillRect(0, 0, W, drawH);

            // Read latest scores from ref (refreshed by data polls → no freeze)
            const ps     = pixelScoresRef.current;
            const scores = ps?.scores ?? {};
            const nBars  = ps?.nBars ?? 0;
            const from  = Math.max(0, Math.floor(range.from));
            const to    = Math.min(nBars - 1, Math.ceil(range.to));
            const seriesArr = scores[PIXEL_ROWS[0]] ?? [];
            const colScore = (i: number) => { const v = seriesArr[i]; return Number.isFinite(v) ? (v as number) : 50; };

            // ── T1MO Pixel — RECOVERED 3-block-per-column structure (PixelHeatmap_FINAL.tsx) ──
            // Each candle column = 3 rounded blocks: BASE (at equator) + CENTER square +
            // DYNAMIC outer block (grows UP if bullish, DOWN if bearish; height ∝ strength).
            // Colour from a 5-level signal bucket. A faint center reference line at the midline.
            const midY = drawH / 2;
            for (let i = from; i <= to; i++) {
              const xc = ts.logicalToCoordinate(i as any);
              if (xc == null) continue;
              const xn = ts.logicalToCoordinate((i + 1) as any);
              const colW = Math.max(2, (xn != null ? Math.abs(xn - xc) : 6));
              const x    = xc - colW / 2;
              const gapX = colW * 0.08;
              const bW   = Math.max(1, colW - gapX * 2);
              // Square size — capped so the full 3-block stack (≈6.8·sqH) fits the half-panel.
              const sqH  = Math.min(bW, (drawH / 2) / 7);
              const gapY = sqH * 0.15;
              const rad  = Math.max(1, bW * 0.15);

              const s        = colScore(i);
              const isUp     = s >= 50;
              const strength = Math.max(0, Math.min(1, Math.abs(s - 50) / 50));
              // 5-level bucket colours (exact from recovered BUCKET_COLOR map).
              ctx.fillStyle = s >= 72 ? '#25a77a' : s >= 57 ? '#85cc7e' : s > 43 ? '#f6c445' : s > 28 ? '#ea7c60' : '#da4b5c';

              const block = (y: number, h: number) => { ctx.beginPath(); (ctx as any).roundRect(x + gapX, y, bW, h, rad); ctx.fill(); };

              const b1y = midY - sqH / 2;
              block(b1y, sqH);                          // BASE block at the equator
              const dynH = sqH + strength * (sqH * 4);  // DYNAMIC outer block (min = sqH)
              if (isUp) {
                const b2y = b1y - gapY - sqH; block(b2y, sqH);   // CENTER square (upward)
                block(b2y - gapY - dynH, dynH);                  // DYNAMIC (upward)
              } else {
                const b2y = b1y + sqH + gapY; block(b2y, sqH);   // CENTER square (downward)
                block(b2y + sqH + gapY, dynH);                   // DYNAMIC (downward)
              }
            }

            // Center reference line (recovered source).
            ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
            ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();

            // Corner label.
            ctx.font = 'bold 9px "Roboto Mono", monospace';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isDark ? '#7a8294' : '#5a6273';
            ctx.fillText('T1MO', 5, 3);
          };

          pixelRedrawRef.current = redraw;
          subChart.timeScale().subscribeVisibleLogicalRangeChange(redraw);
          requestAnimationFrame(() => { redraw(); requestAnimationFrame(redraw); });
        } catch { /* T1MO pixel compute error — non-fatal */ }
      } else if (subPanel === 'rsi') {
        addSubLine(ind.rsi(7), '#7e57c2', 'RSI(7)');
        [[30, 'rgba(8,153,129,0.3)'], [50, 'rgba(255,255,255,0.08)'], [70, 'rgba(242,54,69,0.3)']].forEach(([v, c]) => addLevel(v as number, c as string));
      } else if (subPanel === 'macd') {
        const md = ind.macd(12, 26, 9);
        const hs = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'right' });
        hs.setData(times.map((t: number, i: number) => ({ time: t, value: md.histogram[i], color: md.histogram[i] >= 0 ? 'rgba(8,153,129,0.6)' : 'rgba(242,54,69,0.6)' })).filter((d: any) => !isNaN(d.value)));
        addSubLine(md.macd, '#2962ff', 'MACD', 1.2);
        addSubLine(md.signal, '#ff9800', 'Signal', 1.2);
      } else if (subPanel === 'williams') {
        addSubLine(ind.williamsR(14), '#26c6da', '%R(14)');
        [[-20, 'rgba(242,54,69,0.3)'], [-80, 'rgba(8,153,129,0.3)']].forEach(([v, c]) => addLevel(v as number, c as string));
      } else if (subPanel === 'stochrsi') {
        const sr = ind.stochRsi(14, 14, 3, 3);
        addSubLine(sr.k, '#2962ff', 'K', 1.2);
        addSubLine(sr.d, '#ff9800', 'D', 1.2);
        [[20, 'rgba(8,153,129,0.2)'], [80, 'rgba(242,54,69,0.2)']].forEach(([v, c]) => addLevel(v as number, c as string));
      } else if (subPanel === 'mfi') {
        addSubLine(ind.mfi(14), '#26a69a', 'MFI(14)');
        [[20, 'rgba(8,153,129,0.3)'], [80, 'rgba(242,54,69,0.3)']].forEach(([v, c]) => addLevel(v as number, c as string));
      } else if (subPanel === 'cci') {
        addSubLine(ind.cci(14), '#ff9800', 'CCI(14)');
        [[-100, 'rgba(8,153,129,0.3)'], [0, 'rgba(255,255,255,0.08)'], [100, 'rgba(242,54,69,0.3)']].forEach(([v, c]) => addLevel(v as number, c as string));
      } else if (subPanel === 'adx') {
        const adxV = ind.adx(14);
        addSubLine(adxV.adx, '#ff9800', 'ADX', 2);
        addSubLine(adxV.plusDI, '#089981', '+DI', 1);
        addSubLine(adxV.minusDI, '#f23645', '-DI', 1);
        addLevel(25, 'rgba(255,255,255,0.15)');
      } else if (subPanel === 'obv') {
        addSubLine(ind.obv(), '#26c6da', 'OBV');
      } else if (subPanel === 'aroon') {
        const ar = ind.aroon(25);
        addSubLine(ar.up,   '#089981', 'Up',   1.2);
        addSubLine(ar.down, '#f23645', 'Down', 1.2);
        addSubLine(ar.osc, '#f7a600', 'Osc', 1);
        addLevel(0, 'rgba(255,255,255,0.1)');
      } else if (subPanel === 'cmf') {
        const cmfV = ind.cmf(20);
        const cmfHist = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'right' });
        cmfHist.setData(times.map((t: number, i: number) => ({ time: t, value: cmfV[i], color: (cmfV[i] || 0) >= 0 ? 'rgba(8,153,129,0.7)' : 'rgba(242,54,69,0.7)' })).filter((d: any) => !isNaN(d.value)));
        addLevel(0, 'rgba(255,255,255,0.1)');
      } else if (subPanel === 'atr') {
        addSubLine(ind.atr(14), '#ab47bc', 'ATR(14)');
      } else if (subPanel === 'elder') {
        const er = ind.elderRay(13);
        const bullPow = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'right' });
        bullPow.setData(times.map((t: number, i: number) => ({ time: t, value: er.bullPower[i], color: 'rgba(8,153,129,0.7)' })).filter((d: any) => !isNaN(d.value)));
        const bearPow = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'right' });
        bearPow.setData(times.map((t: number, i: number) => ({ time: t, value: er.bearPower[i], color: 'rgba(242,54,69,0.7)' })).filter((d: any) => !isNaN(d.value)));
        addLevel(0, 'rgba(255,255,255,0.1)');
      } else if (subPanel === 'bandar') {
        // Bandar Detector — 0-100 accumulation score (>55 bandar accumulating, <45 distributing)
        const bd = ind.bandarDetector(8);
        // base:50 → bars grow UP from the neutral 50 line when bandar is accumulating
        // (>50) and DOWN when distributing (<50). Without this the 0-based bars sat
        // far below the auto-scaled 42–58 window and the panel looked empty.
        const hist = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'right', base: 50 });
        hist.setData(times.map((t: number, i: number) => ({ time: t, value: bd.score[i], color: (bd.score[i] ?? 50) >= 55 ? 'rgba(8,153,129,0.85)' : (bd.score[i] ?? 50) <= 45 ? 'rgba(242,54,69,0.85)' : 'rgba(255,193,7,0.75)' })).filter((d: any) => !isNaN(d.value)));
        addSubLine(bd.signal, '#ffffff', 'Signal', 1.2);
        [[55, 'rgba(8,153,129,0.25)'], [50, 'rgba(255,255,255,0.12)'], [45, 'rgba(242,54,69,0.25)']].forEach(([v, c]) => addLevel(v as number, c as string));
      } else if (subPanel === 'bandarad') {
        // Bandar Accumulation/Distribution — A/D oscillator histogram
        const ba = ind.bandarAD(21);
        const hist = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'right' });
        hist.setData(times.map((t: number, i: number) => ({ time: t, value: ba.histogram[i], color: (ba.histogram[i] ?? 0) >= 0 ? 'rgba(8,153,129,0.7)' : 'rgba(242,54,69,0.7)' })).filter((d: any) => !isNaN(d.value)));
        addLevel(0, 'rgba(255,255,255,0.12)');
      } else if (subPanel === 'cvd') {
        // Cumulative Volume Delta — smart-money net flow (rising = net buying pressure)
        const cv = ind.cvd();
        addSubLine(cv.cvd, '#00bcd4', 'CVD', 2);
        const dh = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'cvd_delta' });
        dh.setData(times.map((t: number, i: number) => ({ time: t, value: cv.delta[i], color: (cv.delta[i] ?? 0) >= 0 ? 'rgba(8,153,129,0.5)' : 'rgba(242,54,69,0.5)' })).filter((d: any) => !isNaN(d.value)));
        try { (subChart as any).priceScale('cvd_delta').applyOptions({ visible: false, scaleMargins: { top: 0.7, bottom: 0 } }); } catch {}
      }

      subChartsRef.current.push({ id: subPanel, chart: subChart, inner: subChartEl, anchor: subAnchorSeries });
    }

    // Sync timescales across ALL panels — logical range keeps them pixel-locked.
    const allCharts = [main, volChart, ...subChartsRef.current.map(s => s.chart)];
    let syncing = false;
    const syncLogical = (src: any) =>
      src.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
        if (syncing || !range) return;
        syncing = true;
        for (const c of allCharts) { if (c !== src) try { c.timeScale().setVisibleLogicalRange(range); } catch {} }
        setTimeout(() => { syncing = false; }, 16);
      });
    for (const c of allCharts) syncLogical(c);
    // Snap every sub-panel to the main chart's current view right away (otherwise a
    // freshly-added panel shows the full history until the first scroll event).
    try {
      const mr = main.timeScale().getVisibleLogicalRange();
      if (mr) for (const s of subChartsRef.current) { try { s.chart.timeScale().setVisibleLogicalRange(mr); } catch {} }
    } catch {}

    // ── Cross-panel crosshair sync (TradingView-style locked panels) ──
    // Hovering any panel draws the aligned vertical crosshair on all panels.
    let xhairSyncing = false;
    const syncXhair = (param: any, srcCh: any) => {
      if (xhairSyncing) return;
      xhairSyncing = true;
      try {
        const idx = param?.time ? formatted.findIndex((c: any) => c.time === param.time) : -1;
        const targets = [
          { ch: main,                  s: candleSeries, v: idx >= 0 ? formatted[idx]?.close  : 0 },
          { ch: chartsRef.current.vol, s: volSeries,    v: idx >= 0 ? formatted[idx]?.volume : 0 },
          ...subChartsRef.current.map(sp => ({ ch: sp.chart, s: sp.anchor, v: 0 })),
        ];
        for (const t of targets) {
          if (!t.ch || t.ch === srcCh) continue;
          if (param?.time && idx >= 0 && t.s) t.ch.setCrosshairPosition(t.v ?? 0, param.time, t.s);
          else t.ch.clearCrosshairPosition?.();
        }
      } catch {}
      xhairSyncing = false;
    };

    // Crosshair legend + sync
    main.subscribeCrosshairMove((param: any) => {
      if (!param.point || !param.time) { setLegend(null); }
      else {
        const cd = param.seriesData?.get(candleSeries);
        if (cd) {
          const idx = formatted.findIndex((c: any) => c.time === param.time);
          // For line/area, cd has .value not .open/.high/.low/.close
          const candle = (chartType === 'line' || chartType === 'area')
            ? { open: cd.value, high: cd.value, low: cd.value, close: cd.value }
            : cd;
          setLegend({ ...candle, ema9: addedSeries['EMA_9']?.vals[idx], ema21: addedSeries['EMA_21']?.vals[idx], vwap: addedSeries['VWAP']?.vals[idx] });
        }
      }
      syncXhair(param, main);
    });
    try { volChart.subscribeCrosshairMove((param: any) => syncXhair(param, volChart)); } catch {}
    for (const sp of subChartsRef.current) {
      try { sp.chart.subscribeCrosshairMove((param: any) => syncXhair(param, sp.chart)); } catch {}
    }

    // ── DRAWINGS OVERLAY (trendlines / rays / h-/v-lines / fib) ─────────────────
    // Rendered on a canvas above the main pane; anchors are stored in chart space
    // (time+price) so they stay pinned as the user pans/zooms. Redraw reads the
    // live store via drawingsRef (no chart rebuild needed when a drawing is added).
    const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const drawOverlay = () => {
      const canvas = drawCanvasRef.current;
      if (!canvas || !chartsRef.current.main) return;
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (W < 2 || H < 2) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const ts = chartsRef.current.main.timeScale();
      const ser = seriesRef.current.candle;
      if (!ser) return;
      const X = (t: number) => ts.timeToCoordinate(t as any);
      const Y = (p: number) => ser.priceToCoordinate(p);
      const drawOne = (d: { type: string; points: { time: number; price: number }[]; color: string }, draft = false) => {
        ctx.save();
        ctx.strokeStyle = d.color; ctx.fillStyle = d.color;
        ctx.lineWidth = 1.5; ctx.setLineDash(draft ? [4, 3] : []);
        const p0 = d.points[0]; const p1 = d.points[1];
        if (d.type === 'hline' && p0) {
          const y = Y(p0.price); if (y == null) { ctx.restore(); return; }
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
          ctx.font = '10px "Roboto Mono", monospace';
          ctx.fillText(p0.price.toFixed(2), 4, y - 4);
        } else if (d.type === 'vline' && p0) {
          const x = X(p0.time); if (x == null) { ctx.restore(); return; }
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        } else if ((d.type === 'trendline' || d.type === 'ray') && p0 && p1) {
          let x0 = X(p0.time), y0 = Y(p0.price), x1 = X(p1.time), y1 = Y(p1.price);
          if (x0 == null || y0 == null || x1 == null || y1 == null) { ctx.restore(); return; }
          if (d.type === 'ray' && x1 !== x0) {
            const slope = (y1 - y0) / (x1 - x0);
            const ex = x1 >= x0 ? W : 0; y1 = y0 + slope * (ex - x0); x1 = ex;
          }
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          if (!draft) { ctx.beginPath(); ctx.arc(x0, y0, 3, 0, 7); ctx.arc(x1, y1, 3, 0, 7); ctx.fill(); }
        } else if (d.type === 'fib' && p0 && p1) {
          const x0 = X(p0.time), x1 = X(p1.time);
          const hi = Math.max(p0.price, p1.price), lo = Math.min(p0.price, p1.price);
          const xa = Math.min(x0 ?? 0, x1 ?? 0), xb = Math.max(x0 ?? W, x1 ?? W);
          ctx.font = '9px "Roboto Mono", monospace';
          for (const lv of FIB_LEVELS) {
            const price = hi - (hi - lo) * lv;
            const y = Y(price); if (y == null) continue;
            ctx.globalAlpha = 0.85;
            ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xb, y); ctx.stroke();
            ctx.fillText(`${(lv * 100).toFixed(1)}%  ${price.toFixed(2)}`, xa + 4, y - 3);
          }
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      };
      for (const d of drawingsRef.current) drawOne(d);
      if (draftRef.current && draftRef.current.points.length >= 1) {
        drawOne({ ...draftRef.current, color: '#2962ff' } as any, true);
      }
    };
    drawRedrawRef.current = drawOverlay;
    main.timeScale().subscribeVisibleLogicalRangeChange(drawOverlay);
    requestAnimationFrame(() => { drawOverlay(); requestAnimationFrame(drawOverlay); });

    // ResizeObserver — absolute layout: update top+height for all panels + splitters
    const obs = new ResizeObserver(() => {
      if (!wrapRef.current) return;
      const th = wrapRef.current.clientHeight;
      const h0 = Math.floor(th * panelPctRef.current[0] / 100);
      const h1 = Math.floor(th * panelPctRef.current[1] / 100);
      const h2 = th - h0 - h1;
      if (mainRef.current) { mainRef.current.style.top = '0px'; mainRef.current.style.height = h0 + 'px'; }
      if (volRef.current)  { volRef.current.style.top  = h0 + 'px'; volRef.current.style.height = h1 + 'px'; }
      if (subRef.current)  { subRef.current.style.top  = (h0+h1) + 'px'; subRef.current.style.height = h2 + 'px'; }
      if (spl1Ref.current) spl1Ref.current.style.top = h0 + 'px';
      if (spl2Ref.current) spl2Ref.current.style.top = (h0+h1) + 'px';
      if (chartsRef.current.main && mainRef.current && h0 > 0) { try { chartsRef.current.main.applyOptions({ width: mainRef.current.clientWidth, height: h0 }); } catch {} }
      if (chartsRef.current.vol && volRef.current && h1 > 0) { try { chartsRef.current.vol.applyOptions({ width: volRef.current.clientWidth, height: h1 }); } catch {} }
      // Stacked sub-panels — flex divides the space; read each inner's measured size.
      for (const sp of subChartsRef.current) {
        if (sp.chart && sp.inner) { try { sp.chart.applyOptions({ width: sp.inner.clientWidth, height: sp.inner.clientHeight }); } catch {} }
      }
      // The T1MO pixel canvas (atlas slot) is sized via CSS; its redraw rescales the buffer.
      requestAnimationFrame(() => { pixelRedrawRef.current?.(); smcRedrawRef.current?.(); drawRedrawRef.current?.(); });
    });
    if (wrapRef.current) obs.observe(wrapRef.current);
    chartsRef.current._obs = obs;
  // candles removed — reads via candlesRef.current; panelPct removed — reads via panelPctRef.current
  }, [theme, activeIndicators, showSignals, subPanels, baseOpts, symbol, chartType,
      compareSymbols, compareData, pineScripts, replayActive, replayIndex]);

  // Full chart rebuild — does NOT destroy chart in cleanup (avoids 60ms blank flash).
  // buildCharts() itself destroys old charts at its start.
  useEffect(() => {
    buildPendingRef.current = true;
    const timer = setTimeout(() => {
      buildPendingRef.current = false;
      buildCharts();
    }, 60);
    return () => {
      clearTimeout(timer);
      buildPendingRef.current = false;
      // intentionally NOT destroying charts here — prevents white flash on every dep change
    };
  }, [buildCharts]);

  // Unmount-only cleanup
  useEffect(() => {
    return () => {
      if (chartsRef.current._obs) chartsRef.current._obs.disconnect();
      Object.entries(chartsRef.current).forEach(([k, c]) => { if (k !== '_obs') try { c.remove(); } catch {} });
      for (const sp of subChartsRef.current) { try { sp.chart.remove(); } catch {} }
      subChartsRef.current = [];
      chartsRef.current = {};
      seriesRef.current = {};
    };
  }, []);

  // Lightweight data update — or trigger rebuild when data arrives after chart was cleared
  useEffect(() => {
    if (!candles?.length) return;

    if (!seriesRef.current.candle || !chartsRef.current.main) {
      // Chart not yet built (data arrived after buildCharts returned early).
      // Trigger a rebuild only if one isn't already pending to prevent loops.
      if (!buildPendingRef.current) {
        buildPendingRef.current = true;
        setTimeout(() => { buildPendingRef.current = false; buildCharts(); }, 30);
      }
      return;
    }

    try {
      const formatted = candles
        .map((c: any) => ({ time: Math.floor(c.open_time / 1000) as any, open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: +c.volume }))
        .sort((a: any, b: any) => a.time - b.time)
        .filter((c: any) => c.time > 0 && c.close > 0);
      if (formatted.length < 2) return;
      if (chartType === 'line' || chartType === 'area') {
        seriesRef.current.candle.setData(formatted.map((c: any) => ({ time: c.time, value: c.close })));
      } else {
        seriesRef.current.candle.setData(formatted.map((c: any) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
      }
      if (seriesRef.current.vol) {
        seriesRef.current.vol.setData(formatted.map((c: any) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? 'rgba(8,153,129,0.55)' : 'rgba(242,54,69,0.55)' })));
      }
      // Recompute + re-feed the T1MO overlay lines so they track new candles on each
      // SWR poll (otherwise they keep the previous build's data → drift from price).
      if (seriesRef.current.t1moBB || seriesRef.current.t1moTop) {
        try {
          const mc = formatted.map((c: any) => c.close), mh = formatted.map((c: any) => c.high), ml = formatted.map((c: any) => c.low), mv = formatted.map((c: any) => c.volume), mt = formatted.map((c: any) => c.time);
          const r = t1moCompute({ close: mc, high: mh, low: ml, volume: mv, open: mc, time: mt } as any, {});
          if (r.meta.ready) {
            const feed = (key: string, arr: any[]) => {
              const s = seriesRef.current[key];
              if (s && arr) s.setData(mt.map((t: number, i: number) => ({ time: t, value: arr[i] })).filter((d: any) => d.value != null && isFinite(d.value)));
            };
            feed('t1moBB', r.series.backbone as any); feed('t1moMG', r.series.magenta as any);
            feed('t1moTop', r.series.topBox as any);  feed('t1moBtm', r.series.btmBox as any);
          }
        } catch {}
      }
      // Apply default zoom once after first successful data update
      if (!defaultZoomedRef.current && chartsRef.current.main && formatted.length > 0) {
        defaultZoomedRef.current = true;
        dataLengthRef.current = formatted.length;
        const ZOOM: Record<string, number> = {
          '1s':180,'15s':120,'30s':90,'1m':120,'3m':100,'5m':100,'15m':96,'30m':90,
          '1h':168,'2h':120,'4h':180,'6h':90,'12h':60,'1d':90,'2d':60,'3d':45,'1w':52,'1M':24,
        };
        const n = ZOOM[timeframe] ?? 120;
        if (formatted.length > n) {
          try {
            chartsRef.current.main.timeScale().setVisibleLogicalRange({ from: formatted.length - n - 1, to: formatted.length + 3 });
          } catch {}
        }
      }
    } catch { /* series removed during concurrent rebuild */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, chartType]);

  // ── TradingView-style per-tick update ──────────────────────────────────────
  // Update ONLY the latest candle via series.update() (no full refetch/redraw),
  // driven by the lightweight /api/market/last poll. This is what makes 1s feel
  // truly live without re-downloading 20k bars every second.
  useEffect(() => {
    if (!liveBars.length || !seriesRef.current.candle) return;
    try {
      for (const b of liveBars) {
        const t = Math.floor(b.open_time / 1000) as any;
        if (!t || !(+b.close > 0)) continue;
        if (chartType === 'line' || chartType === 'area') {
          seriesRef.current.candle.update({ time: t, value: +b.close });
        } else {
          seriesRef.current.candle.update({ time: t, open: +b.open, high: +b.high, low: +b.low, close: +b.close });
        }
        if (seriesRef.current.vol) {
          seriesRef.current.vol.update({ time: t, value: +b.volume, color: +b.close >= +b.open ? 'rgba(8,153,129,0.55)' : 'rgba(242,54,69,0.55)' });
        }
      }

      // Move the T1MO overlay lines in lock-step with the live candle so they never
      // detach (the "deviating line" defect). Recompute on the live-merged tail and
      // update only each line's last point — cheap O(n) array math, once per poll.
      if (seriesRef.current.t1moBB || seriesRef.current.t1moTop) {
        const base = candlesRef.current || [];
        if (base.length) {
          const byTime = new Map<number, any>();
          for (const c of base) byTime.set(+c.open_time, c);
          for (const b of liveBars) if (+b.open_time > 0 && +b.close > 0) byTime.set(+b.open_time, b);
          const merged = [...byTime.values()].sort((a, b) => +a.open_time - +b.open_time);
          const mc = merged.map(c => +c.close), mh = merged.map(c => +c.high), ml = merged.map(c => +c.low), mv = merged.map(c => +c.volume), mt = merged.map(c => Math.floor(+c.open_time / 1000));
          const r = t1moCompute({ close: mc, high: mh, low: ml, volume: mv, open: mc, time: mt } as any, {});
          if (r.meta.ready) {
            const li = mc.length - 1, lt = mt[li] as any;
            const upd = (key: string, arr: any[]) => {
              const s = seriesRef.current[key]; const v = arr?.[li];
              if (s && v != null && isFinite(v)) { try { s.update({ time: lt, value: v }); } catch {} }
            };
            upd('t1moBB', r.series.backbone as any); upd('t1moMG', r.series.magenta as any);
            upd('t1moTop', r.series.topBox as any);  upd('t1moBtm', r.series.btmBox as any);
          }
        }
      }
      // Keep SMC zones aligned as the live price (and thus the price scale) shifts
      smcRedrawRef.current?.();
    } catch { /* update() rejects out-of-order times — safe to ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBars, chartType]);

  // ── T1MO Pixel anti-freeze ─────────────────────────────────────────────────
  // The pixel scores are computed once in buildCharts (which reads candlesRef and
  // does NOT re-run on data polls). Without this, the heatmap freezes on a static
  // symbol/TF. Here we recompute scores from the freshest candles on each history
  // poll (~20s) so the mosaic keeps advancing. Gated to the atlas panel to avoid
  // recomputing 14 indicators when the pixel isn't shown.
  useEffect(() => {
    if (!subPanels.includes('atlas') || !pixelRedrawRef.current) return;
    const src = candlesRef.current;
    if (!src?.length) return;
    try {
      const fmtd = src
        .map((c: any) => ({ time: Math.floor(c.open_time / 1000), open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: +c.volume }))
        .sort((a: any, b: any) => a.time - b.time)
        .filter((c: any) => c.time > 0 && c.close > 0);
      if (fmtd.length < 2) return;
      const cl = fmtd.map(c => c.close), hi = fmtd.map(c => c.high), lo = fmtd.map(c => c.low), vo = fmtd.map(c => c.volume), ti = fmtd.map(c => c.time);
      const ind2 = computeIndicators(cl, hi, lo, vo);
      const t1 = t1moCompute({ close: cl, high: hi, low: lo, volume: vo, open: cl, time: ti } as any, {});
      const { scores } = computePixelScores(ind2, t1.meta.ready ? t1 : null, cl);
      pixelScoresRef.current = { scores, nBars: fmtd.length };
      requestAnimationFrame(() => { pixelRedrawRef.current?.(); smcRedrawRef.current?.(); drawRedrawRef.current?.(); });
    } catch { /* non-fatal — keep last good scores */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, subPanels]);

  // ── Drawing interaction ─────────────────────────────────────────────────────
  const DRAW_TOOLS = ['trendline', 'ray', 'hline', 'vline', 'fib'];
  const isDrawingTool = DRAW_TOOLS.includes(drawingTool);

  const getChartPoint = useCallback((clientX: number, clientY: number) => {
    const main = chartsRef.current.main; const ser = seriesRef.current.candle; const canvas = drawCanvasRef.current;
    if (!main || !ser || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const time = main.timeScale().coordinateToTime(clientX - rect.left);
    const price = ser.coordinateToPrice(clientY - rect.top);
    if (time == null || price == null) return null;
    return { time: Number(time), price: Number(price) };
  }, []);

  const onDrawPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isDrawingTool) return;
    const pt = getChartPoint(e.clientX, e.clientY); if (!pt) return;
    const color = '#2962ff';
    const newId = `dr_${Date.now()}`;
    if (drawingTool === 'hline' || drawingTool === 'vline') {
      addDrawing({ id: newId, type: drawingTool as any, points: [pt], color });
      draftRef.current = null; setDrawingTool('cursor');
    } else if (!draftRef.current) {
      draftRef.current = { type: drawingTool, points: [pt] };
    } else {
      addDrawing({ id: newId, type: draftRef.current.type as any, points: [draftRef.current.points[0], pt], color });
      draftRef.current = null; setDrawingTool('cursor');
    }
    drawRedrawRef.current?.();
  }, [isDrawingTool, drawingTool, getChartPoint, addDrawing, setDrawingTool]);

  const onDrawPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draftRef.current) return;
    const pt = getChartPoint(e.clientX, e.clientY); if (!pt) return;
    draftRef.current.points[1] = pt;
    drawRedrawRef.current?.();
  }, [getChartPoint]);

  // Escape cancels an in-progress drawing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && draftRef.current) { draftRef.current = null; drawRedrawRef.current?.(); setDrawCursor(c => c); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Redraw overlay whenever the drawings collection changes (no chart rebuild).
  useEffect(() => { drawRedrawRef.current?.(); }, [drawings]);

  // Initialize replay index to ~60% of history when replay is switched on.
  useEffect(() => {
    if (replayActive && replayIndex < 0) {
      const total = candlesRef.current?.length || 0;
      if (total > 10) setReplayIndex(Math.max(5, Math.floor(total * 0.6)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayActive]);

  // Replay playback — advance one bar per tick while playing.
  useEffect(() => {
    if (!replayActive || !replayPlaying) return;
    const iv = setInterval(() => {
      const total = candlesRef.current?.length || 0;
      const cur = useChartStore.getState().replayIndex;
      const next = cur < 0 ? Math.floor(total * 0.6) : cur + 1;
      if (next >= total) { setReplayIndex(total); setReplayPlaying(false); }
      else setReplayIndex(next);
    }, 700);
    return () => clearInterval(iv);
  }, [replayActive, replayPlaying, setReplayIndex, setReplayPlaying]);

  const replayTotal = candlesRef.current?.length || dataLengthRef.current || 0;

  const fmt = (v: number | null | undefined, d = 2) => v != null && !isNaN(v) && isFinite(v) ? Number(v).toFixed(d) : '';
  const isUp = legend ? legend.close >= legend.open : true;

  return (
    <div className="chart-area" onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}>
      {/* Toolbar */}
      <div className="chart-toolbar">
        <div className="chart-type-btns">
          {CHART_TYPES.map(({ id, icon: Icon, tip }) => (
            <button key={id} className={`chart-type-btn ${chartType === id ? 'active' : ''}`} title={tip} onClick={() => setChartType(id)}>
              <Icon size={14} />
            </button>
          ))}
        </div>
        <div className="toolbar-sep" />
        <div className="chart-ohlcv-info">
          {legend ? (
            <>
              <span className="ohlcv-sym">{symbol}</span>
              {(['O','H','L','C'] as const).map((lbl, i) => {
                const v = [legend.open, legend.high, legend.low, legend.close][i];
                return <span key={lbl} className="ohlcv-item"><span className="ohlcv-label">{lbl}</span><span className={`ohlcv-value mono ${isUp?'up':'down'}`}>{fmt(v,4)}</span></span>;
              })}
              {legend.ema9  != null && <span className="ohlcv-item"><span className="ohlcv-label">E9</span><span className="ohlcv-value mono ohlcv-ema9">{fmt(legend.ema9)}</span></span>}
              {legend.ema21 != null && <span className="ohlcv-item"><span className="ohlcv-label">E21</span><span className="ohlcv-value mono ohlcv-ema21">{fmt(legend.ema21)}</span></span>}
              {legend.vwap  != null && <span className="ohlcv-item"><span className="ohlcv-label">VWAP</span><span className="ohlcv-value mono ohlcv-vwap">{fmt(legend.vwap)}</span></span>}
            </>
          ) : <span className="ohlcv-sym ohlcv-dim">{symbol} · {timeframe}</span>}
        </div>
        <div className="chart-toolbar-spacer" />
        <div className="chart-right-tools">
          <button className={`chart-toolbar-btn ${showSignals?'active':''}`} onClick={() => useChartStore.getState().toggleSignals()} title="Signals"><Zap size={12}/><span>Signals</span></button>
          <button className={`chart-toolbar-btn ${activeIndicators.includes('SMC_OB')?'active':''}`} onClick={() => useChartStore.getState().toggleIndicator('SMC_OB')} title="SMC"><Layers size={12}/><span>SMC</span></button>
          <button className="chart-toolbar-btn icon-only" onClick={() => chartsRef.current.main?.timeScale().fitContent()} title="Fit"><Maximize2 size={13}/></button>
        </div>
      </div>

      {/* Market closed notice */}
      {marketClosed && !isLoading && (
        <div style={{ background:'rgba(245,158,11,0.12)', borderBottom:'1px solid rgba(245,158,11,0.25)', padding:'3px 12px', fontSize:10, color:'#f59e0b', display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          <span>Market closed — showing daily data</span>
        </div>
      )}

      {/* Panels */}
      <div ref={wrapRef} className="chart-panels">
        {isLoading && <div className="chart-loading"><div className="spinner"/><span>Loading {symbol}...</span></div>}
        {/* No-data guard — without this, an empty fetch (e.g. BBCA.JK intraday) makes
            buildCharts() early-return and leaves the main panel BARE WHITE with no message. */}
        {!isLoading && (!candles || candles.length === 0) && (
          <div className="chart-loading">
            <span>Tidak ada data untuk <b>{symbol}</b> · {timeframe}.<br/>Coba timeframe harian (1d) atau simbol lain.</span>
          </div>
        )}
        <div ref={mainRef} className="chart-panel chart-panel-main">
          <canvas ref={smcCanvasRef} className="smc-overlay-canvas"/>
          <canvas
            ref={drawCanvasRef}
            className={`draw-overlay-canvas${isDrawingTool ? ' active' : ''}`}
            onPointerDown={onDrawPointerDown}
            onPointerMove={onDrawPointerMove}
          />
          {/* Compare-symbol chips (top-left of the price pane) */}
          {compareSymbols.length > 0 && (
            <div className="compare-chips">
              {compareSymbols.map((cs, i) => (
                <span key={cs} className="compare-chip" style={{ borderColor: ['#ff9800','#ab47bc','#26c6da','#ec407a'][i % 4] }}>
                  <span className="compare-dot" style={{ background: ['#ff9800','#ab47bc','#26c6da','#ec407a'][i % 4] }} />
                  {cs}
                  <button type="button" className="compare-x" title={`Remove ${cs}`} onClick={() => removeCompareSymbol(cs)}><X size={9} /></button>
                </span>
              ))}
            </div>
          )}
          {drawings.length > 0 && (
            <button type="button" className="draw-clear-btn" title="Clear all drawings" onClick={() => clearDrawings()}>
              <X size={11} /> {drawings.length}
            </button>
          )}
        </div>
        <div ref={spl1Ref} className={`chart-splitter${dragging===0?' dragging':''}`} onMouseDown={e=>startDrag(0,e)}><div className="splitter-line"/><div className="splitter-grip"/></div>
        <div ref={volRef} className="chart-panel chart-panel-vol"><div className="subchart-label2">VOL</div></div>
        <div ref={spl2Ref} className={`chart-splitter${dragging===1?' dragging':''}`} onMouseDown={e=>startDrag(1,e)}><div className="splitter-line"/><div className="splitter-grip"/></div>
        <div ref={subRef} className="chart-panel chart-panel-sub">
          {subPanels.length === 0 && (
            <div className="sub-stack-empty">No indicator panel — add one below ↓</div>
          )}
          {/* Stacked oscillator panels — each its own chart, individually removable */}
          {subPanels.map(id => (
            <div key={id} className="sub-panel-slot" data-panel={id}>
              <div className="subchart-panel-header">
                <span className="sub-slot-title">{SUB_PANEL_LABEL[id] ?? id}</span>
                <button type="button" className="sub-slot-close" title="Remove panel" onClick={() => removeSubPanel(id)}>
                  <X size={11} />
                </button>
              </div>
              <div className="sub-chart-inner" />
              {id === 'atlas' && <canvas ref={pixelCanvasRef} className="t1mo-pixel-canvas" />}
            </div>
          ))}
          {/* Add-panel bar — TradingView-style quick add of any oscillator window */}
          <div className="sub-add-bar">
            <Plus size={11} className="sub-add-icon" />
            {SUB_PANELS.filter(p => !subPanels.includes(p.id)).map(p => (
              <button type="button" key={p.id} className="sub-add-chip" onClick={() => addSubPanel(p.id)}>{p.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {ctxMenu && (
        <div className="ctx-menu" style={{top:ctxMenu.y,left:ctxMenu.x}} onMouseLeave={()=>setCtxMenu(null)}>
          {[{label:'Add Indicator',action:()=>{useChartStore.getState().openIndicatorModal();setCtxMenu(null);}},{label:'Fit Content',action:()=>{chartsRef.current.main?.timeScale().fitContent();setCtxMenu(null);}},null,{label:'Reset Chart',action:()=>{buildCharts();setCtxMenu(null);}}].map((item,i)=>
            item ? <div key={i} className="ctx-menu-item" onClick={item.action}>{item.label}</div> : <div key={i} className="ctx-menu-sep"/>
          )}
        </div>
      )}

      {/* ── Bar Replay control bar ── */}
      {replayActive && (
        <div className="replay-bar">
          <span className="replay-label">⏯ REPLAY</span>
          <button type="button" className="replay-btn" title="Step back"
            onClick={() => setReplayIndex(Math.max(2, (replayIndex < 0 ? replayTotal : replayIndex) - 1))}>‹‹</button>
          <button type="button" className={`replay-btn play${replayPlaying ? ' on' : ''}`} title={replayPlaying ? 'Pause' : 'Play'}
            onClick={() => setReplayPlaying(!replayPlaying)}>{replayPlaying ? '❚❚' : '▶'}</button>
          <button type="button" className="replay-btn" title="Step forward"
            onClick={() => setReplayIndex(Math.min(replayTotal, (replayIndex < 0 ? replayTotal : replayIndex) + 1))}>››</button>
          <input
            title="Replay position" className="replay-slider" type="range" min={2} max={Math.max(3, replayTotal)}
            value={replayIndex < 0 ? replayTotal : replayIndex}
            onChange={e => { setReplayPlaying(false); setReplayIndex(parseInt(e.target.value, 10)); }}
          />
          <span className="replay-count mono">{(replayIndex < 0 ? replayTotal : replayIndex)} / {replayTotal}</span>
          <button type="button" className="replay-exit" title="Exit replay" onClick={() => setReplayActive(false)}>
            <X size={12} />
          </button>
        </div>
      )}

      {/* ── Range Selector Bar (bottom, TradingView-style) ── */}
      <div className="chart-range-bar">
        {(['1D','5D','1M','3M','6M','YTD','1Y','5Y','All'] as const).map(r => (
          <button
            key={r}
            className={`range-btn ${activeRange === r ? 'active' : ''}`}
            onClick={() => {
              setActiveRange(r);
              const main = chartsRef.current.main;
              if (!main) return;
              const total = dataLengthRef.current;
              if (!total) return;
              // Candle counts per range — works for any TF including non-continuous stocks
              const TF_PER_DAY: Record<string, number> = {
                '1s':86400,'15s':5760,'30s':2880,'1m':1440,'3m':480,'5m':288,
                '15m':96,'30m':48,'1h':24,'2h':12,'4h':6,'6h':4,'8h':3,'12h':2,'1d':1,'1w':0.14,'1M':0.033,
              };
              const perDay = TF_PER_DAY[timeframe] ?? 1;
              const now2 = new Date(); const yd = now2.getDay(); const daysThisYear = Math.floor((now2.getTime() - new Date(now2.getFullYear(),0,0).getTime())/86400000);
              const rangeMap: Record<string, number> = {
                '1D': Math.ceil(perDay),
                '5D': Math.ceil(perDay * 5),
                '1M': Math.ceil(perDay * 30),
                '3M': Math.ceil(perDay * 90),
                '6M': Math.ceil(perDay * 180),
                'YTD': Math.ceil(perDay * daysThisYear),
                '1Y': Math.ceil(perDay * 365),
                '5Y': Math.ceil(perDay * 365 * 5),
                'All': total,
              };
              const nCandles = Math.min(rangeMap[r] ?? Math.ceil(perDay * 90), total);
              try {
                main.timeScale().setVisibleLogicalRange({ from: total - nCandles - 1, to: total + 3 });
              } catch { main.timeScale().fitContent(); }
            }}
          >
            {r}
          </button>
        ))}
        <div className="range-bar-spacer"/>
      </div>
    </div>
  );
}
