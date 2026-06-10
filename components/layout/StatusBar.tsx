'use client';
import { useEffect, useState } from 'react';
import { useChartStore } from '@/store/chartStore';
import { useLanguage } from '@/hooks/useLanguage';

type TZ = 'local' | 'utc' | 'gmt+7';
const TZ_LABELS: Record<TZ, string> = { local: 'Local', utc: 'UTC', 'gmt+7': 'GMT+7' };
const TZ_ORDER: TZ[] = ['utc', 'gmt+7', 'local'];

const REGIME_COLORS: Record<string, string> = {
  STRONG_TREND_UP:   '#089981',
  WEAK_TREND_UP:     '#26a69a',
  RANGING:           '#ff9800',
  WEAK_TREND_DOWN:   '#ef5350',
  STRONG_TREND_DOWN: '#f23645',
};

export default function StatusBar() {
  const { symbol, timeframe, timezone, setTimezone } = useChartStore();
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
    const tick = () => {
      const d = new Date();
      if (timezone === 'utc') {
        setNow(d.toISOString().substring(11, 19) + ' UTC');
      } else if (timezone === 'gmt+7') {
        const gmt7 = new Date(d.getTime() + 7 * 3600000);
        setNow(gmt7.toISOString().substring(11, 19) + ' GMT+7');
      } else {
        setNow(d.toLocaleTimeString('en-US', { hour12: false }));
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [timezone]);

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

      {/* Center: version info */}
      <div className="sb-center">
        <span className="sb-text">ATLAS-QUANT</span>
        <div className="sb-sep" />
        <span className="sb-text sb-text-dim">T1MO Core · Live</span>
      </div>

      {/* Right */}
      <div className="sb-right">
        <button
          className="sb-tz-btn"
          title="Click to cycle timezone: UTC → GMT+7 → Local"
          onClick={() => {
            const curr = (timezone ?? 'utc') as TZ;
            const idx = TZ_ORDER.indexOf(curr);
            setTimezone(TZ_ORDER[(idx + 1) % TZ_ORDER.length]);
          }}
        >
          {TZ_LABELS[(timezone ?? 'utc') as TZ]}
        </button>
        <div className="sb-sep" />
        <span className="sb-text mono">{now}</span>
        <div className="sb-sep" />
        <span className="sb-text" title="Live deployed build commit">
          ATLAS-QUANT v2.16 · {(process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7)}
        </span>
        <div className="sb-sep" />
        <span className="sb-warning">Manual execution only</span>
      </div>
    </div>
  );
}
