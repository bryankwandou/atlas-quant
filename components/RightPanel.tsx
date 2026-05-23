'use client';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Power, Bot, Activity } from 'lucide-react';
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
  const price  = priceData?.price    ?? null;
  const change = priceData?.change24h ?? null;
  const isUp   = (change ?? 0) >= 0;

  return (
    <div
      className={`rp-watchlist-item${active ? ' active' : ''}`}
      onClick={onSelect}
    >
      <div>
        <div className="wl-sym">{symbol.replace('USDT', '').replace('=X', '').replace('=F', '')}</div>
        <div className="wl-name">{name}</div>
      </div>
      <div className="wl-right">
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
const SCORE_COLORS: Record<string, string> = {
  trend:      '#2962ff',
  momentum:   '#7e57c2',
  volatility: '#ff9800',
  volume:     '#00bcd4',
  buy:        '#089981',
  sell:       '#f23645',
  neutral:    '#ff9800',
};

function ScoreBar({ label, value, variant = 'trend' }: { label: string; value: number; variant?: string }) {
  const color = SCORE_COLORS[variant] ?? '#2962ff';
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="ai-score-row score-bar">
      <span className="ai-score-lbl">{label}</span>
      <div className="ai-score-bar-wrap">
        <div className="ai-score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="ai-score-val mono">{Math.round(value)}</span>
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
  const { priceData } = useMarketPrice(symbol);

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
    const rsiArr   = ind.rsi(14);
    const atrArr   = ind.atr(14);
    const macdObj  = ind.macd(12, 26, 9);
    const adxObj   = ind.adx(14);
    const vwapArr  = ind.vwap();
    const ema9Arr  = ind.ema(9);
    const ema21Arr = ind.ema(21);
    const bbObj    = ind.bollingerBands(20, 2);
    const smaArr   = ind.sma(20);
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
        if (c <= 1) { computeAll(); return 60; }
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
  const rpPrice  = priceData?.price    ?? 0;
  const rpChange = priceData?.change24h ?? 0;
  const rpIsUp   = rpChange >= 0;

  const tabs = [
    { id: 'signal',    label: 'Signal',    icon: '⚡' },
    { id: 'watchlist', label: 'Watchlist', icon: '👁' },
    { id: 'ai',        label: 'AI',        icon: '🤖' },
    { id: 'risk',      label: 'Risk',      icon: '🛡' },
  ];

  // ── Risk param keys aligned to userStore ────────────────────────────────
  const riskStoreSnapshot = { riskPerTrade, maxDailyLoss, maxTradesDay, cooldownAfterLoss };
  const riskParams: Array<{ label: string; key: keyof typeof riskStoreSnapshot; suffix: string; step: number; min: number }> = [
    { label: 'Risk per Trade',      key: 'riskPerTrade',      suffix: '%',   step: 0.1, min: 0.1 },
    { label: 'Max Daily Loss',      key: 'maxDailyLoss',      suffix: '%',   step: 0.5, min: 0.5 },
    { label: 'Max Trades / Day',    key: 'maxTradesDay',      suffix: '',    step: 1,   min: 1   },
    { label: 'Cooldown after Loss', key: 'cooldownAfterLoss', suffix: 'min', step: 5,   min: 0   },
  ];

  return (
    <div className="right-panel">

      {/* ── Symbol Header (matches reference rp-sym-hdr) ──────────────── */}
      <div className="rp-sym-hdr">
        <div className="rp-sym-left">
          <div className="rp-sym-name">{symbol}</div>
          <div className="rp-sym-full">{symbol.replace('USDT', ' / USDT').replace('=X', '').replace('=F', ' Futures')}</div>
          <div className="rp-sym-exch">BINANCE · {symbol.endsWith('USDT') ? 'CRYPTO' : 'MARKET'}</div>
        </div>
        <div className="rp-sym-right">
          <div className={`rp-price mono${rpIsUp ? ' up' : ' down'}`}>
            {rpPrice > 0 ? rpPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '—'}
          </div>
          <div className={`rp-change${rpIsUp ? ' up' : ' down'}`}>
            {rpIsUp ? '+' : ''}{rpChange.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="rp-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`rp-tab${rightPanelTab === tab.id ? ' active' : ''}`}
            onClick={() => setRightPanelTab(tab.id)}
          >
            <span className="rp-tab-icon">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="rp-content rp-body">

        {/* ════════════════════════════════════════════════════════════════
            SIGNAL TAB
        ════════════════════════════════════════════════════════════════ */}
        {rightPanelTab === 'signal' && (() => {
          const lClose = candles?.length ? candles[candles.length - 1].close : 0;

          return (
            <>
              {/* Countdown */}
              <div className="rp-version-row">
                <span className="rp-version-badge">v2 ATLAS-QUANT</span>
                <span className="rp-countdown">
                  <RefreshCw size={8} />{countdown}s
                </span>
              </div>

              {/* Signal Badge */}
              <div className={`signal-badge ${sigType.toLowerCase()}`}>
                <div className="sig-badge-type">{sigType}</div>
                <div className="sig-badge-conf">{signal?.confidence ?? '—'}% confidence</div>
              </div>

              {/* Strategy */}
              {signal?.strategy && (
                <div className="sig-strategy-row">
                  <span className="sig-strat-label">Strategy</span>
                  <span className="sig-strat-val">{signal.strategy.replace(/_/g, ' ')}</span>
                </div>
              )}

              {/* Price Levels */}
              {sigType !== 'NEUTRAL' && signal?.tp1 && (
                <div className="sig-levels">
                  {[
                    { label: 'Entry', val: fmt(signal.entryPrice, 4), cls: ''       },
                    { label: 'TP1',   val: fmt(signal.tp1, 4),        cls: 'tp-val' },
                    { label: 'TP2',   val: fmt(signal.tp2, 4),        cls: 'tp-val' },
                    { label: 'TP3',   val: fmt(signal.tp3, 4),        cls: 'tp-val' },
                    { label: 'SL',    val: fmt(signal.sl, 4),          cls: 'sl-val' },
                    { label: 'R:R',   val: signal.rrRatio ? `${signal.rrRatio.toFixed(1)}:1` : '—', cls: 'blue' },
                    { label: 'ATR',   val: fmt(signal.atrValue, 4),    cls: ''       },
                  ].map(({ label, val, cls }) => (
                    <div key={label} className="sig-level-row">
                      <span className="sig-level-label">{label}</span>
                      <span className={`sig-level-val mono${cls ? ` ${cls}` : ''}`}>{val}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Regime */}
              {regime && (() => {
                const rc = REGIME_COLORS[regime.regime] ?? '#ff9800';
                return (
                  <div className="sig-regime-row">
                    <div className="sig-regime-label">Market Regime</div>
                    <div
                      className="sig-regime-badge"
                      style={{ backgroundColor: rc + '22', color: rc, borderColor: rc + '44' }}
                    >
                      <span className="regime-dot" style={{ background: rc }} />
                      {regime.regime.replace(/_/g, ' ')} · ADX {regime.adx}
                    </div>
                  </div>
                );
              })()}

              {/* Support / Resistance */}
              {srData && (
                <div className="sig-sr-section">
                  <div className="sig-section-title">
                    <span>Support</span>
                    <span>Resistance</span>
                  </div>
                  <div className="sig-sr-table">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="sig-sr-row">
                        <span className="sr-rank">{i + 1}</span>
                        <span className="sr-support mono up">
                          {srData.supports[i] ? fmt(srData.supports[i].price, 2) : '—'}
                        </span>
                        <span className="sr-resist mono down">
                          {srData.resistances[i] ? fmt(srData.resistances[i].price, 2) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Indicators */}
              {indValues && (
                <div className="sig-indicators-section">
                  <div className="sig-ind-title">Indicators</div>
                  <div className="sig-ind-table">
                    {[
                      { label: 'EMA 9',    val: indValues.ema9,  ref: lClose, dec: 2 },
                      { label: 'EMA 21',   val: indValues.ema21, ref: lClose, dec: 2 },
                      { label: 'VWAP',     val: indValues.vwap,  ref: lClose, dec: 2 },
                      { label: 'RSI (14)', val: indValues.rsi,   ref: 0,      dec: 1, noChange: true },
                      { label: 'ATR (14)', val: indValues.atr,   ref: 0,      dec: 4, noChange: true },
                      { label: 'MACD',     val: indValues.macd,  ref: 0,      dec: 4, noChange: true },
                    ].map(({ label, val, ref, dec, noChange }) => {
                      const pct = !noChange && ref && val ? ((val - ref) / ref * 100) : null;
                      return (
                        <div key={label} className="sig-ind-row">
                          <span className="ind-row-label">{label}</span>
                          <span className="ind-row-val mono">{val != null ? Number(val).toFixed(dec) : '—'}</span>
                          {pct != null && (
                            <span className={`ind-row-pct ${pct >= 0 ? 'up' : 'down'}`}>
                              {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="sig-warning">
                ⚠ For informational purposes only. Manual execution only. Not financial advice.
              </div>
            </>
          );
        })()}

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
          <div className="rp-ai">
            {/* Header */}
            <div className="ai-header">
              <div className="ai-model-badge">🤖 Llama-3.3-70B</div>
              <span className="ai-status">● Live</span>
            </div>

            {/* AI message / commentary */}
            <div className="ai-message assistant">
              <div className="ai-msg-label">ATLAS AI</div>
              <div className="ai-msg-content">
                {aiText || (
                  sigType !== 'NEUTRAL'
                    ? `${sigType} signal detected on ${symbol} with ${signal?.confidence ?? '—'}% confidence. Strategy: ${signal?.strategy?.replace(/_/g, ' ') ?? '—'}. Monitor nearest ${sigType === 'BUY' ? 'support' : 'resistance'} levels before entry.`
                    : `${symbol} market is currently in consolidation. No strong signal detected. Wait for a breakout confirmation before entry.`
                )}
              </div>
            </div>

            {/* Read Chart button */}
            <div className="ai-chart-read-btn-wrap">
              <button
                type="button"
                className="ai-read-btn"
                onClick={handleAiReadChart}
                disabled={aiLoading}
              >
                <Activity size={13} />
                <span>{aiLoading ? 'Reading chart…' : 'Read Chart'}</span>
              </button>
            </div>

            {/* AI risk scores */}
            {aiScores && (
              <div className="ai-risk-scores">
                {[
                  { label: 'Signal Strength', val: aiScores.signal,           color: '#089981' },
                  { label: 'Risk Level',       val: 100 - aiScores.signal,    color: '#f23645' },
                  { label: 'ATLAS Score',      val: aiScores.trend,           color: '#2962ff' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="ai-score-row">
                    <span className="ai-score-label">{label}</span>
                    <div className="ai-score-bar-wrap">
                      <div className="ai-score-bar" style={{ width: `${Math.round(val)}%`, background: color }} />
                    </div>
                    <span className="ai-score-val mono">{Math.round(val)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            RISK TAB
        ════════════════════════════════════════════════════════════════ */}
        {rightPanelTab === 'risk' && (
          <div className="rp-risk">
            {/* Trade status badge */}
            <div className="risk-status-row">
              <div
                className="risk-status-badge"
                style={{
                  background:   killActive ? 'rgba(242,54,69,.15)'    : 'rgba(8,153,129,.15)',
                  color:        killActive ? '#f23645'                 : '#089981',
                  borderColor:  killActive ? 'rgba(242,54,69,.3)'      : 'rgba(8,153,129,.3)',
                }}
              >
                {killActive ? '✕ Kill Switch Active' : '✓ Trade Allowed'}
              </div>
            </div>

            {/* Risk params */}
            <div className="risk-params">
              {riskParams.map(({ label, key, suffix, step, min }) => (
                <div key={key} className="risk-param-row">
                  <span className="risk-param-icon">📊</span>
                  <span className="risk-param-label">{label}</span>
                  <div className="risk-input-wrap">
                    <input
                      className="risk-input"
                      type="number"
                      value={riskStoreSnapshot[key]}
                      step={step}
                      min={min}
                      onChange={e => updateRisk({ [key]: parseFloat(e.target.value) || 0 })}
                    />
                    {suffix && <span className="risk-suffix">{suffix}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Today's stats */}
            <div className="risk-today">
              <div className="risk-today-title">Today</div>
              <div className="risk-today-stats">
                {[
                  { label: 'Trades', val: '0',  cls: ''   },
                  { label: 'PnL',    val: '—',  cls: ''   },
                  { label: 'Win',    val: '0/0', cls: ''   },
                  { label: 'Win%',   val: '0%',  cls: ''   },
                ].map(({ label, val, cls }) => (
                  <div key={label} className="risk-today-item">
                    <div className={`risk-today-val mono${cls ? ` ${cls}` : ''}`}>{val}</div>
                    <div className="risk-today-label">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kill switch */}
            <button
              type="button"
              className="kill-switch-btn"
              onClick={() => setKillActive(k => !k)}
            >
              <Power size={14} />
              <span>{killActive ? 'Deactivate Kill Switch' : 'Kill Switch (Stop All)'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
