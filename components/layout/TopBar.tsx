'use client';
import { useState, useEffect, useRef } from 'react';
import {
  ChevronDown, Search, X, Layers, Bell, Camera, RefreshCw,
  Sun, Moon, Globe, Settings, Grid, Star, BarChart2,
} from 'lucide-react';
// GitCompare doesn't exist in lucide-react — use inline SVG
const GitCompareIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
    <path d="M6 21V9a9 9 0 009 9"/>
  </svg>
);
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useChartStore } from '@/store/chartStore';
import { useMarketPrice } from '@/hooks/useMarketData';


const QUICK_TFS = ['1m', '5m', '15m', '1h', '4h', '1d'];
const TF_GROUPS = [
  { group: 'Seconds', tfs: ['1s', '15s', '30s'] },
  { group: 'Minutes', tfs: ['1m', '3m', '5m', '10m', '15m', '30m', '45m'] },
  { group: 'Hours',   tfs: ['1h', '2h', '3h', '4h', '6h', '8h', '12h'] },
  { group: 'Days',    tfs: ['1d', '2d', '3d'] },
  { group: 'Weeks',   tfs: ['1w', '2w'] },
  { group: 'Months',  tfs: ['1M', '3M', '6M', '12M'] },
];

const WATCHLIST_DEFAULTS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', exchange: 'BINANCE' },
  { symbol: 'ETHUSDT', name: 'Ethereum', exchange: 'BINANCE' },
  { symbol: 'SOLUSDT', name: 'Solana', exchange: 'BINANCE' },
  { symbol: 'BNBUSDT', name: 'BNB', exchange: 'BINANCE' },
  { symbol: 'XRPUSDT', name: 'Ripple', exchange: 'BINANCE' },
  { symbol: 'ADAUSDT', name: 'Cardano', exchange: 'BINANCE' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', exchange: 'BINANCE' },
  { symbol: 'MATICUSDT', name: 'Polygon', exchange: 'BINANCE' },
];

