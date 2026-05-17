'use client';
import { useEffect, useState } from 'react';

export interface StatusBarProps {
  regime?: string;
  regimeColor?: string;
  activeIndicatorCount?: number;
  universeSize?: number;
  symbol?: string;
  lang?: 'id' | 'en';
}

export default function StatusBar({ regime, regimeColor = '#2962ff', activeIndicatorCount = 0, universeSize, symbol, lang = 'id' }: StatusBarProps) {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('id-ID'));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="status-bar">
      <div className="sb-left">
        <span className="sb-dot-green" />
        <span className="sb-text">{lang === 'id' ? 'Live' : 'Live'}</span>
        <span className="sb-sep" />
        <span className="sb-text">{symbol || '—'}</span>
        {universeSize != null && <><span className="sb-sep" /><span className="sb-text">{universeSize.toLocaleString()} aset</span></>}
      </div>
      <div className="sb-center">
        {regime && (
          <>
            <span className="sb-regime-dot" style={{ background: regimeColor }} />
            <span className="sb-text">{lang === 'id' ? 'Regime' : 'Regime'}: <b style={{ color: regimeColor }}>{regime.replace(/_/g, ' ').toUpperCase()}</b></span>
            <span className="sb-sep" />
          </>
        )}
        <span className="sb-text">Atlas Quant v2.2 · TradingView design port</span>
        <span className="sb-sep" />
        <span className="sb-ind-tag">{activeIndicatorCount} indikator aktif</span>
      </div>
      <div className="sb-right">
        <span className="sb-text mono">{time}</span>
        <span className="sb-sep" />
        <span className="sb-ind-tag">UTC{new Date().getTimezoneOffset() / -60 >= 0 ? '+' : ''}{new Date().getTimezoneOffset() / -60}</span>
      </div>
    </div>
  );
}
