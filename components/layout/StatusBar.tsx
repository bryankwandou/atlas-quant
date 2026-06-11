'use client';
import { useEffect, useState } from 'react';
import { useChartStore } from '@/store/chartStore';
import { useLanguage } from '@/hooks/useLanguage';

// Quick-cycle a few common zones from the status bar; the full 28-zone list
// lives in Settings. Values are IANA names ('local' = browser zone).
const TZ_ORDER = ['UTC', 'Asia/Jakarta', 'America/New_York', 'Europe/London', 'local'];
const tzShort = (tz: string) => !tz || tz === 'local' ? 'Local'
  : tz === 'UTC' ? 'UTC' : (tz.split('/').pop() || tz).replace(/_/g, ' ');

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
    const tz = (!timezone || timezone === 'local') ? undefined : timezone;
    const tick = () => {
      const t = new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: tz });
      setNow(`${t} ${tzShort(timezone)}`);
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
          title="Quick-cycle timezone (full 28-zone list in Settings)"
          onClick={() => {
            const i = TZ_ORDER.indexOf(timezone);
            setTimezone(TZ_ORDER[(i + 1) % TZ_ORDER.length]);
          }}
        >
          {tzShort(timezone)}
        </button>
        <div className="sb-sep" />
        <span className="sb-text mono">{now}</span>
      </div>
    </div>
  );
}
