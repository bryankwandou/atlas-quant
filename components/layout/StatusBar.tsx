'use client';
import { useEffect, useState } from 'react';
import { useChartStore } from '@/store/chartStore';

export default function StatusBar() {
  const { symbol, timeframe } = useChartStore();
  const [latency, setLatency] = useState<number | null>(null);
  const [now, setNow] = useState('');

  useEffect(() => {
    const pingServer = async () => {
      const start = Date.now();
      try {
        await fetch('/api/market/price?symbol=' + symbol);
        setLatency(Date.now() - start);
      } catch {
        setLatency(null);
      }
    };
    pingServer();
    const iv = setInterval(pingServer, 30000);
    return () => clearInterval(iv);
  }, [symbol]);

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString());
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      height: 'var(--statusbar-h)', background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 12px',
      gap: 16, fontSize: 11, color: 'var(--text-muted)',
      flexShrink: 0,
    }}>
      <span style={{ color: latency !== null && latency < 500 ? 'var(--buy)' : 'var(--sell)' }}>
        ● {latency !== null ? `${latency}ms` : 'offline'}
      </span>
      <span>{symbol} · {timeframe}</span>
      <span style={{ flex: 1 }} />
      <span>Atlas-Quant v2.0</span>
      <span style={{ fontFamily: 'monospace' }}>{now}</span>
    </div>
  );
}
