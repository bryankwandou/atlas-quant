'use client';
import { useEffect, useState } from 'react';
import { useChartStore } from '@/store/chartStore';
import { useLanguage } from '@/hooks/useLanguage';

const REGIME_COLORS: Record<string, string> = {
  STRONG_TREND_UP:   '#089981',
  WEAK_TREND_UP:     '#26a69a',
  RANGING:           '#ff9800',
  WEAK_TREND_DOWN:   '#ef5350',
  STRONG_TREND_DOWN: '#f23645',
};

export default function StatusBar() {
  const { symbol, timeframe, activeIndicators } = useChartStore();
  const { lang } = useLanguage();
  const [latency, setLatency]   = useState<number | null>(null);
  const [now, setNow]           = useState('');
  const [regime, setRegime]     = useState<string>('RANGING');

  useEffect(() => {
    const ping = async () => {
      const t = Date.now();
      try {
        await fetch('/api/market/price?symbol=' + symbol);
        setLatency(Date.now() - t);
      } catch {
        setLatency(null);
      }
    };
    ping();
    const iv = setInterval(ping, 30_000);
    return () => clearInterval(iv);
  }, [symbol]);

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const fetchRegime = async () => {
      try {
        const res = await fetch(`/api/signal/generate?symbol=${symbol}&timeframe=${timeframe}`);
        const data = await res.json();
        if (data?.regime?.regime) setRegime(data.regime.regime);
      } catch {}
    };
    fetchRegime();
  }, [symbol, timeframe]);

  const isOnline = latency !== null && latency < 2000;
  const regimeLabel = regime.replace(/_/g, ' ');
  const regimeCls = regime.includes('UP') ? 'up' : regime.includes('DOWN') ? 'down' : 'neutral';

  return (
    <div className="status-bar">
      {/* Left */}
      <div className="sb-left">
        <span className={isOnline ? 'sb-dot-green' : 'sb-dot-red'} />
        <span className="sb-text">
          {isOnline ? (lang === 'id' ? 'Terhubung' : 'Connected') : 'Offline'} · Binance
        </span>
        <div className="sb-sep" />
        <span className="sb-text mono">
          {latency != null ? `${latency}ms` : '—'}
        </span>
        <div className="sb-sep" />
        <span className="sb-text">{symbol} · {timeframe}</span>
        <div className="sb-sep" />
        <span className={`sb-regime-dot ${regimeCls}`} />
        <span className={`sb-regime-label ${regimeCls}`}>{regimeLabel}</span>
      </div>

      {/* Center: active indicator tags */}
      <div className="sb-center">
        {activeIndicators.slice(0, 6).map(ind => (
          <span key={ind} className="sb-ind-tag">{ind.replace(/_/g, ' ')}</span>
        ))}
        {activeIndicators.length > 6 && (
          <span className="sb-ind-tag">+{activeIndicators.length - 6}</span>
        )}
      </div>

      {/* Right */}
      <div className="sb-right">
        <span className="sb-text mono">{now}</span>
        <div className="sb-sep" />
        <span className="sb-text">ATLAS-QUANT v2.12</span>
        <div className="sb-sep" />
        <span className="sb-warning">⚠ Manual execution only</span>
      </div>
    </div>
  );
}
