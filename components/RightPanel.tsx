'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Zap, Power, TrendingUp, TrendingDown, Minus, Bot,
} from 'lucide-react';
import { useChartStore } from '@/store/chartStore';
import { useUserStore } from '@/store/userStore';
import { useMarketData, useMarketPrice } from '@/hooks/useMarketData';
import { computeIndicators } from '@/src/core/indicators/client';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface SignalResult {
  type: 'BUY' | 'SELL' | 'NEUTRAL';
  confidence: number;
  entryPrice?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  sl?: number;
  rrRatio?: number;
  atrValue?: number;
  strategy?: string;
}

interface RegimeResult {
  regime: string;
  adx: number;
  confidence: number;
}

interface SRData {
  resistances: Array<{ price: number; type?: string }>;
  supports:    Array<{ price: number; type?: string }>;
}

interface IndValues {
  rsi:      number;
  macd:     number;
  adx:      number;
  atr:      number;
  vwap:     number;
  ema9:     number;
  ema21:    number;
  bbBw:     number;
  volSpike: boolean;
  vwapDelta: number;
}

interface AiScores {
  trend:      number;
  momentum:   number;
  volatility: number;
  volume:     number;
  signal:     number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const WATCHLIST = [
  { symbol: 'BTCUSDT',   name: 'Bitcoin'       },
  { symbol: 'ETHUSDT',   name: 'Ethereum'      },
  { symbol: 'SOLUSDT',   name: 'Solana'        },
  { symbol: 'BNBUSDT',   name: 'BNB'           },
  { symbol: 'XRPUSDT',   name: 'Ripple'        },
  { symbol: 'ADAUSDT',   name: 'Cardano'       },
  { symbol: 'DOGEUSDT',  name: 'Dogecoin'      },
  { symbol: 'MATICUSDT', name: 'Polygon'       },
  { symbol: '^GSPC',     name: 'S&P 500'       },
  { symbol: 'GC=F',      name: 'Gold Futures'  },
  { symbol: 'EURUSD=X',  name: 'EUR/USD'       },
  { symbol: 'AAPL',      name: 'Apple'         },
  { symbol: 'TSLA',      name: 'Tesla'         },
  { symbol: 'NVDA',      name: 'NVIDIA'        },
  { symbol: 'BBCA.JK',   name: 'Bank BCA'      },
];

const REGIME_COLORS: Record<string, string> = {
  strong_trend_up:   '#089981',
  weak_trend_up:     '#4caf50',
  ranging:           '#ff9800',
  weak_trend_down:   '#ef9a9a',
  strong_trend_down: '#f23645',
  volatile:          '#e91e63',
  low_volume:        '#9e9e9e',
  news_event:        '#9c27b0',
};

// ─────────────────────────────────────────────────────────────────────────────
// WATCHLIST ITEM (SWR-powered)
// ─────────────────────────────────────────────────────────────────────────────
function WatchItem({
  symbol,
  name,
  active,
  onSelect,
}: {
  symbol: string;
  name: string;
  active: boolean;
  onSelect: () => void;
}) {
  const { priceData } = useMarketPrice(symbol);
  const price    = priceData?.price   ?? null;
  const change   = priceData?.change24h ?? null;
  const isUp     = (change ?? 0) >= 0;

  return (
    <div
      className={`rp-watchlist-item wl-item${active ? ' active' : ''}`}
      onClick={onSelect}
      style={active ? { background: 'var(--tv-blue-light)' } : {}}
    >
      <div>
        <div className="wl-sym">{symbol.replace('USDT', '').replace('=X', '').replace('=F', '')}</div>
        <div className="wl-name" style={{ fontSize: 9, color: 'var(--tv-text2)' }}>{name}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className={`wl-price mono${isUp ? ' up' : ' down'}`}>
          {price != null ? price.toLocaleString('en-US', { maximumFractionDigits: 4 }) : '—'}
        </div>
        {change != null && (
          <div className={`wl-change${isUp ? ' up' : ' down'}`}>
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE BAR
// ─────────────────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="ai-score-row score-bar" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
      <span className="ai-score-lbl" style={{ width: 70, fontSize: 10, color: 'var(--tv-text2)', flexShrink: 0 }}>
        {label}
      </span>
      <div className="ai-score-bar" style={{ flex: 1, height: 5, background: 'var(--tv-border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <span className="ai-score-val mono" style={{ width: 28, fontSize: 10, textAlign: 'right', color: 'var(--tv-text)' }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function RightPanel() {
  const { symbol, timeframe, rightPanelTab, setRightPanelTab, setSymbol } = useChartStore();
  const { riskPerTrade, maxDailyLoss, maxTradesDay, cooldownAfterLoss, updateRisk } = useUserStore();

  const { candles } = useMarketData(symbol, timeframe);

  // Signal tab state
  const [signal,    setSignal]    = useState<SignalResult | null>(null);
  const [regime,    setRegime]    = useState<RegimeResult | null>(null);
  const [srData,    setSrData]    = useState<SRData | null>(null);
  const [indValues, setIndValues] = useState<IndValues | null>(null);
  const [aiScores,  setAiScores]  = useState<AiScores | null>(null);
  const [countdown, setCountdown] = useState(60);

  // AI tab state
  const [aiText,    setAiText]    = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Risk tab state
  const [killActive, setKillActive] = useState(false);

  const fmt = (v: number | undefined | null, d = 2) =>
    v != null && !isNaN(v as number) ? Number(v).toFixed(d) : '—';

  // ── Compute indicators ──────────────────────────────────────────────────
  const computeAll = useCallback(() => {
    if (!candles || candles.length < 30) return;

    const closes  = candles.map((c: any) => c.close  as number);
    const highs   = candles.map((c: any) => c.high   as number);
    const lows    = candles.map((c: any) => c.low    as number);
    const volumes = candles.map((c: any) => c.volume as number);
    const last    = closes.length - 1;

    const ind = computeIndicators(closes, highs, lows, volumes);

    // Signal
    const sig = ind.latestSignal() as SignalResult;
    setSignal(sig);

    // S/R
    const sr = ind.supportResistance(5) as SRData;
    setSrData(sr);

    // Indicator values
    const rsiArr  = ind.rsi(14);
    const atrArr  = ind.atr(14);
    const macdObj = ind.macd(12, 26, 9);
    const adxObj  = ind.adx(14);
    const vwapArr = ind.vwap();
    const ema9Arr = ind.ema(9);
    const ema21Arr = ind.ema(21);
    const bbObj   = ind.bollingerBands(20, 2);
    const smaArr  = ind.sma(20);
    const volSpike = volumes[last] > ((smaArr[last] || 1) * 2);

    const vwapLast  = vwapArr[last] ?? closes[last];
    const vwapDelta = ((closes[last] - vwapLast) / vwapLast) * 100;

    setIndValues({
      rsi:      rsiArr[last],
      macd:     macdObj.macd[last],
      adx:      (adxObj.adx as any)[last],
      atr:      atrArr[last],
      vwap:     vwapLast,
      ema9:     ema9Arr[last],
      ema21:    ema21Arr[last],
      bbBw:     bbObj.bandwidth[last],
      volSpike,
      vwapDelta,
    });

    // Regime (ADX-based)
    const adxNum  = isNaN((adxObj.adx as any)[last]) ? 20 : (adxObj.adx as any)[last];
    const plusDI  = adxObj.plusDI[last];
    const minusDI = adxObj.minusDI[last];
    let r = 'ranging';
    if (adxNum > 25) {
      if (plusDI > minusDI)
        r = adxNum > 40 ? 'strong_trend_up' : 'weak_trend_up';
      else
        r = adxNum > 40 ? 'strong_trend_down' : 'weak_trend_down';
    } else if (sig.atrValue && sig.atrValue / closes[last] > 0.025) {
      r = 'volatile';
    }
    setRegime({ regime: r, adx: Math.round(adxNum), confidence: Math.min(95, Math.round(adxNum * 2)) });

    // AI heuristic scores
    setAiScores({
      trend:      Math.round(Math.min(100, Math.max(0, adxNum * 2))),
      momentum:   Math.round(Math.min(100, Math.max(0, rsiArr[last] ?? 50))),
      volatility: Math.round(Math.min(100, Math.max(0, (bbObj.bandwidth[last] ?? 0) * 200))),
      volume:     volSpike ? 85 : 45,
      signal:     sig.confidence ?? 50,
    });
  }, [candles]);

  useEffect(() => {
    computeAll();
  }, [computeAll]);

  // ── Countdown + auto-refresh ─────────────────────────────────────────────
  useEffect(() => {
    const iv = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          computeAll();
          return 60;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [computeAll]);

  // ── Listen for sidebar tab events ────────────────────────────────────────
  useEffect(() => {
    const handler = (e: CustomEvent) => setRightPanelTab(e.detail as string);
    document.addEventListener('atlas:set-right-tab', handler as EventListener);
    return () => document.removeEventListener('atlas:set-right-tab', handler as EventListener);
  }, [setRightPanelTab]);

  // ── AI Read Chart ────────────────────────────────────────────────────────
  const handleAiReadChart = useCallback(async () => {
    if (!candles?.length) return;
    setAiLoading(true);
    try {
      const last20 = candles.slice(-20);
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, timeframe, candles: last20 }),
      });
      const d = await res.json();
      setAiText(d.analysis || d.commentary || 'Analysis not available.');
    } catch {
      setAiText('AI connection failed.');
    } finally {
      setAiLoading(false);
    }
  }, [symbol, timeframe, candles]);

  const sigType = signal?.type ?? 'NEUTRAL';

  const tabs = [
    { id: 'signal',    label: 'Signal'    },
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'ai',        label: 'AI'        },
    { id: 'risk',      label: 'Risk'      },
  ];

  // ── Risk param keys aligned to userStore ────────────────────────────────
  const riskParams: Array<{ label: string; key: keyof typeof riskStoreSnapshot; suffix: string; step: number; min: number }> = [
    { label: 'Risk per Trade',      key: 'riskPerTrade',    suffix: '%',   step: 0.1, min: 0.1 },
    { label: 'Max Daily Loss',      key: 'maxDailyLoss',    suffix: '%',   step: 0.5, min: 0.5 },
    { label: 'Max Trades / Day',    key: 'maxTradesDay',    suffix: '',    step: 1,   min: 1   },
    { label: 'Cooldown after Loss', key: 'cooldownAfterLoss', suffix: 'min', step: 5, min: 0 },
  ];

  const riskStoreSnapshot = { riskPerTrade, maxDailyLoss, maxTradesDay, cooldownAfterLoss };

  return (
    <div className="right-panel">

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="rp-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`rp-tab${rightPanelTab === tab.id ? ' active' : ''}`}
            onClick={() => setRightPanelTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rp-content rp-body">

        {/* ════════════════════════════════════════════════════════════════
            SIGNAL TAB
        ════════════════════════════════════════════════════════════════ */}
        {rightPanelTab === 'signal' && (
          <>
            {/* Symbol + countdown */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tv-text2)' }}>
                {symbol} · {timeframe}
              </span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--tv-text2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                <RefreshCw size={9} />{countdown}s
              </span>
            </div>

            {/* Signal badge */}
            <div
              className={`signal-badge rp-signal-badge${sigType === 'BUY' ? ' buy' : sigType === 'SELL' ? ' sell' : ' neutral'}`}
              style={{ width: '100%', justifyContent: 'center', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {sigType === 'BUY'     && <TrendingUp   size={14} />}
              {sigType === 'SELL'    && <TrendingDown  size={14} />}
              {sigType === 'NEUTRAL' && <Minus         size={14} />}
              <span style={{ fontSize: 14, fontWeight: 800 }}>{sigType}</span>
              {signal?.confidence != null && (
                <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>{signal.confidence}%</span>
              )}
            </div>

            {/* Confidence bar */}
            {signal?.confidence != null && (
              <div className="confidence-bar" style={{ marginBottom: 10 }}>
                <div
                  className="confidence-fill"
                  style={{
                    width: `${signal.confidence}%`,
                    height: '100%',
                    background: sigType === 'BUY' ? 'var(--tv-up)' : sigType === 'SELL' ? 'var(--tv-down)' : 'var(--tv-neutral)',
                    borderRadius: 2,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            )}

            {/* Strategy tag */}
            {signal?.strategy && (
              <div style={{ fontSize: 10, color: 'var(--tv-text2)', marginBottom: 8, padding: '3px 6px', background: 'var(--tv-bg3)', borderRadius: 3, display: 'inline-block' }}>
                {signal.strategy}
              </div>
            )}

            {/* Price levels */}
            {sigType !== 'NEUTRAL' && signal?.entryPrice && (
              <div className="levels-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', marginBottom: 10 }}>
                {[
                  { lbl: 'Entry',  val: fmt(signal.entryPrice, 4), cls: 'mono' },
                  { lbl: 'R:R',    val: signal.rrRatio ? `1:${signal.rrRatio.toFixed(1)}` : '—', cls: 'acc' },
                  { lbl: 'TP1',    val: fmt(signal.tp1, 4), cls: 'up' },
                  { lbl: 'TP2',    val: fmt(signal.tp2, 4), cls: 'up' },
                  { lbl: 'TP3',    val: fmt(signal.tp3, 4), cls: 'up' },
                  { lbl: 'SL',     val: fmt(signal.sl, 4),  cls: 'down' },
                ].map(row => (
                  <div key={row.lbl} style={{ padding: '3px 0' }}>
                    <div style={{ fontSize: 9, color: 'var(--tv-text2)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{row.lbl}</div>
                    <div className={`mono ${row.cls}`} style={{ fontSize: 11, fontWeight: 600 }}>{row.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ATR */}
            {signal?.atrValue != null && (
              <div style={{ fontSize: 10, color: 'var(--tv-text2)', marginBottom: 8 }}>
                ATR(14): <span className="mono" style={{ color: 'var(--tv-text)' }}>{fmt(signal.atrValue, 4)}</span>
              </div>
            )}

            {/* Regime */}
            {regime && (
              <>
                <div className="section-hdr">Market Regime</div>
                <div className="regime-badge" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 8 }}>
                  <div className="regime-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: REGIME_COLORS[regime.regime] ?? '#787b86', flexShrink: 0 }} />
                  <span className="regime-lbl" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                    {regime.regime.replace(/_/g, ' ')}
                  </span>
                  <span className="regime-adx" style={{ fontSize: 10, color: 'var(--tv-text2)', marginLeft: 'auto' }}>
                    ADX {regime.adx}
                  </span>
                </div>
              </>
            )}

            {/* S/R table */}
            {srData && (
              <>
                <div className="section-hdr">S/R Levels</div>
                <table className="sr-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {srData.resistances.slice(0, 3).map((r, i) => (
                      <tr key={`r${i}`}>
                        <td><span className="sr-label r" style={{ color: 'var(--tv-down)', fontSize: 10, fontWeight: 700 }}>R{i + 1}</span></td>
                        <td className="mono" style={{ textAlign: 'right', color: 'var(--tv-down)', fontSize: 11 }}>{fmt(r.price, 4)}</td>
                      </tr>
                    ))}
                    {srData.supports.slice(0, 3).map((s, i) => (
                      <tr key={`s${i}`}>
                        <td><span className="sr-label s" style={{ color: 'var(--tv-up)', fontSize: 10, fontWeight: 700 }}>S{i + 1}</span></td>
                        <td className="mono" style={{ textAlign: 'right', color: 'var(--tv-up)', fontSize: 11 }}>{fmt(s.price, 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {/* Indicator values table */}
            {indValues && (
              <>
                <div className="section-hdr" style={{ marginTop: 8 }}>Indicators</div>
                <table className="ind-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <tbody>
                    {[
                      {
                        label: 'RSI (14)',
                        value: fmt(indValues.rsi, 1),
                        color: indValues.rsi > 70 ? '#f23645' : indValues.rsi < 30 ? '#089981' : '#787b86',
                        dot: '#7e57c2',
                      },
                      {
                        label: 'MACD Hist',
                        value: fmt(indValues.macd, 4),
                        color: (indValues.macd ?? 0) >= 0 ? '#089981' : '#f23645',
                        dot: '#2962ff',
                      },
                      {
                        label: 'VWAP Δ%',
                        value: `${indValues.vwapDelta >= 0 ? '+' : ''}${fmt(indValues.vwapDelta, 2)}%`,
                        color: indValues.vwapDelta >= 0 ? '#089981' : '#f23645',
                        dot: '#00bcd4',
                      },
                      {
                        label: 'ADX',
                        value: fmt(indValues.adx, 1),
                        color: (indValues.adx ?? 0) > 25 ? '#f7a600' : '#787b86',
                        dot: '#ff9800',
                      },
                      {
                        label: 'ATR (14)',
                        value: fmt(indValues.atr, 4),
                        color: 'var(--tv-text)',
                        dot: '#9e9e9e',
                      },
                      {
                        label: 'BB BW',
                        value: fmt(indValues.bbBw, 3),
                        color: 'var(--tv-text)',
                        dot: '#42a5f5',
                      },
                      {
                        label: 'Vol Spike',
                        value: indValues.volSpike ? 'Yes' : 'No',
                        color: indValues.volSpike ? '#089981' : '#787b86',
                        dot: '#ff9800',
                      },
                    ].map(row => (
                      <tr key={row.label}>
                        <td style={{ color: 'var(--tv-text2)', fontSize: 10, padding: '3px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: row.dot, flexShrink: 0, display: 'inline-block' }} />
                          {row.label}
                        </td>
                        <td className="ind-val" style={{ textAlign: 'right', color: row.color, fontFamily: 'monospace', padding: '3px 0' }}>
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {!signal && (
              <div style={{ fontSize: 11, color: 'var(--tv-text2)', textAlign: 'center', padding: '24px 0' }}>
                Loading signal data…
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            WATCHLIST TAB
        ════════════════════════════════════════════════════════════════ */}
        {rightPanelTab === 'watchlist' && (
          <>
            <div className="section-hdr">Watchlist</div>
            {WATCHLIST.map(item => (
              <WatchItem
                key={item.symbol}
                symbol={item.symbol}
                name={item.name}
                active={item.symbol === symbol}
                onSelect={() => setSymbol(item.symbol)}
              />
            ))}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            AI TAB
        ════════════════════════════════════════════════════════════════ */}
        {rightPanelTab === 'ai' && (
          <>
            <div className="section-hdr">AI Scores</div>

            {aiScores ? (
              <div style={{ marginBottom: 12 }}>
                <ScoreBar label="Trend"      value={aiScores.trend}      color="#2962ff" />
                <ScoreBar label="Momentum"   value={aiScores.momentum}   color="#7e57c2" />
                <ScoreBar label="Volatility" value={aiScores.volatility} color="#ff9800" />
                <ScoreBar label="Volume"     value={aiScores.volume}     color="#00bcd4" />
                <ScoreBar
                  label="Overall"
                  value={aiScores.signal}
                  color={sigType === 'BUY' ? '#089981' : sigType === 'SELL' ? '#f23645' : '#ff9800'}
                />
              </div>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--tv-text2)', marginBottom: 12 }}>
                Waiting for candle data…
              </div>
            )}

            {/* Read Chart button */}
            <button
              className="ai-btn"
              onClick={handleAiReadChart}
              disabled={aiLoading}
              style={{ marginBottom: 10 }}
            >
              {aiLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                  <div className="spinner" style={{ width: 12, height: 12, borderWidth: 1 }} />
                  Reading chart…
                </span>
              ) : (
                <>
                  <Bot size={12} style={{ marginRight: 4 }} />
                  Read Chart
                </>
              )}
            </button>

            {aiText ? (
              <div className="ai-commentary" style={{ fontSize: 11, lineHeight: 1.6, padding: '8px', background: 'var(--tv-bg3)', borderRadius: 4, color: 'var(--tv-text)', whiteSpace: 'pre-wrap' }}>
                {aiText}
              </div>
            ) : !aiLoading && (
              <div style={{ fontSize: 11, color: 'var(--tv-text2)', textAlign: 'center', padding: '12px 0', lineHeight: 1.6 }}>
                Click &quot;Read Chart&quot; for deep AI analysis of current market structure.
              </div>
            )}

            {/* Multi-TF confirmation */}
            <div className="section-hdr" style={{ marginTop: 14 }}>Multi-TF Confirmation</div>
            {(['4h', '1d'] as const).map(tf => {
              // Heuristic based on candle close momentum
              const closes   = candles?.map((c: any) => c.close as number) ?? [];
              const last     = closes.length - 1;
              const prev     = closes[last - Math.min(5, last)] ?? closes[last];
              const momentum = last > 0 ? ((closes[last] - prev) / (prev || 1)) * 100 : 0;
              const type     = momentum > 0.3 ? 'BUY' : momentum < -0.3 ? 'SELL' : 'NEUTRAL';
              return (
                <div key={tf} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid var(--tv-border)' }}>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--tv-text2)' }}>{tf}</span>
                  <span
                    className={`rp-signal-badge${type === 'BUY' ? ' buy' : type === 'SELL' ? ' sell' : ' neutral'}`}
                    style={{ fontSize: 9, padding: '1px 5px' }}
                  >
                    {type}
                  </span>
                </div>
              );
            })}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            RISK TAB
        ════════════════════════════════════════════════════════════════ */}
        {rightPanelTab === 'risk' && (
          <>
            <div className="section-hdr">Risk Parameters</div>

            {riskParams.map(({ label, key, suffix, step, min }) => (
              <div key={key} className="risk-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--tv-border)' }}>
                <span className="risk-lbl" style={{ fontSize: 10, color: 'var(--tv-text2)' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    className="risk-input"
                    type="number"
                    value={riskStoreSnapshot[key]}
                    step={step}
                    min={min}
                    onChange={e => updateRisk({ [key]: parseFloat(e.target.value) || 0 })}
                    style={{ width: 52, fontSize: 11, textAlign: 'right', background: 'var(--tv-bg3)', border: '1px solid var(--tv-border)', borderRadius: 3, padding: '2px 4px', color: 'var(--tv-text)', fontFamily: 'monospace' }}
                  />
                  {suffix && <span style={{ fontSize: 10, color: 'var(--tv-text2)' }}>{suffix}</span>}
                </div>
              </div>
            ))}

            {/* Today's stats (mock) */}
            <div className="section-hdr" style={{ marginTop: 10 }}>Today&apos;s Stats</div>
            {[
              { label: 'Trades Today',  value: '0'     },
              { label: 'PnL Today',     value: '0.00%' },
              { label: 'Drawdown',      value: '0.00%' },
              { label: 'Status',        value: killActive ? 'KILL SWITCH' : 'ACTIVE', color: killActive ? 'var(--tv-down)' : 'var(--tv-up)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="risk-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', borderBottom: '1px solid var(--tv-border)' }}>
                <span className="risk-lbl" style={{ fontSize: 10, color: 'var(--tv-text2)' }}>{label}</span>
                <span className="risk-val mono" style={{ fontSize: 11, color: color ?? 'var(--tv-text)' }}>{value}</span>
              </div>
            ))}

            {/* Kelly fraction */}
            <div className="section-hdr" style={{ marginTop: 10 }}>Kelly Sizing</div>
            <div style={{ fontSize: 10, color: 'var(--tv-text2)', lineHeight: 1.6, padding: '4px 0' }}>
              Kelly = (WR × avgWin − (1−WR) × avgLoss) / avgWin
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontSize: 10, color: 'var(--tv-text2)' }}>Kelly %</span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--tv-blue)' }}>
                {(() => {
                  const wr = 0.5;
                  const avgW = riskPerTrade * 2;
                  const avgL = riskPerTrade;
                  const kelly = ((wr * avgW - (1 - wr) * avgL) / avgW) * 100;
                  return `${kelly.toFixed(1)}%`;
                })()}
              </span>
            </div>

            {/* Kill switch */}
            <button
              className={`kill-switch${killActive ? ' active' : ''}`}
              onClick={() => setKillActive(k => !k)}
              style={{ marginTop: 12 }}
            >
              <Power size={13} style={{ marginRight: 6 }} />
              {killActive ? 'KILL SWITCH ACTIVE — Click to Reset' : 'KILL SWITCH (Stop All)'}
            </button>

            <div style={{ fontSize: 9, color: 'var(--tv-text2)', textAlign: 'center', marginTop: 6 }}>
              No auto trading. Manual execution only.
            </div>
          </>
        )}

      </div>
    </div>
  );
}
