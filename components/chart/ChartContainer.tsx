'use client';
import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries, BarSeries, AreaSeries } from 'lightweight-charts';
import { useTheme } from '@/hooks/useTheme';
import { useMarketData } from '@/hooks/useMarketData';
import { useChartStore } from '@/store/chartStore';
import { BarChart2, TrendingUp, Activity, Zap, Layers, Maximize2 } from 'lucide-react';
import { computeIndicators } from '@/core/indicators/client';

const CandlestickChartIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 4v16M9 7H5v10h4M15 4v16M15 7h4v10h-4M9 12h6"/>
  </svg>
);

const SUB_PANELS = [
  { id: 'atlas',    label: 'ATLAS Matrix' },
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
];

const CHART_TYPES = [
  { id: 'candlestick', icon: CandlestickChartIcon, tip: 'Candlestick' },
  { id: 'bars',        icon: BarChart2,             tip: 'Bars'        },
  { id: 'line',        icon: TrendingUp,            tip: 'Line'        },
  { id: 'area',        icon: Activity,              tip: 'Area'        },
];

interface Props { symbol: string; timeframe: string; }

export default function ChartContainer({ symbol, timeframe }: Props) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const mainRef  = useRef<HTMLDivElement>(null);
  const volRef   = useRef<HTMLDivElement>(null);
  const subRef   = useRef<HTMLDivElement>(null);
  const chartsRef = useRef<Record<string, any>>({});
  const seriesRef = useRef<Record<string, any>>({});

  const { theme }              = useTheme();
  const { candles, isLoading } = useMarketData(symbol, timeframe);
  const { activeIndicators, showSignals, chartType, setChartType, subPanel, setSubPanel } = useChartStore();

  // Stable ref for candles — prevents buildCharts from re-running on every SWR poll
  // (SWR creates a new array reference on each successful fetch even with same data)
  const candlesRef = useRef<typeof candles>([]);
  useEffect(() => { candlesRef.current = candles; }, [candles]);

  const [panelPct, setPanelPct] = useState([62, 14, 24]);
  const panelPctRef = useRef([62, 14, 24]);
  useEffect(() => { panelPctRef.current = panelPct; }, [panelPct]);
  const [dragging, setDragging] = useState<number | null>(null);
  const dragRef    = useRef<any>(null);
  const [legend, setLegend]     = useState<any>(null);
  const [ctxMenu, setCtxMenu]   = useState<any>(null);
  const [activeRange, setActiveRange] = useState<string>('3M');

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

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    const th = wrapRef.current.clientHeight;
    const h0 = Math.floor(th * panelPct[0] / 100);
    const h1 = Math.floor(th * panelPct[1] / 100);
    const h2 = th - h0 - h1;
    if (mainRef.current) { mainRef.current.style.height = h0 + 'px'; mainRef.current.style.top = '0'; }
    if (volRef.current)  { volRef.current.style.height  = h1 + 'px'; volRef.current.style.top  = h0 + 'px'; }
    if (subRef.current)  { subRef.current.style.height  = h2 + 'px'; subRef.current.style.top  = (h0 + h1) + 'px'; }
    Object.entries(chartsRef.current).forEach(([k, c]) => {
      if (k === '_obs') return;
      const el = k === 'main' ? mainRef.current : k === 'vol' ? volRef.current : subRef.current;
      if (el && c) try { c.applyOptions({ width: el.clientWidth, height: el.clientHeight }); } catch {}
    });
  }, [panelPct]);

  const baseOpts = useCallback((el: HTMLDivElement) => ({
    layout: { background: { type: ColorType.Solid, color: tk.bg }, textColor: tk.text2, fontFamily: 'Roboto Mono, monospace', fontSize: 10 },
    grid:   { vertLines: { color: tk.grid, style: 1 }, horzLines: { color: tk.grid, style: 1 } },
    crosshair: { mode: 1, vertLine: { color: tk.crosshair, width: 1, style: 3, labelVisible: true }, horzLine: { color: tk.crosshair, width: 1, style: 3, labelVisible: true } },
    rightPriceScale: { borderColor: tk.border, textColor: tk.text2 },
    timeScale: { borderColor: tk.border, textColor: tk.text2, timeVisible: !['1M','3M','6M','12M'].includes(timeframe), secondsVisible: ['1s','15s','30s'].includes(timeframe), rightOffset: 10, lockVisibleTimeRangeOnResize: true },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
    handleScale:  { mouseWheel: true, pinch: true, axisPressedMouseMove: { time: true, price: true } },
    width: el.clientWidth || 800, height: el.clientHeight || 400,
  }), [tk, timeframe]);

  const buildCharts = useCallback(() => {
    if (chartsRef.current._obs) chartsRef.current._obs.disconnect();
    Object.entries(chartsRef.current).forEach(([k, c]) => { if (k !== '_obs') try { c.remove(); } catch {} });
    chartsRef.current = {}; seriesRef.current = {};

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
    const times   = formatted.map((c: any) => c.time);
    const ind = computeIndicators(closes, highs, lows, volumes);

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
    main.timeScale().fitContent();
    // Set a default visible range so the chart doesn't show the entire history
    {
      const ZOOM_CANDLES: Record<string, number> = {
        '1s':  180, '15s': 120, '30s': 90,
        '1m':  120, '3m':  100, '5m':  100,
        '10m': 96,  '15m': 96,  '30m': 90, '45m': 80,
        '1h':  168, '2h':  120, '3h':  90, '4h':  180,
        '6h':  90,  '8h':  60,  '12h': 60,
        '1d':  365, '2d':  180, '3d':  120,
        '1w':  156, '2w':  78,
        '1M':  60,  '3M':  24,  '6M':  12, '12M': 8,
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
    const subChartEl = subRef.current!.querySelector<HTMLDivElement>('.sub-chart-inner');
    if (subChartEl) {
      const subChart = createChart(subChartEl, baseOpts(subChartEl) as any);
      chartsRef.current.sub = subChart;

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
        const closes2 = formatted.map((c: any) => c.close);
        const ema9v  = ind.ema(9);
        const ema21v = ind.ema(21);
        const rsi14v = ind.rsi(14);
        const matrix = closes2.map((cl: number, i: number) => {
          const score =
            (ema9v[i] > ema21v[i] ? 1 : -1) * 25 +
            (rsi14v[i] > 50 ? (rsi14v[i] - 50) : (rsi14v[i] - 50)) * 0.5 + 50;
          const v = Math.max(0, Math.min(100, score));
          return { time: formatted[i].time, value: v - 50, color: v > 50 ? 'rgba(8,153,129,0.6)' : 'rgba(242,54,69,0.6)' };
        });
        const ms = (subChart as any).addSeries(HistogramSeries, { priceScaleId: 'right' });
        ms.setData(matrix.filter((d: any) => !isNaN(d.value)));
        const baseline = (subChart as any).addSeries(LineSeries, { color: 'rgba(255,255,255,0.15)', lineWidth: 1, lineStyle: 2, priceLineVisible: false, lastValueVisible: false });
        baseline.setData(formatted.map((c: any) => ({ time: c.time, value: 0 })));
        const hmaV = ind.hma(14);
        const hmaScaled = hmaV.map((v: number, i: number) => {
          const ref = formatted[i]?.close || 1;
          return ((v - ref) / ref) * 100;
        });
        const hmaS = (subChart as any).addSeries(LineSeries, { color: '#ff6b35', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: true, title: 'HMA' });
        hmaS.setData(formatted.map((c: any, i: number) => ({ time: c.time, value: hmaScaled[i] })).filter((d: any) => !isNaN(d.value) && isFinite(d.value)));
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
      }

      // Sync timescales
      let syncing = false;
      const sync = (src: any, targets: any[]) => src.timeScale().subscribeVisibleTimeRangeChange((range: any) => {
        if (syncing || !range) return;
        syncing = true;
        targets.forEach(c => { try { c.timeScale().setVisibleRange(range); } catch {} });
        setTimeout(() => { syncing = false; }, 10);
      });
      sync(main, [volChart, subChart]);
      sync(volChart, [main, subChart]);
      sync(subChart, [main, volChart]);
    }

    // Crosshair legend
    main.subscribeCrosshairMove((param: any) => {
      if (!param.point || !param.time) { setLegend(null); return; }
      const cd = param.seriesData?.get(candleSeries);
      if (cd) {
        const idx = formatted.findIndex((c: any) => c.time === param.time);
        // For line/area, cd has .value not .open/.high/.low/.close
        const candle = (chartType === 'line' || chartType === 'area')
          ? { open: cd.value, high: cd.value, low: cd.value, close: cd.value }
          : cd;
        setLegend({ ...candle, ema9: addedSeries['EMA_9']?.vals[idx], ema21: addedSeries['EMA_21']?.vals[idx], vwap: addedSeries['VWAP']?.vals[idx] });
      }
    });

    // ResizeObserver — reads panelPctRef so buildCharts doesn't recreate on every drag
    const obs = new ResizeObserver(() => {
      if (!wrapRef.current) return;
      const th = wrapRef.current.clientHeight;
      const h0 = Math.floor(th * panelPctRef.current[0] / 100);
      const h1 = Math.floor(th * panelPctRef.current[1] / 100);
      const h2 = th - h0 - h1;
      [[chartsRef.current.main, mainRef.current, h0], [chartsRef.current.vol, volRef.current, h1], [chartsRef.current.sub, subRef.current, h2]].forEach(([ch, el, h]) => {
        if (el && ch && (h as number) > 0) { (el as HTMLDivElement).style.height = h + 'px'; try { ch.applyOptions({ width: (el as HTMLDivElement).clientWidth, height: h }); } catch {} }
      });
    });
    if (wrapRef.current) obs.observe(wrapRef.current);
    chartsRef.current._obs = obs;
  // candles removed — reads via candlesRef.current; panelPct removed — reads via panelPctRef.current
  }, [theme, activeIndicators, showSignals, subPanel, baseOpts, symbol, chartType]);

  // Full chart rebuild (structure changes: symbol, chartType, indicators, theme)
  useEffect(() => {
    const timer = setTimeout(buildCharts, 60);
    return () => {
      clearTimeout(timer);
      if (chartsRef.current._obs) chartsRef.current._obs.disconnect();
      Object.entries(chartsRef.current).forEach(([k, c]) => { if (k !== '_obs') try { c.remove(); } catch {} });
      chartsRef.current = {};
    };
  }, [buildCharts]);

  // Lightweight data update — only update series data when candles change, no full rebuild
  useEffect(() => {
    if (!candles?.length) return;

    // If chart not built yet (first data arrival), do a full build instead
    if (!seriesRef.current.candle || !chartsRef.current.main) {
      buildCharts();
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
    } catch { /* series may have been removed during rebuild — next buildCharts will recreate */ }
  }, [candles, chartType, buildCharts]);

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

      {/* Panels */}
      <div ref={wrapRef} className="chart-panels">
        {isLoading && <div className="chart-loading"><div className="spinner"/><span>Loading {symbol}...</span></div>}
        <div ref={mainRef} className="chart-panel chart-panel-main"/>
        <div className={`chart-splitter ${dragging===0?'dragging':''}`} style={{top:`${panelPct[0]}%`}} onMouseDown={e=>startDrag(0,e)}><div className="splitter-line"/></div>
        <div ref={volRef} className="chart-panel chart-panel-vol"><div className="subchart-label2">VOLUME</div></div>
        <div className={`chart-splitter ${dragging===1?'dragging':''}`} style={{top:`${panelPct[0]+panelPct[1]}%`}} onMouseDown={e=>startDrag(1,e)}><div className="splitter-line"/></div>
        <div ref={subRef} className="chart-panel chart-panel-sub">
          <div className="subchart-tabs-row">
            {SUB_PANELS.map(p=><button type="button" key={p.id} className={`subchart-tab ${subPanel===p.id?'active':''}`} onClick={()=>setSubPanel(p.id)}>{p.label}</button>)}
            <div className="subchart-tabs-spacer"/>
          </div>
          <div className="sub-chart-inner"/>
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
              const now = Math.floor(Date.now() / 1000);
              const rangeMap: Record<string, number> = {
                '1D':  86400,
                '5D':  86400 * 5,
                '1M':  86400 * 30,
                '3M':  86400 * 90,
                '6M':  86400 * 180,
                'YTD': now - Math.floor(new Date(new Date().getFullYear(), 0, 1).getTime() / 1000),
                '1Y':  86400 * 365,
                '5Y':  86400 * 365 * 5,
                'All': 86400 * 365 * 20,
              };
              const seconds = rangeMap[r] ?? 86400 * 90;
              try {
                main.timeScale().setVisibleRange({ from: (now - seconds) as any, to: now as any });
              } catch {
                main.timeScale().fitContent();
              }
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
