'use client';
/**
 * Faithful port of RightPanel.jsx — tabs Signal/Watchlist/AI/Risk.
 * Data dipasok dari /api/quant/t1mo + local brain.
 */
import { useEffect, useState } from 'react';
import type { Asset } from '@/domain/asset';

export interface RightPanelProps {
  symbol: string;
  symbolName?: string;
  price: number;
  changePct: number;
  exchange?: string;
  assetClass?: string;
  lang: 'id' | 'en';
  signal?: {
    type: 'BUY' | 'SELL' | 'NEUTRAL';
    confidence: number;
    strategy?: string;
    entry?: number;
    tp1?: number; tp2?: number; tp3?: number; sl?: number;
    rr?: number;
    atr?: number;
    regimeLabel?: string;
    regimeColor?: string;
    indicators?: Record<string, number | undefined>;
    supports?: number[];
    resistances?: number[];
  };
  brain?: {
    regime: string;
    regimeConfidence: number;
    signalScore: number;
    commentary: string;
    validity: string;
    model: string;
    provider: string;
  };
  onSymbol: (s: string) => void;
}

type Tab = 'signal' | 'watchlist' | 'ai' | 'risk';

const T = {
  id: { signal: 'Sinyal', watchlist: 'Watchlist', ai: 'AI', risk: 'Risk', buy: 'BELI', sell: 'JUAL', neutral: 'NETRAL', confidence: 'keyakinan', entry: 'Entry', sl: 'SL', regime: 'Regime', support: 'Support', resistance: 'Resistance', indicators: 'Indikator', manualOnly: 'Eksekusi manual — tidak ada auto trade.', tradeAllowed: 'Trade Diizinkan', killSwitch: 'Kill Switch' },
  en: { signal: 'Signal', watchlist: 'Watchlist', ai: 'AI', risk: 'Risk', buy: 'BUY', sell: 'SELL', neutral: 'NEUTRAL', confidence: 'confidence', entry: 'Entry', sl: 'SL', regime: 'Regime', support: 'Support', resistance: 'Resistance', indicators: 'Indicators', manualOnly: 'Manual execution only — no auto trading.', tradeAllowed: 'Trade Allowed', killSwitch: 'Kill Switch' },
};

const fmt = (v: number | null | undefined, d = 2): string =>
  v != null && Number.isFinite(v) ? Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';
const fmtPct = (v: number | null | undefined): string =>
  v != null && Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—';

