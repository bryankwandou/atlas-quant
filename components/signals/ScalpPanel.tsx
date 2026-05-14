'use client';
import { useEffect, useState } from 'react';
import { strategyVWAPBounce, strategyEMACross } from '@/src/core/quant/signal-engine';
import { useMarketData } from '@/hooks/useMarketData';
import { useLanguage } from '@/hooks/useLanguage';

export default function ScalpPanel({ symbol }: { symbol: string }) {
  const { t } = useLanguage();
  const { candles } = useMarketData(symbol, '1m');
  const [signal, setSignal] = useState<any>(null);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    const compute = () => {
      if (!candles?.length) return;
      const mapped = candles.map((c: any) => ({
        time: c.open_time, open: c.open, high: c.high, low: c.low,
        close: c.close, volume: c.volume,
      }));
      const vwapSig = strategyVWAPBounce(mapped);
      const emaSig  = strategyEMACross(mapped);
      const best = [vwapSig, emaSig]
        .filter(s => s.type !== 'NEUTRAL')
        .sort((a, b) => b.confidence - a.confidence)[0];
      setSignal(best || vwapSig);
    };
    compute();
    const interval = setInterval(compute, 60000);
    return () => clearInterval(interval);
  }, [candles]);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setCountdown(60 - (elapsed % 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!signal) return <div className="scalp-loading">Loading 1M signal...</div>;

  const isActive = signal.type !== 'NEUTRAL';
  const isBuy    = signal.type === 'BUY';

  return (
    <div className={`scalp-panel ${isActive ? (isBuy ? 'border-buy' : 'border-sell') : 'border-neutral'}`}>
      <div className="scalp-header">
        <span className="scalp-label">⚡ SCALP 1M</span>
        <span className="scalp-countdown">Refresh: {countdown}s</span>
      </div>

      <div className={`scalp-signal ${isActive ? (isBuy ? 'signal-buy' : 'signal-sell') : 'signal-neutral'}`}>
        <span>{signal.type}</span>
        <span>{signal.confidence}%</span>
      </div>

      {isActive && (
        <div className="scalp-levels">
          <div className="level-row">
            <span className="level-label">Entry</span>
            <span className="level-value">{signal.entryPrice?.toFixed(4)}</span>
          </div>
          <div className="level-row tp">
            <span className="level-label">TP1</span>
            <span className="level-value">{signal.tp1?.toFixed(4)}</span>
          </div>
          <div className="level-row tp">
            <span className="level-label">TP2</span>
            <span className="level-value">{signal.tp2?.toFixed(4)}</span>
          </div>
          <div className="level-row sl">
            <span className="level-label">SL</span>
            <span className="level-value">{signal.sl?.toFixed(4)}</span>
          </div>
          <div className="level-row rr">
            <span className="level-label">R:R</span>
            <span className="level-value">1:{signal.rrRatio}</span>
          </div>
        </div>
      )}

      <div className="scalp-strategy">{signal.strategy}</div>
      <div className="scalp-warning">⚠️ {t('signal.manual_only')}</div>
    </div>
  );
}
