'use client';
import { useEffect, useRef, useState } from 'react';
import { useChartStore } from '@/store/chartStore';
import { useLanguage } from '@/hooks/useLanguage';
import { TZ_ZONES, tzCity, tzOffset, tzShort } from '@/lib/timezones';

export default function StatusBar() {
  const { symbol, timeframe, timezone, setTimezone } = useChartStore();
  const { lang } = useLanguage();
  const [now, setNow]         = useState('');
  const [regime, setRegime]   = useState<string>('RANGING');
  const [isOnline, setIsOnline] = useState(true);
  const [tzOpen, setTzOpen]   = useState(false);
  const tzWrapRef = useRef<HTMLDivElement>(null);

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

  // Close the timezone menu on outside-click / Escape
  useEffect(() => {
    if (!tzOpen) return;
    const onDown = (e: MouseEvent) => {
      if (tzWrapRef.current && !tzWrapRef.current.contains(e.target as Node)) setTzOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTzOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [tzOpen]);

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
  const activeTz = !timezone ? 'local' : timezone;

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
        <div className="sb-tz-wrap" ref={tzWrapRef}>
          <button
            type="button"
            className={`sb-tz-btn${tzOpen ? ' open' : ''}`}
            title="Change chart timezone"
            onClick={() => setTzOpen(o => !o)}
          >
            🕓 {tzShort(timezone)} ▾
          </button>
          {tzOpen && (
            <div className="sb-tz-menu" aria-label="Select chart timezone">
              {TZ_ZONES.map(z => {
                const active = activeTz === z;
                return (
                  <button
                    key={z}
                    type="button"
                    className={`sb-tz-item${active ? ' active' : ''}`}
                    onClick={() => { setTimezone(z); setTzOpen(false); }}
                  >
                    <span className="sb-tz-off">{tzOffset(z)}</span>
                    <span className="sb-tz-city">{tzCity(z)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="sb-sep" />
        <span className="sb-text mono">{now}</span>
      </div>
    </div>
  );
}