export default function TopBar() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang, t } = useLanguage();
  const {
    symbol, timeframe, setSymbol, setTimeframe,
    showSignals, toggleSignals, activeIndicators, openIndicatorModal,
  } = useChartStore();
  const { priceData } = useMarketPrice(symbol);
  // openIndicatorModal via chartStore

  const [showSymSearch, setShowSymSearch] = useState(false);
  const [showTFDropdown, setShowTFDropdown] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const symWrapRef = useRef<HTMLDivElement>(null);
  const tfWrapRef = useRef<HTMLDivElement>(null);

  const price  = priceData?.price ?? 0;
  const change = priceData?.change24h ?? 0;
  const isUp   = change >= 0;

  // Search symbols
  useEffect(() => {
    if (!showSymSearch) return;
    if (searchVal.length < 1) {
      setSearchResults(WATCHLIST_DEFAULTS);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(searchVal)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {
        const filtered = WATCHLIST_DEFAULTS.filter(s =>
          s.symbol.toLowerCase().includes(searchVal.toLowerCase())
        );
        setSearchResults(filtered);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [searchVal, showSymSearch]);

  // Focus search on open
  useEffect(() => {
    if (showSymSearch && searchRef.current) {
      setSearchResults(WATCHLIST_DEFAULTS);
      searchRef.current.focus();
    }
  }, [showSymSearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (symWrapRef.current && !symWrapRef.current.contains(e.target as Node)) {
        setShowSymSearch(false);
        setSearchVal('');
      }
      if (tfWrapRef.current && !tfWrapRef.current.contains(e.target as Node)) {
        setShowTFDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectSymbol = (sym: string) => {
    setSymbol(sym);
    setShowSymSearch(false);
    setSearchVal('');
  };

  const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  return (
    <header className="topbar">
      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="topbar-logo">
        <span className="logo-symbol">▲</span>
        <span className="logo-text">ATLAS</span>
      </div>

      {/* ── Symbol Selector ───────────────────────────────── */}
      <div className="topbar-symbol-wrap" ref={symWrapRef} style={{ position: 'relative' }}>
        <button
          className="topbar-symbol-btn"
          onClick={() => setShowSymSearch(v => !v)}
        >
          <span className="sym-exchange">BINANCE</span>
          <span className="sym-name">{symbol}</span>
          <ChevronDown size={11} style={{ opacity: 0.6 }} />
        </button>

        {/* Price info */}
        <div className="topbar-price-info">
          <span className="tp-price mono">{price > 0 ? fmt(price) : '—'}</span>
          {change !== 0 && (
            <span className={`tp-change ${isUp ? 'up' : 'down'}`}>
              {isUp ? '+' : ''}{change.toFixed(2)}%
            </span>
          )}
        </div>

        {/* Symbol Search Panel */}
        {showSymSearch && (
          <div className="symbol-search-panel">
            <div className="sym-search-header">
              <Search size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
              <input
                ref={searchRef}
                className="sym-search-input"
                placeholder={lang === 'id' ? 'Cari simbol...' : 'Search symbol...'}
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
              />
              <button
                className="sym-search-close"
                onClick={() => { setShowSymSearch(false); setSearchVal(''); }}
              >
                <X size={13} />
              </button>
            </div>
            <div className="sym-list">
              {searchResults.map(s => (
                <div
                  key={s.symbol}
                  className={`sym-list-item ${s.symbol === symbol ? 'active' : ''}`}
                  onClick={() => selectSymbol(s.symbol)}
                >
                  <div className="sym-item-left">
                    <span className="sym-item-sym">{s.symbol}</span>
                    <span className="sym-item-name">{s.name || s.baseAsset || ''}</span>
                  </div>
                  <div className="sym-item-right">
                    {s.price && (
                      <div className="sym-item-price">{Number(s.price).toLocaleString()}</div>
                    )}
                    {s.change24h != null && (
                      <div className={`sym-item-change ${s.change24h >= 0 ? 'up' : 'down'}`}>
                        {s.change24h >= 0 ? '+' : ''}{Number(s.change24h).toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && searchVal.length > 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--tv-text2)', fontSize: 11 }}>
                  {lang === 'id' ? 'Tidak ditemukan' : 'No results'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="topbar-sep" />

      {/* ── Timeframe ─────────────────────────────────────── */}
      <div className="topbar-tf-wrap" ref={tfWrapRef} style={{ position: 'relative' }}>
        <div className="tf-quick-btns">
          {QUICK_TFS.map(tf => (
            <button
              key={tf}
              className={`tf-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
          <button
            className={`tf-btn tf-more ${showTFDropdown ? 'active' : ''}`}
            onClick={() => setShowTFDropdown(v => !v)}
          >
            ···
          </button>
        </div>

        {showTFDropdown && (
          <div className="tf-dropdown">
            {TF_GROUPS.map(g => (
              <div key={g.group}>
                <div className="tf-group-label">{g.group}</div>
                <div className="tf-group-items">
                  {g.tfs.map(tf => (
                    <button
                      key={tf}
                      className={`tf-dropdown-btn ${timeframe === tf ? 'active' : ''}`}
                      onClick={() => { setTimeframe(tf); setShowTFDropdown(false); }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-sep" />

      {/* ── Action Buttons ────────────────────────────────── */}
      <div className="topbar-actions">
        <button
          className={`topbar-action-btn ${activeIndicators.length > 0 ? '' : ''}`}
          onClick={() => openIndicatorModal()}
          title={lang === 'id' ? 'Indikator' : 'Indicators'}
        >
          <Layers size={13} />
          <span>{lang === 'id' ? 'Indikator' : 'Indicators'}</span>
        </button>

        <button className="topbar-action-btn" title={lang === 'id' ? 'Bandingkan' : 'Compare'}>
          <GitCompareIcon size={13} />
          <span>{lang === 'id' ? 'Bandingkan' : 'Compare'}</span>
        </button>

        <button
          className={`topbar-action-btn ${showSignals ? 'active' : ''}`}
          title={lang === 'id' ? 'Sinyal' : 'Signals'}
          onClick={toggleSignals}
        >
          <Bell size={13} />
          <span>{lang === 'id' ? 'Sinyal' : 'Signals'}</span>
        </button>

        <button className="topbar-action-btn icon-only" title="Snapshot">
          <Camera size={13} />
        </button>

        <button className="topbar-action-btn icon-only" title={lang === 'id' ? 'Putar Ulang' : 'Replay'}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* ── Spacer ────────────────────────────────────────── */}
      <div style={{ flex: 1 }} />

      {/* ── Right Controls ────────────────────────────────── */}
      <div className="topbar-right">
        <button className="topbar-right-btn" title={lang === 'id' ? 'Tata Letak' : 'Layout'}>
          <Grid size={14} />
        </button>
        <button className="topbar-right-btn" title={lang === 'id' ? 'Pantauan' : 'Watchlist'}>
          <Star size={14} />
        </button>

        <div className="topbar-sep" />

        <button
          className="topbar-lang-btn"
          onClick={toggleLang}
          title={lang === 'id' ? 'Language' : 'Bahasa'}
        >
          <Globe size={12} />
          <span>{lang.toUpperCase()}</span>
        </button>

        <button
          className="topbar-theme-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>

        <a
          href="/settings"
          className="topbar-right-btn"
          title={lang === 'id' ? 'Pengaturan' : 'Settings'}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'inherit' }}
        >
          <Settings size={14} />
        </a>
      </div>
    </header>
  );
}
