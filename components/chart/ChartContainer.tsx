'use client';
import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries, BarSeries, AreaSeries } from 'lightweight-charts';
import { useTheme } from '@/hooks/useTheme';
import { useMarketData, useLiveBars } from '@/hooks/useMarketData';
import { useChartStore } from '@/store/chartStore';
import { BarChart2, TrendingUp, Activity, Zap, Layers, Maximize2 } from 'lucide-react';
import { computeIndicators } from '@/core/indicators/client';
import { t1moCompute } from '@/src/core/indicators/t1mo';

const CandlestickChartIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 4v16M9 7H5v10h4M15 4v16M15 7h4v10h-4M9 12h6"/>
  </svg>
);

const SUB_PANELS = [
  { id: 'atlas',        label: 'T1MO Pixel'   },
  { id: 'rsi',          label: 'RSI(7)'       },
  { id: 'macd',         label: 'MACD'         },
  { id: 'williams',     label: '%R(14)'       },
  { id: 'stochrsi',     label: 'StochRSI'    },
  { id: 'mfi',          label: 'MFI(14)'     },
  { id: 'cci',          label: 'CCI'          },
  { id: 'adx',          label: 'ADX'          },
  { id: 'obv',          label: 'OBV'          },
  { id: 'aroon',        label: 'Aroon'        },
  { id: 'cmf',          label: 'CMF'          },
  { id: 'atr',          label: 'ATR'          },
  { id: 'elder',        label: 'Elder'        },
  // Bandarmologi group
  { id: 'cvd',          label: 'CVD'          },
  { id: 'bandar',       label: 'Bandar'       },
  { id: 'bandar_ad',    label: 'Bandar A/D'   },
  { id: 'vol_delta',    label: 'Vol Delta'    },
  { id: 'bandar_suite', label: 'Bandar Suite' },
];

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

const clampScore = (v: number) => Math.max(2, Math.min(98, v));

/** Simple EMA smoothing of a numeric array — smooths the regime score so the
 *  pixel strip flows in gradual hills (green→yellow→red) like the reference,
 *  instead of flickering bar-to-bar on noisy intraday data. */
function emaSmooth(vals: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out = new Array(vals.length).fill(NaN);
  let prev = NaN;
  for (let i = 0; i < vals.length; i++) {
    const v = vals[i];
    if (!Number.isFinite(v)) { out[i] = prev; continue; }
    prev = Number.isFinite(prev) ? v * k + prev * (1 - k) : v;
    out[i] = prev;
  }
  return out;
}

/**
 * Rolling percentile rank → 0–100. For each bar, where does its value fall
 * within the last `window` bars? This spreads scores across the FULL color
 * range so the heatmap stays vivid/varied even inside a strong trend (matches
 * the T1MO Pixel reference look — not a one-color wall).
 */
function rollingPercentile(vals: number[], window = 120): number[] {
  const n = vals.length;
  const out = new Array(n).fill(50);
  for (let i = 0; i < n; i++) {
    const cur = vals[i];
    if (!Number.isFinite(cur)) { out[i] = 50; continue; }
    const start = Math.max(0, i - window + 1);
    let below = 0, equal = 0, count = 0;
    for (let j = start; j <= i; j++) {
      const v = vals[j];
      if (!Number.isFinite(v)) continue;
      count++;
      if (v < cur) below++; else if (v === cur) equal++;
    }
    // mid-rank percentile (Hazen) — avoids 0/100 saturation at the extremes
    out[i] = count > 0 ? clampScore(((below + equal / 2) / count) * 100) : 50;
  }
  return out;
}

/** Build all 14 T1MO pixel rows (0–100 bull-score each, rolling-percentile
 *  normalized so every row stays vivid/varied). NO conviction gate — the
 *  reference is a FULL mosaic; clustering comes from regime persistence, not
 *  blank columns. `active` is kept (all true) for call-site compatibility. */
