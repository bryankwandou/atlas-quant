'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X, Layers, Bell, Camera, Sun, Moon, Globe, Settings, LogOut, Zap } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useChartStore } from '@/store/chartStore';
import { useMarketPrice, useMarketData } from '@/hooks/useMarketData';
import { clearSession } from '@/lib/atlas-auth';
import { TZ_ZONES, tzCity, tzOffset } from '@/lib/timezones';
import PineEditor from '@/components/PineEditor';

interface ChartTemplate { id: string; name: string; chartType: string; activeIndicators: string[]; subPanels: string[]; }
interface PriceAlert { id: string; symbol: string; price: number; dir: 'above' | 'below'; }

// ── Inline SVG icons matching ATLAS-QUANT DARURAT HUKUM icon set ──────────────
const IconAtlas = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 19L12 5L20 19H16L12 12L8 19H4Z" fill="currentColor"/>
    <circle cx="12" cy="19" r="1.4" fill="currentColor"/>
  </svg>
);
const IconCompare = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12 L12 5 L19 12"/>
    <path d="M5 19 L12 12 L19 19"/>
    <line x1="12" y1="5" x2="12" y2="19"/>
  </svg>
);
const IconReplay = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" opacity={0.8}/>
  </svg>
);
const IconTemplate = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
    <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    <line x1="2" y1="9" x2="8" y2="9"/>
    <line x1="16" y1="9" x2="22" y2="9"/>
  </svg>
);
const IconPineScript = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);
const IconPublish = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);
const IconSplit2 = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="9" height="20" rx="1"/>
    <rect x="13" y="2" width="9" height="20" rx="1"/>
  </svg>
);
const IconFullscreen = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
  </svg>
);
const IconKeyboard = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="6" y1="9" x2="6.01" y2="9"/>
    <line x1="10" y1="9" x2="10.01" y2="9"/>
    <line x1="14" y1="9" x2="14.01" y2="9"/>
    <line x1="18" y1="9" x2="18.01" y2="9"/>
    <line x1="8" y1="13" x2="8.01" y2="13"/>
    <line x1="12" y1="13" x2="16" y2="13"/>
    <line x1="6" y1="13" x2="6.01" y2="13"/>
  </svg>
);

// ── Config matching ATLAS-QUANT DARURAT HUKUM dashboard-config.js ─────────────
const QUICK_TFS = ['1s', '15s', '30s', '45s', '1m', '5m', '15m', '1h', '4h', '1d'];
const TF_GROUPS = [
  { g: 'seconds', tfs: ['1s', '5s', '10s', '15s', '30s', '45s'] },
  { g: 'minutes', tfs: ['1m', '2m', '3m', '5m', '10m', '15m', '30m', '45m'] },
  { g: 'hours',   tfs: ['1h', '2h', '4h', '8h', '12h', '18h'] },
  { g: 'days',    tfs: ['1d', '2d', '3d', '5d'] },
  { g: 'weeks',   tfs: ['1w', '2w', '3w'] },
  { g: 'months',  tfs: ['1M', '3M', '6M', '12M'] },
];

