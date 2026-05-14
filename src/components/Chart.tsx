'use client';
// Legacy Chart component — kept for backward compatibility
// New chart: components/chart/ChartContainer.tsx
import { useEffect, useRef } from 'react';
import {
  createChart, ColorType, CrosshairMode, LineStyle,
  CandlestickSeries, LineSeries, HistogramSeries,
} from 'lightweight-charts';

export default function TradingViewChart({ data }: { data: any[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!data || data.length === 0) {
      ref.current.innerHTML = '<div style="color:#666;padding:40px;text-align:center;font-family:monospace;background:#131722;">LOADING...</div>';
      return;
    }
    ref.current.innerHTML = '';

    const chart = createChart(ref.current, {
      layout: { background: { type: ColorType.Solid, color: '#131722' }, textColor: '#d1d4dc', fontSize: 11 },
      grid: { vertLines: { color: 'rgba(42,46,57,0.5)', style: LineStyle.Dashed }, horzLines: { color: 'rgba(42,46,57,0.5)', style: LineStyle.Dashed } },
      crosshair: { mode: CrosshairMode.Magnet },
      timeScale: { borderColor: '#2a2e39', timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: '#2a2e39', scaleMargins: { top: 0.1, bottom: 0.3 } },
      autoSize: true,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
      wickUpColor: '#26a69a', wickDownColor: '#ef5350',
    });

    const processed = data
      .filter(item => item && (item.timestamp || item.time || item.open_time))
      .map(item => ({
        time: Math.floor(Number(item.timestamp || item.time || item.open_time) / (item.open_time > 1e10 ? 1000 : 1)) as any,
        open: Number(item.open || 0), high: Number(item.high || 0),
        low: Number(item.low || 0), close: Number(item.close || 0),
      }))
      .filter(item => item.time > 0 && item.close > 0)
      .sort((a, b) => (a.time as any) - (b.time as any));

    if (processed.length > 0) {
      candleSeries.setData(processed as any);

      // EMA 50
      const k50 = 2 / 51;
      let ema50 = processed[0].close;
      const ema50Data = processed.map(c => {
        ema50 = c.close * k50 + ema50 * (1 - k50);
        return { time: c.time, value: ema50 };
      });
      chart.addSeries(LineSeries, { color: '#00bcd4', lineWidth: 2, priceLineVisible: false }).setData(ema50Data as any);
      chart.timeScale().fitContent();
    }

    return () => { chart.remove(); };
  }, [data]);

  return (
    <div className="w-full h-full relative">
      <div ref={ref} className="w-full h-full min-h-[400px]" />
    </div>
  );
}
