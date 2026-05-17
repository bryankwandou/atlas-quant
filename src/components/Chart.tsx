'use client';

import { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle, CandlestickSeries, LineSeries, HistogramSeries } from 'lightweight-charts';

export default function TradingViewChart({ data }: { data: any[] }) {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;
        if (!data || data.length === 0) {
            chartContainerRef.current.innerHTML = '<div style="color: #666; padding: 40px; text-align: center; font-family: sans-serif; font-size: 12px; font-weight: bold; letter-spacing: 1px; background: #131722;">SYNCING_NEURAL_NODES...</div>';
            return;
        }

        chartContainerRef.current.innerHTML = '';

        try {
            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { type: ColorType.Solid, color: '#131722' },
                    textColor: '#d1d4dc',
                    fontSize: 11,
                    fontFamily: "'Trebuchet MS', Roboto, Ubuntu, sans-serif",
                },
                grid: {
                    vertLines: { color: 'rgba(42, 46, 57, 0.5)', style: LineStyle.Dashed },
                    horzLines: { color: 'rgba(42, 46, 57, 0.5)', style: LineStyle.Dashed },
                },
                crosshair: {
                    mode: CrosshairMode.Magnet,
                    vertLine: {
                        width: 1,
                        color: '#758696',
                        style: LineStyle.LargeDashed,
                        labelBackgroundColor: '#131722',
                    },
                    horzLine: {
                        width: 1,
                        color: '#758696',
                        style: LineStyle.LargeDashed,
                        labelBackgroundColor: '#131722',
                    },
                },
                timeScale: {
                    borderColor: '#2a2e39',
                    timeVisible: true,
                    secondsVisible: false,
                    barSpacing: 8,
                },
                rightPriceScale: {
                    borderColor: '#2a2e39',
                    scaleMargins: { top: 0.1, bottom: 0.3 },
                    visible: true,
                    borderVisible: true,
                    alignLabels: true,
                },
                handleScroll: true,
                handleScale: true,
                autoSize: true,
            });

            // 1. Candlestick Series (Akela Scientific Style)
            const candlestickSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
                priceLineVisible: true,
                priceLineWidth: 1,
                priceLineColor: '#758696',
                priceLineStyle: LineStyle.Dotted,
            });

            // 2. T1MO Reference Indicators
            // Trend Backbone (The Cyan MA - EMA 50)
            const backboneSeries = chart.addSeries(LineSeries, {
                color: '#00bcd4',
                lineWidth: 2,
                title: 'Backbone (EMA 50)',
                crosshairMarkerVisible: false
            });

            // Magenta Dotted Line (Shorter Trend - EMA 10)
            const magentaSeries = chart.addSeries(LineSeries, {
                color: '#e91e63',
                lineWidth: 2,
                lineStyle: LineStyle.Dotted,
                title: 'Magenta (EMA 10)',
                crosshairMarkerVisible: false
            });

            // Volatility Box (Step Lines) - Orange Top, Grey Bottom
            const topBoxSeries = chart.addSeries(LineSeries, {
                color: '#ff9800',
                lineWidth: 2,
                lineType: 1, // Step line
                title: 'Top Box'
            });
            const btmBoxSeries = chart.addSeries(LineSeries, {
                color: '#795548',
                lineWidth: 2,
                lineType: 1, // Step line
                title: 'Btm Box'
            });

            // 3. Lower Histogram Panes (Scientific Status)
            const strengthPane = chart.addSeries(HistogramSeries, {
                priceScaleId: 'strength',
                title: 'Regime Strength',
            });
            chart.priceScale('strength').applyOptions({
                scaleMargins: { top: 0.7, bottom: 0.15 },
                borderVisible: false
            });

            const momentumPane = chart.addSeries(HistogramSeries, {
                priceScaleId: 'momentum',
                title: 'Momentum structure',
            });
            chart.priceScale('momentum').applyOptions({
                scaleMargins: { top: 0.88, bottom: 0.05 },
                borderVisible: false
            });

            // 4. Data Processing
            const processed = data
                .filter(item => item && (item.timestamp || item.time))
                .map(item => ({
                    time: Number(item.timestamp || item.time || 0) as any,
                    open: Number(item.open || 0),
                    high: Number(item.high || 0),
                    low: Number(item.low || 0),
                    close: Number(item.close || 0),
                }))
                .filter(item => item.time > 0 && !isNaN(item.time as any))
                .sort((a, b) => (a.time as any) - (b.time as any));

            if (processed.length > 0) {
                candlestickSeries.setData(processed as any);

                const backboneData = [];
                const magentaData = [];
                const topBoxData = [];
                const btmBoxData = [];
                const sData = [];
                const mData = [];

                // Entry signal markers (Atlas Quant v2 quant engine)
                let ema50 = processed[0].close;
                let ema10 = processed[0].close;
                const k50 = 2 / (50 + 1);
                const k10 = 2 / (10 + 1);
                let momEMA = 0;
                const k10Mom = 2 / (10 + 1);
                const momHistory: number[] = [];
                const markers: any[] = [];

                for (let i = 0; i < processed.length; i++) {
                    const t = processed[i].time;
                    const c = processed[i].close;

                    ema50 = (c - ema50) * k50 + ema50;
                    ema10 = (c - ema10) * k10 + ema10;

                    backboneData.push({ time: t, value: ema50 });
                    magentaData.push({ time: t, value: ema10 });

                    // Vol Box Logic (Acceptance Area)
                    const window = processed.slice(Math.max(0, i - 20), i + 1);
                    const hi = Math.max(...window.map(w => w.high));
                    const lo = Math.min(...window.map(w => w.low));
                    const mean = window.reduce((a, b) => a + b.close, 0) / window.length;

                    // Scientific Box Range (T1MO Style)
                    const tb = mean + (hi - lo) * 0.5;
                    const bb = mean - (hi - lo) * 0.5;
                    topBoxData.push({ time: t, value: tb });
                    btmBoxData.push({ time: t, value: bb });

                    // Momentum EMA (Structure Analysis)
                    const delta = i > 0 ? c - processed[i - 1].close : 0;
                    momEMA = (delta - momEMA) * k10Mom + momEMA;
                    momHistory.push(momEMA);

                    // Strength Blocks (Regime Coloring)
                    let strengthColor = '#eeeeee';
                    const slope = i > 4 ? ema50 - backboneData[i - 4].value : 0;
                    if (c > ema50 && slope > 0) strengthColor = '#00e676';
                    else if (c < ema50 && slope < 0) strengthColor = '#ff1744';
                    else strengthColor = '#ffea00';
                    sData.push({ time: t, value: 5, color: strengthColor });

                    // Momentum Pulse (Histogram bars)
                    mData.push({ time: t, value: 3, color: momEMA > 0 ? '#00e676' : '#ff1744' });

                    // Signal classification rules (Atlas Quant v2)
                    const prevMom = i > 3 ? momHistory[i - 3] : 0;
                    const isStrongUp = momEMA > 0 && momEMA > prevMom;
                    const isStrongDown = momEMA < 0 && momEMA < prevMom;

                    const isLong = (c > ema50 && slope > 0) && isStrongUp && (c > bb);
                    const isShort = (c < ema50 && slope < 0) && isStrongDown && (c < tb);

                    if (isLong && (!markers.length || markers[markers.length - 1].text !== 'BUY')) {
                        markers.push({ time: t, position: 'belowBar', color: '#00e676', shape: 'arrowUp', text: 'BUY' });
                    } else if (isShort && (!markers.length || markers[markers.length - 1].text !== 'SELL')) {
                        markers.push({ time: t, position: 'aboveBar', color: '#ff1744', shape: 'arrowDown', text: 'SELL' });
                    }
                }

                backboneSeries.setData(backboneData as any);
                magentaSeries.setData(magentaData as any);
                topBoxSeries.setData(topBoxData as any);
                btmBoxSeries.setData(btmBoxData as any);
                strengthPane.setData(sData as any);
                momentumPane.setData(mData as any);
                (candlestickSeries as any).setMarkers(markers);

                chart.timeScale().fitContent();
            }

            // (Legacy legend overlay removed — handled by parent components in v2 UI.)

            return () => {
                chart.remove();
            };
        } catch (error) {
            console.error("Visual Core Failure:", error);
        }
    }, [data]);

    return (
        <div className="w-full h-full relative group">
            <div ref={chartContainerRef} className="w-full h-full min-h-[600px]" />
        </div>
    );
}
