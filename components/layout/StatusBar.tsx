'use client';
import { useEffect, useState } from 'react';
import { useChartStore } from '@/store/chartStore';
import { useLanguage } from '@/hooks/useLanguage';

type TZ = 'local' | 'utc' | 'gmt+7';
const TZ_LABELS: Record<TZ, string> = { local: 'Local', utc: 'UTC', 'gmt+7': 'GMT+7' };
const TZ_ORDER: TZ[] = ['utc', 'gmt+7', 'local'];

export default function StatusBar() {
  const { symbol, timeframe, timezone, setTimezone } = useChartStore();
  const { lang } = useLanguage();
  const [now, setNow]         = useState('');
  const [regime, setRegime]   = useState<string>('RANGING');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const ping = async () => {
      try { await fetch('/api/market/price?symbol=' + symbol); setIsOnline(true); }
      catch { setIsOnline(false); }
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
        const g = new Date(d.getTime() + 7 * 3600000);
        setNow(g.toISOString().substring(11, 19) + ' GMT+7');
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

  const regimeLabel = regime.replace(/_/g, ' ');
  const regimeCls   = regime.includes('UP') ? 'up' : regime.includes('DOWN') ? 'down' : 'neutral';

  return (
    <div className="status-bar">
      {/* Left */}
      <div className="sb-left">
        <span className={isOnline ? 'sb-dot-green' : 'sb-dot-red'} />
        <span className="sb-text">
          {isOnline ? (lang === 'id' ? 'Terhubung' : 'Connected') : 'Offline'} · Binance
        </span>
        <div className="sb-sep" />
        <span className="sb-text">{symbol} · {timeframe}</span>
        <div className="sb-sep" />
        <span className={`sb-regime-dot ${regimeCls}`} />
        <span className={`sb-regime-label ${regimeCls}`}>{regimeLabel}</span>
      </div>

      {/* Center */}
      <div className="sb-center">
        <span className="sb-text sb-text-dim">ATLAS-QUANT · T1MO Core</span>
      </div>

      {/* Right */}
      <div className="sb-right">
        <button
          type="button"
          className="sb-tz-btn"
          title="Click to cycle timezone: UTC → GMT+7 → Local"
          onClick={() => {
            const curr = (timezone ?? 'utc') as TZ;
            setTimezone(TZ_ORDER[(TZ_ORDER.indexOf(curr) + 1) % TZ_ORDER.length]);
          }}
        >
          {TZ_LABELS[(timezone ?? 'utc') as TZ]}
        </button>
        <div className="sb-sep" />
        <span className="sb-text mono">{now}</span>
      </div>
    </div>
  );
}