export default function RightPanel(props: RightPanelProps) {
  const t = T[props.lang];
  const [tab, setTab] = useState<Tab>('signal');
  const [watchlist, setWatchlist] = useState<Asset[]>([]);
  const [wlFilter, setWlFilter] = useState('crypto');

  useEffect(() => {
    fetch(`/api/market/symbols?class=${wlFilter}&limit=30`)
      .then((r) => r.json())
      .then((d) => setWatchlist(d.results ?? []))
      .catch(() => setWatchlist([]));
  }, [wlFilter]);

  const sig = props.signal;
  const brain = props.brain;
  const isUp = props.changePct >= 0;

  return (
    <div className="right-panel">
      {/* Symbol Header */}
      <div className="rp-sym-hdr">
        <div>
          <div className="rp-sym-name">{props.symbol}</div>
          <div className="rp-sym-full">{props.symbolName || props.symbol}</div>
          <div className="rp-sym-exch">{props.exchange || 'BINANCE'} · {props.assetClass || 'crypto'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={`rp-price ${isUp ? 'up' : 'down'}`}>{fmt(props.price, props.price > 1000 ? 2 : props.price > 10 ? 3 : 4)}</div>
          <div className={`rp-change ${isUp ? 'up' : 'down'}`}>{fmtPct(props.changePct)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rp-tabs">
        {(['signal', 'watchlist', 'ai', 'risk'] as Tab[]).map((id) => (
          <button key={id} className={`rp-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <span className="rp-tab-icon">{id === 'signal' ? '⚡' : id === 'watchlist' ? '👁' : id === 'ai' ? '🤖' : '🛡'}</span>
            <span>{t[id]}</span>
          </button>
        ))}
      </div>

      <div className="rp-content">
        {tab === 'signal' && (
          <>
            <div className={`signal-badge ${sig?.type?.toLowerCase() || 'neutral'}`}>
              <div className="sig-badge-type">{sig?.type === 'BUY' ? t.buy : sig?.type === 'SELL' ? t.sell : t.neutral}</div>
              <div className="sig-badge-conf">{sig ? `${sig.confidence.toFixed(0)}% ${t.confidence}` : '—'}</div>
            </div>

            {sig?.strategy && (
              <div className="sig-strategy-row">
                <span className="sig-strat-label">Strategy</span>
                <span>{sig.strategy.replace(/_/g, ' ')}</span>
              </div>
            )}

            {sig && sig.type !== 'NEUTRAL' && (
              <div className="sig-levels">
                {[
                  { label: t.entry, val: sig.entry, cls: '' },
                  { label: 'TP1', val: sig.tp1, cls: 'tp-val' },
                  { label: 'TP2', val: sig.tp2, cls: 'tp-val' },
                  { label: 'TP3', val: sig.tp3, cls: 'tp-val' },
                  { label: t.sl, val: sig.sl, cls: 'sl-val' },
                ].map((row) => (
                  <div key={row.label} className="sig-level-row">
                    <span className="sig-level-label">{row.label}</span>
                    <span className={`mono ${row.cls}`}>{fmt(row.val, 4)}</span>
                  </div>
                ))}
                {sig.rr != null && (
                  <div className="sig-level-row">
                    <span className="sig-level-label">R:R</span>
                    <span className="mono">{sig.rr.toFixed(2)}:1</span>
                  </div>
                )}
                {sig.atr != null && (
                  <div className="sig-level-row">
                    <span className="sig-level-label">ATR</span>
                    <span className="mono">{fmt(sig.atr, 4)}</span>
                  </div>
                )}
              </div>
            )}

            {sig?.regimeLabel && (
              <div className="sig-regime-row">
                <div className="sig-regime-label">{t.regime}</div>
                <div className="sig-regime-badge" style={{ background: `${sig.regimeColor || '#2962ff'}22`, color: sig.regimeColor || '#2962ff', borderColor: `${sig.regimeColor || '#2962ff'}44` }}>
                  <span className="regime-dot" style={{ background: sig.regimeColor || '#2962ff' }} />
                  {sig.regimeLabel}
                </div>
              </div>
            )}

            {(sig?.supports?.length || sig?.resistances?.length) && (
              <div>
                <div className="sig-section-title"><span>{t.support}</span><span>{t.resistance}</span></div>
                <div className="sig-sr-table">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="sig-sr-row">
                      <span className="sr-rank">{i + 1}</span>
                      <span className="mono up" style={{ flex: 1 }}>{sig?.supports?.[i] != null ? fmt(sig.supports[i]) : '—'}</span>
                      <span className="mono down" style={{ flex: 1, textAlign: 'right' }}>{sig?.resistances?.[i] != null ? fmt(sig.resistances[i]) : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sig?.indicators && (
              <div>
                <div className="sig-section-title" style={{ marginTop: 4 }}>{t.indicators}</div>
                <div className="sig-ind-table">
                  {Object.entries(sig.indicators).map(([k, v]) => (
                    <div key={k} className="sig-ind-row">
                      <span className="ind-row-label">{k}</span>
                      <span className="ind-row-val">{v != null ? Number(v).toFixed(2) : '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="sig-warning">⚠ {t.manualOnly}</div>
          </>
        )}

        {tab === 'watchlist' && (
          <>
            <div className="wl-search-wrap">
              <span style={{ opacity: 0.5 }}>🔍</span>
              <input placeholder="Filter…" />
              <select value={wlFilter} onChange={(e) => setWlFilter(e.target.value)} style={{ background: 'var(--tv-bg2)', border: '1px solid var(--tv-border)', borderRadius: 3, padding: '2px 4px', fontSize: 10 }}>
                <option value="crypto">Crypto</option>
                <option value="dex">DEX</option>
                <option value="stock">Stock</option>
                <option value="forex">Forex</option>
                <option value="index">Index</option>
                <option value="commodity">Commodity</option>
                <option value="etf">ETF</option>
              </select>
            </div>
            {watchlist.map((s) => (
              <div
                key={`${s.symbol}-${s.exchange}`}
                className={`wl-item ${s.symbol === props.symbol ? 'active' : ''}`}
                onClick={() => props.onSymbol(s.symbol)}
              >
                <div>
                  <div className="wl-sym">{s.symbol}</div>
                  <div className="wl-exch">{s.exchange}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="wl-price">{(s.priceUsd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}</div>
                  <div className="wl-change up">—</div>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'ai' && (
          <div className="rp-ai">
            <div className="ai-header">
              <div className="ai-model-badge">🤖 {brain?.model || 'aq-ensemble-v1'}</div>
              <span className="ai-status">● Live local-brain</span>
            </div>
            <div className="ai-message">
              <div className="ai-msg-label">ATLAS AI ({brain?.provider || 'local'})</div>
              <div className="ai-msg-content">{brain?.commentary || (props.lang === 'id' ? 'Memuat analisa AI lokal…' : 'Loading local AI inference…')}</div>
            </div>
            <div>
              {[
                { label: props.lang === 'id' ? 'Kekuatan Sinyal' : 'Signal Strength', val: Math.abs(brain?.signalScore || 0), color: '#089981' },
                { label: props.lang === 'id' ? 'Regime Confidence' : 'Regime Confidence', val: brain?.regimeConfidence || 0, color: '#2962ff' },
                { label: 'Validity', val: brain?.validity === 'strong' ? 90 : brain?.validity === 'moderate' ? 60 : brain?.validity === 'weak' ? 30 : 10, color: '#a855f7' },
              ].map((row) => (
                <div key={row.label} className="ai-score-row" style={{ marginBottom: 6 }}>
                  <span className="ai-score-label">{row.label}</span>
                  <div className="ai-score-bar-wrap">
                    <div className="ai-score-bar" style={{ width: `${Math.min(100, row.val)}%`, background: row.color }} />
                  </div>
                  <span className="ai-score-val">{row.val.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'risk' && (
          <div className="rp-risk">
            <div>
              <div className="risk-status-badge" style={{ background: 'rgba(8,153,129,.15)', color: 'var(--tv-up)', borderColor: 'rgba(8,153,129,.3)' }}>
                ✓ {t.tradeAllowed}
              </div>
            </div>
            <div className="risk-params">
              {[
                { icon: '📊', label: props.lang === 'id' ? 'Risiko/Trade' : 'Risk/Trade', val: '1.0%' },
                { icon: '🚫', label: props.lang === 'id' ? 'Maks Rugi/Hari' : 'Max Daily Loss', val: '5.0%' },
                { icon: '🎯', label: props.lang === 'id' ? 'Maks Trade' : 'Max Trades', val: '10' },
                { icon: '⏱', label: 'Cooldown', val: '30 min' },
                { icon: '⚖', label: 'Min R:R', val: '1.5:1' },
                { icon: '📉', label: 'Loss Streak', val: '3' },
              ].map((row) => (
                <div key={row.label} className="risk-param-row">
                  <span className="risk-param-icon">{row.icon}</span>
                  <span className="risk-param-label">{row.label}</span>
                  <span className="risk-param-val">{row.val}</span>
                </div>
              ))}
            </div>
            <div className="risk-today">
              <div className="risk-today-title">{props.lang === 'id' ? 'Hari Ini' : 'Today'}</div>
              <div className="risk-today-stats">
                {[
                  { label: 'Trades', val: '0' },
                  { label: 'PnL', val: '—' },
                  { label: 'Win', val: '0/0' },
                  { label: 'Win%', val: '—' },
                ].map((row) => (
                  <div key={row.label} className="risk-today-item">
                    <div className="risk-today-val">{row.val}</div>
                    <div className="risk-today-label">{row.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <button className="kill-switch-btn">🛑 {t.killSwitch}</button>
          </div>
        )}
      </div>
    </div>
  );
}
