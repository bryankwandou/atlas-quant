'use client';
/**
 * Faithful port of E:\CLAUDE DESIGN\ATLAS-QUANT (2)\src\components\TopBar.jsx
 * dengan symbol search live ke /api/market/symbols (3000+ aset).
 */
import { useEffect, useRef, useState } from 'react';
import type { Asset } from '@/domain/asset';

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
const TF_GROUPS: { group: string; tfs: string[] }[] = [
  { group: 'Seconds', tfs: ['1s', '15s', '30s'] },
  { group: 'Minutes', tfs: ['1m', '3m', '5m', '15m', '30m'] },
  { group: 'Hours', tfs: ['1h', '2h', '4h', '12h'] },
  { group: 'Days', tfs: ['1d', '1w'] },
];

interface TopBarProps {
  symbol: string;
  tf: string;
  price: number;
  changePct: number;
  exchange?: string;
  lang: 'id' | 'en';
  theme: 'dark' | 'light';
  onSymbol: (s: string) => void;
  onTf: (tf: string) => void;
  onToggleTheme: () => void;
  onToggleLang: () => void;
  onOpenIndicators: () => void;
  onToggleSignals: () => void;
  showSignals: boolean;
}

export default function TopBar({
  symbol, tf, price, changePct, exchange = 'BINANCE',
  lang, theme,
  onSymbol, onTf, onToggleTheme, onToggleLang, onOpenIndicators, onToggleSignals, showSignals,
}: TopBarProps) {
  const [showSymSearch, setShowSymSearch] = useState(false);
  const [showTfDrop, setShowTfDrop] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Asset[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (showSymSearch) setTimeout(() => searchRef.current?.focus(), 50); }, [showSymSearch]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const url = `/api/market/symbols?limit=20${q ? `&q=${encodeURIComponent(q)}` : ''}`;
      try {
        const r = await fetch(url);
        const d = await r.json();
        setResults(d.results ?? []);
      } catch { setResults([]); }
    }, 120);
    return () => clearTimeout(t);
  }, [q, showSymSearch]);

  const isUp = changePct >= 0;

  return (
    <div className="topbar">
      <div className="topbar-logo">
        <span className="logo-symbol">▲</span>
        <span className="logo-text">ATLAS</span>
      </div>

      <div className="tv-sep" />

      <div style={{ position: 'relative' }}>
        <button className="topbar-sym-btn" onClick={() => setShowSymSearch((v) => !v)}>
          <span className="sym-exch">{exchange}</span>
          <span className="sym-tick">{symbol}</span>
          <span style={{ marginLeft: 4, opacity: 0.6 }}>▾</span>
        </button>
        {showSymSearch && (
          <div className="sym-search-panel" onMouseLeave={() => setShowSymSearch(false)}>
            <div className="sym-search-hdr">
              <span style={{ opacity: 0.5 }}>🔍</span>
              <input
                ref={searchRef}
                placeholder={lang === 'id' ? 'Cari simbol… (3000+ aset)' : 'Search symbol… (3000+ assets)'}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <button className="indmod-close" onClick={() => setShowSymSearch(false)}>✕</button>
            </div>
            <div className="sym-list">
              {results.map((s) => (
                <div
                  key={`${s.symbol}-${s.exchange}`}
                  className={`sym-item ${s.symbol === symbol ? 'active' : ''}`}
                  onClick={() => { onSymbol(s.symbol); setShowSymSearch(false); setQ(''); }}
                >
                  <div className="sym-item-l">
                    <span className="si-sym">{s.symbol}</span>
                    <span className="si-name">{s.name}</span>
                  </div>
                  <div className="sym-item-r">
                    <span className="si-price">{(s.priceUsd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
                    <span className="si-chg text-muted">{s.assetClass}·{s.exchange ?? '—'}</span>
                  </div>
                </div>
              ))}
              {!results.length && <div style={{ padding: 20, textAlign: 'center', color: 'var(--tv-text2)' }}>—</div>}
            </div>
          </div>
        )}
      </div>

      <div className="topbar-price-wrap">
        <span className="tp-price">{price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
        <span className={`tp-chg ${isUp ? 'up' : 'down'}`}>{isUp ? '+' : ''}{changePct.toFixed(2)}%</span>
      </div>

      <div className="tv-sep" />

      <div className="tf-wrap" style={{ position: 'relative' }}>
        {TIMEFRAMES.map((t) => (
          <button key={t} className={`tf-btn ${tf === t ? 'active' : ''}`} onClick={() => onTf(t)}>{t}</button>
        ))}
        <button className={`tf-btn tf-more ${showTfDrop ? 'active' : ''}`} onClick={() => setShowTfDrop((v) => !v)}>···</button>
        {showTfDrop && (
          <div className="sym-search-panel" style={{ width: 220, left: 'auto', right: 0 }} onMouseLeave={() => setShowTfDrop(false)}>
            <div style={{ padding: 8 }}>
              {TF_GROUPS.map((g) => (
                <div key={g.group} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--tv-text3)', letterSpacing: 1, padding: '4px 2px 2px' }}>{g.group}</div>
                  <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {g.tfs.map((t) => (
                      <button key={t} className={`tf-btn ${tf === t ? 'active' : ''}`} onClick={() => { onTf(t); setShowTfDrop(false); }}>{t}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="tv-sep" />

      <button className={`tb-action ${false ? 'active' : ''}`} onClick={onOpenIndicators}>
        <span>≡</span><span>{lang === 'id' ? 'Indikator' : 'Indicators'}</span>
      </button>
      <button className="tb-action"><span>⇄</span><span>{lang === 'id' ? 'Bandingkan' : 'Compare'}</span></button>
      <button className="tb-action"><span>🔔</span><span>{lang === 'id' ? 'Alert' : 'Alerts'}</span></button>
      <button className={`tb-action highlight ${showSignals ? 'active' : ''}`} onClick={onToggleSignals}>
        <span>⚡</span><span>{lang === 'id' ? 'Sinyal' : 'Signals'}</span>
      </button>

      <div className="topbar-right">
        <button className="tb-right-btn" title="Watchlist">★</button>
        <button className="tb-right-btn" title="Layout">▦</button>
        <div className="tv-sep" />
        <button className="tb-lang-btn" onClick={onToggleLang} title="Language">🌐 {lang.toUpperCase()}</button>
        <button className="tb-theme-btn" onClick={onToggleTheme} title="Theme">{theme === 'dark' ? '☀' : '☾'}</button>
        <button className="tb-right-btn" title="Settings">⚙</button>
      </div>
    </div>
  );
}