const WATCHLIST_DEFAULTS = [
  { symbol: 'BTCUSDT',  name: 'Bitcoin',  exchange: 'BINANCE' },
  { symbol: 'ETHUSDT',  name: 'Ethereum', exchange: 'BINANCE' },
  { symbol: 'SOLUSDT',  name: 'Solana',   exchange: 'BINANCE' },
  { symbol: 'BNBUSDT',  name: 'BNB',      exchange: 'BINANCE' },
  { symbol: 'XRPUSDT',  name: 'Ripple',   exchange: 'BINANCE' },
  { symbol: 'ADAUSDT',  name: 'Cardano',  exchange: 'BINANCE' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', exchange: 'BINANCE' },
];

export default function TopBar() {
  const { theme, toggle: toggleTheme } = useTheme();
  const { lang, toggle: toggleLang } = useLanguage();
  const {
    symbol, timeframe, setSymbol, setTimeframe,
    activeIndicators, openIndicatorModal, setActiveIndicators,
    chartType, setChartType, subPanels, setSubPanels,
    superRefresh, toggleSuperRefresh,
    timezone, setTimezone,
    compareSymbols, addCompareSymbol, removeCompareSymbol,
    replayActive, setReplayActive,
  } = useChartStore();
  const { priceData } = useMarketPrice(symbol);
  // SINGLE SOURCE OF TRUTH: header price = last chart candle's close (same feed as
  // the chart + right panel), so the three never disagree. Ticker is only a fallback.
  const { candles } = useMarketData(symbol, timeframe);

  const [showSym, setShowSym]         = useState(false);
  const [showTF, setShowTF]           = useState(false);
  const [showTZ, setShowTZ]           = useState(false);
  const [showTpl, setShowTpl]         = useState(false);
  const [showAlerts, setShowAlerts]   = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [compareInput, setCompareInput] = useState('');
  const [showPine, setShowPine]       = useState(false);
  const [search, setSearch]           = useState('');
  const [searchResults, setResults]   = useState<any[]>(WATCHLIST_DEFAULTS);
  const [toast, setToast]             = useState('');
  const [templates, setTemplates]     = useState<ChartTemplate[]>([]);
  const [alerts, setAlerts]           = useState<PriceAlert[]>([]);
  const [alertPrice, setAlertPrice]   = useState('');
  const searchRef  = useRef<HTMLInputElement>(null);
  const symRef     = useRef<HTMLDivElement>(null);
  const tfRef      = useRef<HTMLDivElement>(null);
  const tzRef      = useRef<HTMLDivElement>(null);
  const tplRef     = useRef<HTMLDivElement>(null);
  const alertRef   = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2600);
  };

  // Load saved templates + alerts from localStorage once
  useEffect(() => {
    try { setTemplates(JSON.parse(localStorage.getItem('atlas_templates') || '[]')); } catch {}
    try { setAlerts(JSON.parse(localStorage.getItem('atlas_alerts') || '[]')); } catch {}
  }, []);

  const persistTemplates = (next: ChartTemplate[]) => {
    setTemplates(next);
    try { localStorage.setItem('atlas_templates', JSON.stringify(next)); } catch {}
  };
  const persistAlerts = (next: PriceAlert[]) => {
    setAlerts(next);
    try { localStorage.setItem('atlas_alerts', JSON.stringify(next)); } catch {}
  };

  const saveTemplate = () => {
    const name = `${symbol} · ${timeframe} · ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    const tpl: ChartTemplate = { id: `tpl_${Date.now()}`, name, chartType, activeIndicators: [...activeIndicators], subPanels: [...subPanels] };
    persistTemplates([tpl, ...templates].slice(0, 20));
    flash(tl('Template tersimpan', 'Template saved'));
  };
  const applyTemplate = (t: ChartTemplate) => {
    setChartType(t.chartType);
    setActiveIndicators(t.activeIndicators);
    setSubPanels(t.subPanels);
    setShowTpl(false);
    flash(tl(`Terapkan: ${t.name}`, `Applied: ${t.name}`));
  };
  const deleteTemplate = (id: string) => persistTemplates(templates.filter(t => t.id !== id));

  const addAlert = () => {
    const p = parseFloat(alertPrice);
    if (!Number.isFinite(p) || p <= 0) { flash(tl('Harga tidak valid', 'Invalid price')); return; }
    const a: PriceAlert = { id: `al_${Date.now()}`, symbol, price: p, dir: p >= price ? 'above' : 'below' };
    persistAlerts([a, ...alerts]);
    setAlertPrice('');
    flash(tl(`Alarm ${a.dir === 'above' ? '≥' : '≤'} ${p} dibuat`, `Alert ${a.dir === 'above' ? '≥' : '≤'} ${p} set`));
  };
  const deleteAlert = (id: string) => persistAlerts(alerts.filter(a => a.id !== id));

  const addCompare = (s: string) => {
    const sym = s.trim().toUpperCase();
    if (!sym || sym === symbol) return;
    addCompareSymbol(sym);
    setCompareInput('');
    flash(tl(`Bandingkan: ${sym}`, `Compare: ${sym}`));
  };

  const lastC  = candles?.length ? candles[candles.length - 1] : null;
  const prevC  = candles?.length > 1 ? candles[candles.length - 2] : null;
  const barChg = lastC && prevC && prevC.close ? ((lastC.close - prevC.close) / prevC.close) * 100 : null;
  const price  = lastC?.close ?? priceData?.price ?? 0;
  const change = barChg ?? priceData?.change24h ?? 0;
  const isUp   = change >= 0;

  // Auto-focus search input when panel opens
  useEffect(() => {
    if (showSym && searchRef.current) {
      setResults(WATCHLIST_DEFAULTS);
      searchRef.current.focus();
    }
  }, [showSym]);

  // Debounced symbol search
  useEffect(() => {
    if (!showSym) return;
    if (search.length < 1) { setResults(WATCHLIST_DEFAULTS); return; }
    const id = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/market/search?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults(WATCHLIST_DEFAULTS.filter(s =>
          s.symbol.toLowerCase().includes(search.toLowerCase())
        ));
      }
    }, 250);
    return () => clearTimeout(id);
  }, [search, showSym]);

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (symRef.current && !symRef.current.contains(e.target as Node)) {
        setShowSym(false); setSearch('');
      }
      if (tfRef.current && !tfRef.current.contains(e.target as Node)) {
        setShowTF(false);
      }
      if (tzRef.current && !tzRef.current.contains(e.target as Node)) {
        setShowTZ(false);
      }
      if (tplRef.current && !tplRef.current.contains(e.target as Node)) {
        setShowTpl(false);
      }
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
      if (compareRef.current && !compareRef.current.contains(e.target as Node)) {
        setShowCompare(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Fire price alerts when the live price crosses a target, then clear them.
  useEffect(() => {
    if (!price || !alerts.length) return;
    const hit = alerts.filter(a => a.symbol === symbol &&
      (a.dir === 'above' ? price >= a.price : price <= a.price));
    if (!hit.length) return;
    for (const a of hit) {
      flash(`🔔 ${a.symbol} ${a.dir === 'above' ? '≥' : '≤'} ${a.price} (${fmt(price)})`);
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('ATLAS-QUANT', { body: `${a.symbol} ${a.dir === 'above' ? '≥' : '≤'} ${a.price}` });
        }
      } catch {}
    }
    persistAlerts(alerts.filter(a => !hit.includes(a)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, alerts, symbol]);

  const selectSym = (s: string) => { setSymbol(s); setShowSym(false); setSearch(''); };
  const fmt = (v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });

  const tl = (id: string, en: string) => lang === 'id' ? id : en;

  return (
    <header className="topbar">

      {/* ── Logo ── */}
      <div className="topbar-logo">
        <span className="logo-symbol"><IconAtlas size={18} /></span>
        <span className="logo-text">ATLAS·QUANT</span>
      </div>
      <div className="tv-sep" />

      {/* ── Symbol Picker ── */}
      <div style={{ position: 'relative' }} ref={symRef}>
        <button
          className="topbar-sym-btn topbar-sym-btn-prominent"
          onClick={() => setShowSym(v => !v)}
        >
          <Search size={11} style={{ opacity: 0.7, marginRight: 2 }} />
          <span className="sym-exch">BINANCE</span>
          <span className="sym-tick">{symbol}</span>
          <ChevronDown size={11} style={{ opacity: 0.5, marginLeft: 2 }} />
        </button>

        {showSym && (
          <div className="sym-search-panel">
            <div className="sym-search-hdr">
              <Search size={13} style={{ opacity: 0.5 }} />
              <input
                ref={searchRef}
                placeholder={tl('Cari simbol...', 'Search symbol...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <button onClick={() => { setShowSym(false); setSearch(''); }}>
                <X size={13} />
              </button>
            </div>
            <div className="sym-list">
              {searchResults.map(s => (
                <div
                  key={s.symbol}
                  className={`sym-item ${s.symbol === symbol ? 'active' : ''}`}
                  onClick={() => selectSym(s.symbol)}
                >
                  <div className="sym-item-l">
                    <span className="si-sym">{s.symbol}</span>
                    <span className="si-name">{s.name || s.baseAsset || ''}</span>
                  </div>
                  <div className="sym-item-r">
                    {s.price != null && (
                      <span className="si-price mono">
                        {Number(s.price).toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </span>
                    )}
                    {s.change24h != null && (
                      <span className={`si-chg ${s.change24h >= 0 ? 'up' : 'down'}`}>
                        {s.change24h >= 0 ? '+' : ''}{Number(s.change24h).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {searchResults.length === 0 && (
                <div style={{ padding: '12px 14px', color: 'var(--aq-text2)', fontSize: 11 }}>
                  {tl('Tidak ditemukan', 'No results')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Live Price ── */}
      <div className="topbar-price-wrap">
        <span className={`tp-price ${isUp ? 'up' : 'down'}`}>
          {price > 0 ? fmt(price) : '—'}
        </span>
        {change !== 0 && (
          <span className={`tp-chg ${isUp ? 'up' : 'down'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
      </div>
      <div className="tv-sep" />

      {/* ── Timeframe Picker ── */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} ref={tfRef}>
        <div className="tf-wrap">
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
            className={`tf-btn tf-more ${showTF ? 'active' : ''}`}
            onClick={() => setShowTF(v => !v)}
          >
            ···
          </button>
        </div>

        {showTF && (
          <div className="tf-dropdown">
            {TF_GROUPS.map(({ g, tfs }) => (
              <div key={g}>
                <div className="tf-grp-label">{g}</div>
                <div className="tf-grp-items">
                  {tfs.map(tf => (
                    <button
                      key={tf}
                      className={`tf-drop-btn ${timeframe === tf ? 'active' : ''}`}
                      onClick={() => { setTimeframe(tf); setShowTF(false); }}
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
      <div className="tv-sep" />

      {/* ── Action Buttons ── */}
      <button
        className="tb-action tb-action-primary"
        title={tl('Indikator', 'Indicators')}
        onClick={() => openIndicatorModal()}
      >
        <span style={{ marginRight: 2, fontSize: 13, fontWeight: 700 }}>+</span>
        <Layers size={13} />
        <span>{tl('Indikator', 'Indicators')}</span>
      </button>

      {/* ── Compare — overlay other symbols as normalized % lines ── */}
      <div style={{ position: 'relative' }} ref={compareRef}>
        <button
          className={`tb-action${compareSymbols.length ? ' tb-action-on' : ''}`}
          title={tl('Bandingkan simbol', 'Compare symbol')}
          onClick={() => setShowCompare(v => !v)}
        >
          <IconCompare size={13} />
          <span>{tl('Bandingkan', 'Compare')}{compareSymbols.length ? ` (${compareSymbols.length})` : ''}</span>
        </button>
        {showCompare && (
          <div className="tb-compare-menu">
            <input
              className="tb-compare-input"
              placeholder={tl('Simbol (mis. ETHUSDT) + Enter', 'Symbol (e.g. ETHUSDT) + Enter')}
              value={compareInput}
              onChange={e => setCompareInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addCompare(compareInput); }}
            />
            {compareSymbols.map(cs => (
              <button key={cs} type="button" className="tb-compare-item on" onClick={() => removeCompareSymbol(cs)}>
                <span>✓ {cs}</span><X size={11} />
              </button>
            ))}
            {WATCHLIST_DEFAULTS.filter(w => w.symbol !== symbol && !compareSymbols.includes(w.symbol)).map(w => (
              <button key={w.symbol} type="button" className="tb-compare-item" onClick={() => addCompare(w.symbol)}>
                <span>{w.symbol}</span><span style={{ color: 'var(--aq-text2)', fontSize: 10 }}>{w.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Alerts (Peringatan) — real price alerts (localStorage) ── */}
      <div style={{ position: 'relative' }} ref={alertRef}>
        <button
          className={`tb-action${alerts.length ? ' tb-action-on' : ''}`}
          title={tl('Peringatan harga', 'Price alerts')}
          onClick={() => { setShowAlerts(v => !v); try { Notification?.requestPermission?.(); } catch {} }}
        >
          <Bell size={13} />
          <span>{tl('Peringatan', 'Alerts')}{alerts.length ? ` (${alerts.length})` : ''}</span>
        </button>
        {showAlerts && (
          <div className="tb-menu tb-menu-wide">
            <div className="tb-menu-head">{tl('Alarm harga', 'Price alerts')} · {symbol}</div>
            <div className="tb-alert-add">
              <input
                className="tb-alert-input"
                type="number"
                inputMode="decimal"
                placeholder={tl(`Harga (skrg ${fmt(price)})`, `Price (now ${fmt(price)})`)}
                value={alertPrice}
                onChange={e => setAlertPrice(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addAlert(); }}
              />
              <button type="button" className="tb-alert-add-btn" onClick={addAlert}>+ {tl('Tambah', 'Add')}</button>
            </div>
            {alerts.filter(a => a.symbol === symbol).length === 0 && (
              <div className="tb-menu-empty">{tl('Belum ada alarm', 'No alerts yet')}</div>
            )}
            {alerts.filter(a => a.symbol === symbol).map(a => (
              <div key={a.id} className="tb-menu-row">
                <span className={`tb-alert-dir ${a.dir}`}>{a.dir === 'above' ? '▲ ≥' : '▼ ≤'}</span>
                <span className="tb-alert-px">{fmt(a.price)}</span>
                <button type="button" className="tb-menu-del" onClick={() => deleteAlert(a.id)} title="Delete"><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className={`tb-action${replayActive ? ' tb-action-on' : ''}`}
        title={tl('Replay bar — putar ulang riwayat', 'Bar replay — step through history')}
        onClick={() => { setReplayActive(!replayActive); if (!replayActive) flash(tl('Mode Replay aktif', 'Replay mode on')); }}
      >
        <IconReplay size={13} />
        <span>Replay</span>
      </button>

      {/* ── Template — save / apply current chart layout (localStorage) ── */}
      <div style={{ position: 'relative' }} ref={tplRef}>
        <button className="tb-action" title={tl('Simpan / muat layout', 'Save / load layout')} onClick={() => setShowTpl(v => !v)}>
          <IconTemplate size={13} />
          <span>Template</span>
        </button>
        {showTpl && (
          <div className="tb-menu tb-menu-wide">
            <button type="button" className="tb-menu-save" onClick={saveTemplate}>
              💾 {tl('Simpan layout saat ini', 'Save current layout')}
            </button>
            {templates.length === 0 && (
              <div className="tb-menu-empty">{tl('Belum ada template', 'No templates yet')}</div>
            )}
            {templates.map(t => (
              <div key={t.id} className="tb-menu-row">
                <button type="button" className="tb-menu-apply" onClick={() => applyTemplate(t)} title={tl('Terapkan', 'Apply')}>
                  {t.name}
                </button>
                <button type="button" className="tb-menu-del" onClick={() => deleteTemplate(t.id)} title="Delete"><X size={11} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        className="tb-action"
        title={tl('Pine-lite editor', 'Pine-lite editor')}
        onClick={() => setShowPine(true)}
      >
        <IconPineScript size={13} />
        <span>Pine Script</span>
      </button>

      <div className="tv-sep" />

      <button className="tb-action icon-only" title="Screenshot">
        <Camera size={14} />
      </button>
      <button className="tb-action icon-only" title="Publish">
        <IconPublish size={14} />
      </button>

      {/* ── Spacer ── */}
      <div style={{ flex: 1 }} />

      {/* ── Right Controls ── */}
      <div className="topbar-right">
        <button className="tb-right-btn" title="Multi-chart layout">
          <IconSplit2 size={15} />
        </button>
        <button className="tb-right-btn" title="Full screen">
          <IconFullscreen size={15} />
        </button>
        <button className="tb-right-btn" title="Keyboard Shortcuts">
          <IconKeyboard size={15} />
        </button>

        <button
          className={`tb-right-btn${superRefresh ? ' tb-super-refresh-active' : ''}`}
          title={superRefresh ? 'Super Refresh ON — 1s update (klik untuk mati)' : 'Super Refresh OFF — klik untuk update 1s'}
          onClick={toggleSuperRefresh}
        >
          <Zap size={14} />
          {superRefresh && <span className="tb-sr-label">1s</span>}
        </button>

        {/* ── Timezone Selector ── */}
        <div style={{ position: 'relative' }} ref={tzRef}>
          <button
            className="tb-lang-btn"
            title="Timezone / UTC offset"
            onClick={() => setShowTZ(v => !v)}
            style={{ gap: 3, minWidth: 56 }}
          >
            <Globe size={11} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>
              {tzOffset(timezone || 'local')}
            </span>
          </button>
          {showTZ && (
            <div className="tb-tz-menu">
              {TZ_ZONES.map(z => {
                const active = (timezone || 'local') === z;
                return (
                  <button
                    key={z}
                    type="button"
                    className={`tb-tz-item${active ? ' active' : ''}`}
                    onClick={() => { setTimezone(z); setShowTZ(false); }}
                  >
                    <span className="tb-tz-off">{tzOffset(z)}</span>
                    <span className="tb-tz-city">{tzCity(z)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="tv-sep" />

        <button className="tb-lang-btn" onClick={toggleLang}>
          <Globe size={12} />
          <span>{lang === 'id' ? 'ID' : 'EN'}</span>
        </button>

        <button className="tb-theme-btn" onClick={toggleTheme} title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <button
          className="tb-right-btn"
          title={tl('Pengaturan', 'Settings')}
          onClick={() => window.location.href = '/settings'}
        >
          <Settings size={15} />
        </button>

        <div className="tv-sep" />

        <button
          className="tb-right-btn"
          title={tl('Keluar', 'Sign Out')}
          onClick={() => { clearSession(); window.location.replace('/login'); }}
        >
          <LogOut size={14} />
        </button>
      </div>

      {toast && <div className="tb-toast">{toast}</div>}
      <PineEditor open={showPine} onClose={() => setShowPine(false)} />
    </header>
  );
}