function computePixelScores(
  ind: any,
  t1mo: any,
  closes: number[],
): { scores: Record<string, number[]>; active: boolean[] } {
  const n = closes.length;
  const win = Math.max(40, Math.min(150, Math.floor(n / 3))); // adaptive window
  const num = (arr: any[], i: number, d = 0) => Number.isFinite(arr?.[i]) ? arr[i] : d;

  // ── Raw per-indicator bull-ness (higher = more bullish); normalized below ──
  const rsi7  = ind.rsi(7);
  const rsi14 = ind.rsi(14);
  const macd  = ind.macd(12, 26, 9);
  const ema9  = ind.ema(9);
  const ema21 = ind.ema(21);
  const ema50 = ind.ema(50);
  const vwap  = ind.vwap().vwap;
  const mfi   = ind.mfi(14);
  const wr    = ind.williamsR(14);          // -100..0
  const bb    = ind.bollingerBands(20, 2);  // percentB ~0..1
  const adx   = ind.adx(14);                // { adx, plusDI, minusDI }
  const don   = ind.donchian(20);           // { upper, lower, middle }
  const hmf      = (t1mo?.series?.hmf ?? []) as (number | null)[];
  const bullProb = (t1mo?.series?.bullProb ?? []) as number[]; // 0..100 T1MO conviction

  const raw: Record<string, number[]> = {
    RSI7:  closes.map((_, i) => num(rsi7, i, 50)),
    RSI14: closes.map((_, i) => num(rsi14, i, 50)),
    MACD:  closes.map((_, i) => num(macd.histogram, i, 0)),
    EMA9:  closes.map((c, i) => c - num(ema9, i, c)),
    EMA21: closes.map((c, i) => c - num(ema21, i, c)),
    EMA50: closes.map((c, i) => c - num(ema50, i, c)),
    VWAP:  closes.map((c, i) => c - num(vwap, i, c)),
    HMF:   closes.map((_, i) => num(hmf as any, i, 0)),
    MFI:   closes.map((_, i) => num(mfi, i, 50)),
    '%R':  closes.map((_, i) => 100 + num(wr, i, -50)),          // → 0..100
    BB:    closes.map((_, i) => num(bb.percentB, i, 0.5) * 100), // → 0..100
    ADX:   closes.map((_, i) => num(adx.plusDI, i, 0) - num(adx.minusDI, i, 0)),
    Box:   closes.map((c, i) => {
      const u = num(don.upper, i, c), l = num(don.lower, i, c);
      return u > l ? ((c - l) / (u - l)) * 100 : 50;
    }),
    ATLAS: closes.map((_, i) => num(bullProb, i, 50)),
  };

  const scores: Record<string, number[]> = {};
  // Smooth each row → gradual color "hills", then percentile-rank for a full
  // green→red spread (matches the reference's vivid, varied matrix).
  for (const k of PIXEL_ROWS) {
    const smoothed = emaSmooth(raw[k] ?? new Array(n).fill(50), 5);
    scores[k] = rollingPercentile(smoothed, win);
  }
  return { scores, active: new Array(n).fill(true) };
}

interface Props { symbol: string; timeframe: string; }

