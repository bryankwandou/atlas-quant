'use client';
import { useEffect, useState } from 'react';
import { useChartStore } from '@/store/chartStore';

export default function StatusBar() {
  const { symbol, timeframe } = useChartStore();
  const [latency, setLatency] = useState<number | null>(null);
  const [now, setNow] = useState('');

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
    const tick = () => setNow(new Date().toLocaleTimeString('en-GB'));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  const isOnline = latency !== null && latency < 2000;

  return (
    <div className="status-bar">
      <div className="status-item">
        <span className={`status-dot${isOnline ? '' : ' disconnected'}`} />
        <span className="mono">{latency != null ? `${latency}ms` : 'offline'}</span>
      </div>
      <div className="status-item">
        <span>{symbol}</span>
        <span className="status-muted">·</span>
        <span className="mono">{timeframe}</span>
      </div>
      <div className="status-spacer" />
      <div className="status-item">
        <span>Atlas-Quant</span>
        <span className="status-muted">v2.12</span>
      </div>
      <div className="status-item mono">{now}</div>
    </div>
  );
}
