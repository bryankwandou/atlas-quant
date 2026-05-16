'use client';
/**
 * T1MO Chart — TradingView lightweight-charts dengan overlay:
 *   - Backbone EMA (line)
 *   - Magenta EMA (dotted)
 *   - Top Box / Btm Box (step lines)
 *   - HMF momentum (sub-pane)
 *   - Regime Strength (color histogram, sub-pane)
 *   - SMC RR Fibonacci (price lines bila tersedia)
 *
 * Semua param indikator T1MO dapat di-passing dari parent.
 */
import { useEffect, useRef } from 'react';

export interface T1MOSeries {
  backbone: (number | null)[];
  magenta: (number | null)[];
  topBox: (number | null)[];
  btmBox: (number | null)[];
  hmf: (number | null)[];
  regimeStrength: number[];
  regimeColors?: string[];
}

export interface T1MOFibLevel {
  value: number;
  label?: string;
  color?: string;
}

export interface T1MOChartProps {
  candles: Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>;
  series: T1MOSeries;
  meta?: {
    regimeColors?: string[];
    backboneLen?: number;
    magentaLen?: number;
  };
  fibLevels?: T1MOFibLevel[];
  height?: number;
  symbol?: string;
  timeframe?: string;
}

export default function T1MOChart({ candles, series, meta, fibLevels, height = 560, symbol = '', timeframe = '' }: T1MOChartProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || !candles?.length) return;
    let dispose: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const lc = await import('lightweight-charts');
      if (cancelled || !container.current) return;
      container.current.innerHTML = '';
      const chart = lc.createChart(container.current, {
        layout: {
          background: { type: lc.ColorType.Solid, color: '#0b0d12' },
          textColor: '#94a3b8',
          fontSize: 11,
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        grid: {
          vertLines: { color: 'rgba(255,255,255,0.04)', style: lc.LineStyle.Dotted },
          horzLines: { color: 'rgba(255,255,255,0.04)', style: lc.LineStyle.Dotted },
        },
        crosshair: { mode: lc.CrosshairMode.Magnet },
        rightPriceScale: { borderColor: '#1f2937', scaleMargins: { top: 0.08, bottom: 0.3 } },
        timeScale: { borderColor: '#1f2937', timeVisible: true, secondsVisible: false, barSpacing: 6 },
        autoSize: true,
      });

      const sec = (t: number) => Math.floor(t / 1000) as unknown as number;
      const candleSeries = chart.addSeries(lc.CandlestickSeries, {
        upColor: '#16a34a',
        wickUpColor: '#16a34a',
        downColor: '#dc2626',
        wickDownColor: '#dc2626',
        borderVisible: false,
      });
      candleSeries.setData(candles.map((c) => ({
        time: sec(c.time), open: c.open, high: c.high, low: c.low, close: c.close,
      })) as never);

      const backboneLine = chart.addSeries(lc.LineSeries, { color: '#22d3ee', lineWidth: 2, title: `Backbone${meta?.backboneLen ? `(${meta.backboneLen})` : ''}` });
      const magentaLine = chart.addSeries(lc.LineSeries, { color: '#e879f9', lineWidth: 2, lineStyle: lc.LineStyle.Dotted, title: `Magenta${meta?.magentaLen ? `(${meta.magentaLen})` : ''}` });
      const topBoxLine = chart.addSeries(lc.LineSeries, { color: '#fb923c', lineWidth: 2, lineType: 1 as unknown as number, title: 'Top Box' });
      const btmBoxLine = chart.addSeries(lc.LineSeries, { color: '#a78bfa', lineWidth: 2, lineType: 1 as unknown as number, title: 'Btm Box' });

      const lineFrom = (arr: (number | null)[]) => arr
        .map((v, i) => (v === null || !Number.isFinite(v) ? null : { time: sec(candles[i].time), value: v }))
        .filter(Boolean) as Array<{ time: number; value: number }>;
      backboneLine.setData(lineFrom(series.backbone) as never);
      magentaLine.setData(lineFrom(series.magenta) as never);
      topBoxLine.setData(lineFrom(series.topBox) as never);
      btmBoxLine.setData(lineFrom(series.btmBox) as never);

      // Regime strength histogram (sub pane)
      const regimeHist = chart.addSeries(lc.HistogramSeries, {
        priceScaleId: 'regime',
        title: 'Regime Strength',
      });
      chart.priceScale('regime').applyOptions({ scaleMargins: { top: 0.75, bottom: 0.12 }, borderVisible: false });
      regimeHist.setData(series.regimeStrength.map((v, i) => ({
        time: sec(candles[i].time),
        value: v,
        color: series.regimeColors?.[i] ?? (v > 5 ? '#16a34a' : v < 4 ? '#dc2626' : '#facc15'),
      })) as never);

      // HMF momentum sub pane
      const hmfHist = chart.addSeries(lc.HistogramSeries, {
        priceScaleId: 'hmf',
        title: 'HMF Momentum',
      });
      chart.priceScale('hmf').applyOptions({ scaleMargins: { top: 0.9, bottom: 0.02 }, borderVisible: false });
      hmfHist.setData(series.hmf.map((v, i) => ({
        time: sec(candles[i].time),
        value: v ?? 0,
        color: (v ?? 0) > 0 ? '#16a34a' : '#dc2626',
      })) as never);

      // Fib levels — render as price lines on candleSeries
      const lines: ReturnType<typeof candleSeries.createPriceLine>[] = [];
      for (const fib of fibLevels ?? []) {
        const ln = candleSeries.createPriceLine({
          price: fib.value,
          color: fib.color || '#94a3b8',
          lineStyle: lc.LineStyle.Dashed,
          lineWidth: 1,
          axisLabelVisible: true,
          title: fib.label || `${fib.value.toFixed(4)}`,
        });
        lines.push(ln);
      }

      chart.timeScale().fitContent();

      dispose = () => {
        lines.forEach((l) => candleSeries.removePriceLine(l));
        chart.remove();
      };
    })();

    return () => { cancelled = true; dispose?.(); };
  }, [candles, series, meta, fibLevels]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={container} className="absolute inset-0" />
      <div className="absolute top-3 left-3 text-xs text-[var(--text-secondary)] pointer-events-none mono bg-black/30 px-2 py-1 rounded">
        {symbol} · {timeframe} · {candles?.length || 0} bars
      </div>
    </div>
  );
}