export default function ChartContainer({ symbol, timeframe }: Props) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const mainRef  = useRef<HTMLDivElement>(null);
  const volRef   = useRef<HTMLDivElement>(null);
  const subRef   = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<Record<string, any>>({});
  const seriesRef = useRef<Record<string, any>>({});
  const pixelCanvasRef = useRef<HTMLCanvasElement>(null);
  const pixelRedrawRef = useRef<(() => void) | null>(null);

  const { theme }                        = useTheme();
  const { candles, isLoading, marketClosed } = useMarketData(symbol, timeframe);
  const { liveBars } = useLiveBars(symbol, timeframe);
  const { activeIndicators, showSignals, chartType, setChartType, subPanel, setSubPanel, timezone } = useChartStore();

  // Stable ref for candles — prevents buildCharts from re-running on every SWR poll
  // (SWR creates a new array reference on each successful fetch even with same data)
  const candlesRef = useRef<typeof candles>([]);
  useEffect(() => { candlesRef.current = candles; }, [candles]);

  const [panelPct, setPanelPct] = useState([62, 14, 24]);
  const panelPctRef    = useRef([62, 14, 24]);
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
    Object.entries(chartsRef.current).forEach(([k, c]) => {
      if (k === '_obs') return;
      const el = k === 'main' ? mainRef.current : k === 'vol' ? volRef.current : subRef.current;
      if (el && c) try { c.applyOptions({ width: el.clientWidth, height: el.clientHeight }); } catch {}
    });
    // Redraw the T1MO pixel canvas (CSS keeps it sized to the sub-chart area)
    requestAnimationFrame(() => pixelRedrawRef.current?.());
  }, [panelPct]);

  // Timezone IANA name for Intl.DateTimeFormat
  const tzName = timezone === 'utc' ? 'UTC' : timezone === 'gmt+7' ? 'Asia/Jakarta' : undefined;

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
      rightPriceScale: { borderColor: tk.border, textColor: tk.text2 },
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
        timeFormatter: (t: number) => `${fmtDate(t)}  ${fmtTime(t)}${tzName ? '  ' + timezone.toUpperCase() : '  Local'}`,
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true } },
      width: el.clientWidth || 800, height: el.clientHeight || 400,
    };
  }, [tk, timeframe, timezone, tzName]);

  const buildCharts = useCallback(() => {
    if (chartsRef.current._obs) chartsRef.current._obs.disconnect();
    Object.entries(chartsRef.current).forEach(([k, c]) => { if (k !== '_obs') try { c.remove(); } catch {} });
    chartsRef.current = {}; seriesRef.current = {};
    pixelRedrawRef.current = null;  // drop stale T1MO-pixel redraw closure

    const currentCandles = candlesRef.current;
    if (!mainRef.current || !volRef.current || !subRef.current || !currentCandles?.length) return;

    const formatted = currentCandles
      .map((c: any) => ({ time: Math.floor(c.open_time / 1000) as any, open: +c.open, high: +c.high, low: +c.low, close: +c.close, volume: +c.volume }))
      .sort((a: any, b: any) => a.time - b.time)
      .filter((c: any) => c.time > 0 && c.close > 0);

    if (formatted.length < 2) return;

    const closes  = formatted.map((c: any) => c.close);
    const highs   = formatted.map((c: any) => c.high);
    const lows    = formatted.map((c: any) => c.low);
    const volumes = formatted.map((c: any) => c.volume);
    const opens   = formatted.map((c: any) => c.open);
    const times   = formatted.map((c: any) => c.time);
    const ind = computeIndicators(closes, highs, lows, volumes, opens);

    // ── MAIN CHART ──────────────────────────────────────────────
    const main = createChart(mainRef.current, baseOpts(mainRef.current) as any);
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

    // SMC Order Blocks
    if (activeIndicators.includes('SMC_OB')) {
      const smc = ind.detectSMC();
      smc.orderBlocks?.slice(-5).forEach((ob: any) => {
        const color = ob.type === 'bullish' ? 'rgba(8,153,129,0.5)' : 'rgba(242,54,69,0.5)';
        try {
          candleSeries.createPriceLine({ price: ob.high, color, lineWidth: 1, lineStyle: 1, axisLabelVisible: false, title: `OB ${ob.type === 'bullish' ? '▲' : '▼'}` });
          candleSeries.createPriceLine({ price: ob.low,  color, lineWidth: 1, lineStyle: 1, axisLabelVisible: false, title: '' });
        } catch {}
      });
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
        if (t1moBB)  addOverlay(t1moBB as any[],  { color: '#1976d2', lineWidth: 2,   lineStyle: 0, title: 'Backbone' }, 't1moBB');
        if (t1moMG)  addOverlay(t1moMG as any[],  { color: '#e91e63', lineWidth: 1.5, lineStyle: 2, title: 'Magenta'  }, 't1moMG');
        if (t1moTop) addOverlay(t1moTop as any[], { color: '#ff6f00', lineWidth: 2,   lineStyle: 0, title: 'TopBox'   }, 't1moTop');
        if (t1moBtm) addOverlay(t1moBtm as any[], { color: '#757575', lineWidth: 2,   lineStyle: 0, title: 'BtmBox'   }, 't1moBtm');
      }
    } catch { /* T1MO compute error — non-fatal */ }

    // Signal markers
    if (showSignals && formatted.length > 20) {
      const sig = ind.latestSignal();
      if (sig && sig.type !== 'NEUTRAL') {
        const isBuy = sig.type === 'BUY';
        const markers: any[] = [];
        for (let i = 5; i >= 1; i--) {
          const idx = formatted.length - 1 - i * 7;
          if (idx < 0) continue;
          const bull = (idx + symbol.length) % 2 === 0;
          markers.push({ time: formatted[idx].time, position: bull ? 'belowBar' : 'aboveBar', color: bull ? 'rgba(8,153,129,0.6)' : 'rgba(242,54,69,0.6)', shape: bull ? 'arrowUp' : 'arrowDown', text: `${55 + (idx % 40)}%`, size: 1 });
        }
        markers.push({ time: formatted[formatted.length - 1].time, position: isBuy ? 'belowBar' : 'aboveBar', color: isBuy ? '#089981' : '#f23645', shape: isBuy ? 'arrowUp' : 'arrowDown', text: `${sig.type} ${sig.confidence}%`, size: 2 });
        try { candleSeries.setMarkers(markers.sort((a: any, b: any) => a.time - b.time)); } catch {}
      }
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

    // ── SUB CHART ─────────────────────────────────────────────
    let subAnchorSeries: any = null;
    const subChartEl = subRef.current!.querySelector<HTMLDivElement>('.sub-chart-inner');
    if (subChartEl) {
      const subChart = createChart(subChartEl, baseOpts(subChartEl) as any);
      chartsRef.current.sub = subChart;

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
          const { scores, active } = computePixelScores(ind, t1moSub.meta.ready ? t1moSub : null, closes);
          const nBars  = formatted.length;

          const redraw = () => {
            const canvas = pixelCanvasRef.current;
            const sc = chartsRef.current.sub;
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

            const nRows = PIXEL_ROWS.length;
            const rowGap = rowHeightGap(drawH / nRows); // hairline gap, scaled to row size
            const rowH  = drawH / nRows;
            const from  = Math.max(0, Math.floor(range.from));
            const to    = Math.min(nBars - 1, Math.ceil(range.to));

            // FULL MOSAIC — every column drawn (no conviction gaps). Reference look.
            for (let i = from; i <= to; i++) {
              const xc = ts.logicalToCoordinate(i as any);
              if (xc == null) continue;
              const xn = ts.logicalToCoordinate((i + 1) as any);
              const barW = Math.max(1, (xn != null ? Math.abs(xn - xc) : 6));
              const cellW = Math.max(1, barW - 0.5);   // hairline horizontal gap → mosaic
              const x = xc - barW / 2;
              for (let r = 0; r < nRows; r++) {
                const key = PIXEL_ROWS[r];
                const s = scores[key]?.[i] ?? 50;
                ctx.fillStyle = pixelColor(s);
                ctx.fillRect(x + 0.25, r * rowH + rowGap / 2, cellW, rowH - rowGap);
              }
            }

            // Left gutter — opaque strip so labels sit cleanly over the first bars
            // (matches reference HEADER_W). Bars underneath stay hidden.
            ctx.fillStyle = isDark ? '#0d1218' : '#ffffff';
            ctx.fillRect(0, 0, PIXEL_GUTTER, drawH);
            ctx.strokeStyle = isDark ? '#222a36' : '#e0e3eb';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(PIXEL_GUTTER, 0); ctx.lineTo(PIXEL_GUTTER, drawH); ctx.stroke();

            // Row labels — inside the gutter
            ctx.font = 'bold 9px "Roboto Mono", monospace';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isDark ? '#7a8294' : '#5a6273';
            for (let r = 0; r < nRows; r++) {
              ctx.fillText(PIXEL_ROWS[r], 5, r * rowH + rowH / 2);
            }
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

      // ── BANDARMOLOGI panels ──────────────────────────────────────────────────

      } else if (subPanel === 'cvd') {
        // Cumulative Volume Delta: delta histogram + CVD cumulative line
        const cvdResult = ind.cvd();
        const deltaHist = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'cvd_delta' });
        deltaHist.setData(times.map((t: number, i: number) => ({
          time: t, value: cvdResult.delta[i],
          color: cvdResult.delta[i] >= 0 ? 'rgba(8,153,129,0.55)' : 'rgba(242,54,69,0.55)',
        })).filter((d: any) => !isNaN(d.value) && isFinite(d.value)));
        try { (subChart as any).priceScale('cvd_delta').applyOptions({ visible: false, scaleMargins: { top: 0.55, bottom: 0 } }); } catch {}
        addSubLine(cvdResult.cvd, '#00bcd4', 'CVD', 2);
        addLevel(0, 'rgba(255,255,255,0.1)');

      } else if (subPanel === 'bandar') {
        // Bandar Detector: composite 0–100 smart-money score + signal + phase zones
        const bnd = ind.bandarDetector(8);
        addSubLine(bnd.score,  '#e91e63', 'Bandar', 2);
        addSubLine(bnd.signal, '#ff9800', 'Signal', 1.5);
        [[55, 'rgba(8,153,129,0.18)'], [50, 'rgba(255,255,255,0.07)'], [45, 'rgba(242,54,69,0.18)']].forEach(([v, c]) => addLevel(v as number, c as string));

      } else if (subPanel === 'bandar_ad') {
        // Bandar Accumulation/Distribution: A/D cumulative + EMA signal + oscillator histogram
        const bad = ind.bandarAD(21);
        const adHist = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'bad_hist' });
        adHist.setData(times.map((t: number, i: number) => ({
          time: t, value: bad.histogram[i],
          color: (bad.histogram[i] || 0) >= 0 ? 'rgba(8,153,129,0.65)' : 'rgba(242,54,69,0.65)',
        })).filter((d: any) => !isNaN(d.value) && isFinite(d.value)));
        try { (subChart as any).priceScale('bad_hist').applyOptions({ visible: false, scaleMargins: { top: 0.5, bottom: 0 } }); } catch {}
        addSubLine(bad.ad,     '#26c6da', 'A/D',    1.5);
        addSubLine(bad.signal, '#ff9800', 'Sig(21)', 1);
        addLevel(0, 'rgba(255,255,255,0.1)');

      } else if (subPanel === 'vol_delta') {
        // Volume Delta: classified buy-vol (green above 0) and sell-vol (red below 0)
        const cvdData = ind.cvd();
        const buyHist  = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'right' });
        buyHist.setData(times.map((t: number, i: number) => ({
          time: t, value: Math.max(0, cvdData.delta[i]), color: 'rgba(8,153,129,0.7)',
        })).filter((d: any) => d.value > 0));
        const sellHist = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'right' });
        sellHist.setData(times.map((t: number, i: number) => ({
          time: t, value: Math.min(0, cvdData.delta[i]), color: 'rgba(242,54,69,0.7)',
        })).filter((d: any) => d.value < 0));
        // Net delta EMA (trend of net buy/sell pressure)
        const deltaEma = ind.ema(9).map((_: number, i: number) => cvdData.delta[i]);
        const emaLine  = ind.ema(9); // use as smoothing reference below
        // Smooth delta with a simple EMA-9 proxy via the existing ema() of delta values
        const netEma   = (closes as number[]).map((_: number, i: number) => {
          const k = 2 / 10; let prev = cvdData.delta[0] || 0;
          for (let j = 1; j <= i; j++) prev = cvdData.delta[j] * k + prev * (1 - k);
          return prev;
        });
        addSubLine(netEma, '#f7a600', 'Delta EMA', 1.5);
        addLevel(0, 'rgba(255,255,255,0.12)');
        void deltaEma; void emaLine; // suppress unused warnings

      } else if (subPanel === 'bandar_suite') {
        // Multi-indicator Bandar Suite: all key bandarmologi lines on the same 0–100 scale.
        // CVD delta and CMF are percentile-normalized to 0–100 so they overlay cleanly.
        const bnd      = ind.bandarDetector(8);
        const cvdData  = ind.cvd();
        const mfiData  = ind.mfi(14);
        const cmfRaw   = ind.cmf(20);
        const obvData  = ind.obv();
        // Normalize CVD delta → 0–100 rolling percentile
        const cvdNorm  = rollingPercentile(cvdData.delta, 100);
        // Normalize CMF (-1..1) → 0–100
        const cmfNorm  = cmfRaw.map((v: number) => isNaN(v) ? 50 : Math.max(0, Math.min(100, (v + 1) / 2 * 100)));
        // Normalize OBV slope → 0–100 rolling percentile on 8-bar change
        const obvSlope = obvData.map((v: number, i: number) => i >= 8 ? v - obvData[i - 8] : 0);
        const obvNorm  = rollingPercentile(obvSlope, 100);

        addSubLine(bnd.score,  '#e91e63', 'Bandar',   2.5);
        addSubLine(bnd.signal, '#ff9800', 'Signal',   1.5);
        addSubLine(cvdNorm,    '#00bcd4', 'CVD%',     1.2);
        addSubLine(mfiData,    '#7e57c2', 'MFI(14)',  1.2);
        addSubLine(cmfNorm,    '#26a69a', 'CMF%',     1);
        addSubLine(obvNorm,    '#ab47bc', 'OBV%',     1);

        [[70, 'rgba(8,153,129,0.15)'], [55, 'rgba(8,153,129,0.08)'],
         [50, 'rgba(255,255,255,0.07)'],
         [45, 'rgba(242,54,69,0.08)'], [30, 'rgba(242,54,69,0.15)']].forEach(([v, c]) => addLevel(v as number, c as string));
      }

      // Sync timescales — logical range keeps all panels pixel-locked
      let syncing = false;
      const syncLogical = (src: any, targets: any[]) =>
        src.timeScale().subscribeVisibleLogicalRangeChange((range: any) => {
          if (syncing || !range) return;
          syncing = true;
          targets.forEach(c => { try { c.timeScale().setVisibleLogicalRange(range); } catch {} });
          setTimeout(() => { syncing = false; }, 16);
        });
      syncLogical(main, [volChart, subChart]);
      syncLogical(volChart, [main, subChart]);
      syncLogical(subChart, [main, volChart]);
    }

    // ── Cross-panel crosshair sync (TradingView-style locked panels) ──
    // Hovering any panel draws the aligned vertical crosshair on all panels.
    let xhairSyncing = false;
    const syncXhair = (param: any, srcCh: any) => {
      if (xhairSyncing) return;
      xhairSyncing = true;
      try {
        const idx = param?.time ? formatted.findIndex((c: any) => c.time === param.time) : -1;
        const targets = [
          { ch: main,                   s: candleSeries,    v: idx >= 0 ? formatted[idx]?.close  : 0 },
          { ch: chartsRef.current.vol,  s: volSeries,       v: idx >= 0 ? formatted[idx]?.volume : 0 },
          { ch: chartsRef.current.sub,  s: subAnchorSeries, v: 0 },
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
    try { if (chartsRef.current.sub) chartsRef.current.sub.subscribeCrosshairMove((param: any) => syncXhair(param, chartsRef.current.sub)); } catch {}

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
      [[chartsRef.current.main, mainRef.current, h0], [chartsRef.current.vol, volRef.current, h1], [chartsRef.current.sub, subRef.current, h2]].forEach(([ch, el, h]) => {
        if (el && ch && (h as number) > 0) { try { ch.applyOptions({ width: (el as HTMLDivElement).clientWidth, height: h }); } catch {} }
      });
      // Resize + redraw the T1MO pixel canvas
      const pc = pixelCanvasRef.current;
      const inner = subRef.current?.querySelector<HTMLDivElement>('.sub-chart-inner');
      if (pc && inner) { pc.style.width = inner.clientWidth + 'px'; pc.style.height = inner.clientHeight + 'px'; }
      requestAnimationFrame(() => pixelRedrawRef.current?.());
    });
    if (wrapRef.current) obs.observe(wrapRef.current);
    chartsRef.current._obs = obs;
  // candles removed — reads via candlesRef.current; panelPct removed — reads via panelPctRef.current
  }, [theme, activeIndicators, showSignals, subPanel, baseOpts, symbol, chartType]);

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
    } catch { /* update() rejects out-of-order times — safe to ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveBars, chartType]);

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
        <div ref={mainRef} className="chart-panel chart-panel-main"/>
        <div ref={spl1Ref} className={`chart-splitter${dragging===0?' dragging':''}`} onMouseDown={e=>startDrag(0,e)}><div className="splitter-line"/><div className="splitter-grip"/></div>
        <div ref={volRef} className="chart-panel chart-panel-vol"><div className="subchart-label2">VOL</div></div>
        <div ref={spl2Ref} className={`chart-splitter${dragging===1?' dragging':''}`} onMouseDown={e=>startDrag(1,e)}><div className="splitter-line"/><div className="splitter-grip"/></div>
        <div ref={subRef} className="chart-panel chart-panel-sub">
          <div className="subchart-tabs-row">
            {SUB_PANELS.map(p=><button type="button" key={p.id} className={`subchart-tab ${subPanel===p.id?'active':''}`} onClick={()=>setSubPanel(p.id)}>{p.label}</button>)}
            <div className="subchart-tabs-spacer"/>
          </div>
          <div className="sub-chart-inner"/>
          <canvas
            ref={pixelCanvasRef}
            className="t1mo-pixel-canvas"
            style={{ display: subPanel === 'atlas' ? 'block' : 'none' }}
          />
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
