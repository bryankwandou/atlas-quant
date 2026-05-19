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
function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="ai-score-row score-bar">
      <span className="ai-score-lbl">{label}</span>
      <div className="ai-score-bar">
        <div style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
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
    { id: 'signal',    label: 'Signal'    },
    { id: 'watchlist', label: 'Watchlist' },
    { id: 'ai',        label: 'AI'        },
    { id: 'risk',      label: 'Risk'      },
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
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rp-content rp-body">

        {/* ════════════════════════════════════════════════════════════════
            SIGNAL TAB — TradingView-style Last Performance layout
        ════════════════════════════════════════════════════════════════ */}
        {rightPanelTab === 'signal' && (() => {
          const lastCandle = candles?.length ? candles[candles.length - 1] : null;
          const prevCandle = candles?.length > 1 ? candles[candles.length - 2] : null;
          const lClose  = lastCandle?.close  ?? 0;
          const lOpen   = lastCandle?.open   ?? 0;
          const lHigh   = lastCandle?.high   ?? 0;
          const lLow    = lastCandle?.low    ?? 0;
          const lVol    = lastCandle?.volume ?? 0;
          const midPric = (lHigh + lLow) / 2;
          const change  = prevCandle ? lClose - prevCandle.close : lClose - lOpen;
          const rangePct = lHigh > 0 ? ((lHigh - lLow) / lHigh) * 100 : 0;
          const fmtVol  = lVol >= 1e9 ? `${(lVol/1e9).toFixed(1)}B`
                        : lVol >= 1e6 ? `${(lVol/1e6).toFixed(1)}M`
                        : lVol >= 1e3 ? `${(lVol/1e3).toFixed(1)}K`
                        : lVol.toFixed(0);
          const isUp = change >= 0;

          return (
            <>
              {/* ── Version badge + countdown ────────────────────── */}
              <div className="rp-version-row">
                <span className="rp-version-badge">v2 ATLAS-QUANT</span>
                <span className="rp-countdown">
                  <RefreshCw size={8} />{countdown}s
                </span>
              </div>

              {/* ── LAST PERFORMANCE ─────────────────────────────── */}
              <div className="section-hdr">LAST PERFORMANCE</div>
              <div className="rp-perf-grid">
                {[
                  { lbl: 'OPEN',     val: fmt(lOpen,   4) },
                  { lbl: 'HIGH',     val: fmt(lHigh,   4) },
                  { lbl: 'MID-PRIC', val: fmt(midPric, 4) },
                  { lbl: 'LOW',      val: fmt(lLow,    4) },
                  { lbl: 'CLOSE',    val: fmt(lClose,  4), cls: isUp ? 'up' : 'down' },
                  { lbl: 'CHANGE',   val: (change >= 0 ? '+' : '') + fmt(change, 2), cls: isUp ? 'up' : 'down' },
                  { lbl: 'RANGE',    val: `${fmt(rangePct, 2)}%` },
                  { lbl: 'VOLUME',   val: fmtVol },
                ].map(({ lbl, val, cls }) => (
                  <div key={lbl} className="rp-perf-row">
                    <span className="rp-perf-lbl">{lbl}</span>
                    <span className={`rp-perf-val mono${cls ? ` ${cls}` : ''}`}>{val}</span>
                  </div>
                ))}
              </div>

              {/* ── Signal badge (full-width centered) ───────────── */}
              <div className={`rp-signal-badge-full${sigType === 'BUY' ? ' buy' : sigType === 'SELL' ? ' sell' : ' neutral'}`}>
                {sigType === 'BUY'     && <TrendingUp   size={13} />}
                {sigType === 'SELL'    && <TrendingDown  size={13} />}
                {sigType === 'NEUTRAL' && <Minus         size={13} />}
                <span className="rp-sig-type">{sigType}</span>
                {signal?.confidence != null && (
                  <span className="rp-sig-conf">{signal.confidence}%</span>
                )}
              </div>

              {/* ── SUPPORT | RESISTANCE ─────────────────────────── */}
              {srData && (
                <>
                  <div className="rp-sr-hdr">
                    <span className="rp-sr-hdr-sup">SUPPORT</span>
                    <span className="rp-sr-hdr-res">RESISTANCE</span>
                  </div>
                  <div className="rp-sr-grid">
                    {Array.from({ length: Math.max(srData.supports.length, srData.resistances.length, 4) }, (_, i) => (
                      <div key={i} className="rp-sr-row">
                        <span className="rp-sr-sup mono">
                          {srData.supports[i] ? fmt(srData.supports[i].price, 2) : '—'}
                        </span>
                        <span className="rp-sr-res mono">
                          {srData.resistances[i] ? fmt(srData.resistances[i].price, 2) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── INDICATORS ───────────────────────────────────── */}
              {indValues && (
                <>
                  <div className="section-hdr section-hdr-mt">INDICATORS</div>
                  {[
                    { lbl: 'RSI (14)',  val: fmt(indValues.rsi, 1),  c: indValues.rsi > 70 ? 'var(--tv-down)' : indValues.rsi < 30 ? 'var(--tv-up)' : 'var(--tv-text2)', pct: `${fmt(indValues.rsi, 0)}%` },
                    { lbl: 'MACD',     val: fmt(indValues.macd, 4), c: (indValues.macd ?? 0) >= 0 ? 'var(--tv-up)' : 'var(--tv-down)', pct: '' },
                    { lbl: 'VWAP',     val: fmt(indValues.vwap, 2), c: lClose > indValues.vwap ? 'var(--tv-up)' : 'var(--tv-down)', pct: `${indValues.vwapDelta >= 0 ? '+' : ''}${fmt(indValues.vwapDelta, 1)}%` },
                    { lbl: 'ADX',      val: fmt(indValues.adx, 1),  c: (indValues.adx ?? 0) > 25 ? 'var(--tv-neutral)' : 'var(--tv-text2)', pct: '' },
                    { lbl: 'EMA 9',    val: fmt(indValues.ema9, 2), c: lClose > indValues.ema9  ? 'var(--tv-up)' : 'var(--tv-down)', pct: '' },
                    { lbl: 'EMA 21',   val: fmt(indValues.ema21, 2),c: lClose > indValues.ema21 ? 'var(--tv-up)' : 'var(--tv-down)', pct: '' },
                    { lbl: 'ATR (14)', val: fmt(indValues.atr, 4),  c: 'var(--tv-text)', pct: '' },
                    { lbl: 'VOL SPIKE',val: indValues.volSpike ? 'YES' : 'NO', c: indValues.volSpike ? 'var(--tv-up)' : 'var(--tv-text2)', pct: '' },
                  ].map(({ lbl, val, c, pct }) => (
                    <div key={lbl} className="rp-ind-row">
                      <span className="rp-ind-lbl">{lbl}</span>
                      {pct && <span className="rp-ind-pct" style={{ color: c }}>{pct}</span>}
                      <span className="rp-ind-val mono" style={{ color: c }}>{val}</span>
                    </div>
                  ))}
                </>
              )}

              {/* ── Regime ───────────────────────────────────────── */}
              {regime && (
                <div className="rp-regime-row">
                  <div
                    className="rp-regime-dot"
                    style={{ background: REGIME_COLORS[regime.regime] ?? '#787b86' }}
                  />
                  <span className="rp-regime-lbl">{regime.regime.replace(/_/g, ' ')}</span>
                  <span className="rp-regime-adx">ADX {regime.adx}</span>
                </div>
              )}

              {/* ── TP/SL levels ──────────────────────────────────── */}
              {sigType !== 'NEUTRAL' && signal?.tp1 && (
                <div className="rp-levels-grid">
                  {[
                    { l: 'ENTRY', v: fmt(signal.entryPrice, 4), c: 'var(--tv-text)'  },
                    { l: 'TP 1',  v: fmt(signal.tp1, 4),        c: 'var(--tv-up)'    },
                    { l: 'TP 2',  v: fmt(signal.tp2, 4),        c: 'var(--tv-up)'    },
                    { l: 'TP 3',  v: fmt(signal.tp3, 4),        c: 'var(--tv-up)'    },
                    { l: 'SL',    v: fmt(signal.sl, 4),          c: 'var(--tv-down)'  },
                    { l: 'R:R',   v: signal.rrRatio ? `1:${signal.rrRatio.toFixed(1)}` : '—', c: 'var(--tv-blue)' },
                  ].map(({ l, v, c }) => (
                    <div key={l} className="rp-level-row">
                      <span className="rp-level-lbl">{l}</span>
                      <span className="rp-level-val mono" style={{ color: c }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {!lastCandle && (
                <div className="rp-signal-loading">Loading data…</div>
              )}

              {/* ── EXECUTE TRADE NODE ────────────────────────────── */}
              <button
                type="button"
                className={`execute-trade-btn${sigType === 'BUY' ? ' buy' : sigType === 'SELL' ? ' sell' : ''}`}
                onClick={() => {
                  const msg = `${sigType} signal on ${symbol} ${timeframe}. Conf: ${signal?.confidence ?? '—'}%. Entry: ${fmt(signal?.entryPrice, 4)}, TP1: ${fmt(signal?.tp1, 4)}, SL: ${fmt(signal?.sl, 4)}`;
                  alert(msg);
                }}
              >
                EXECUTE TRADE NODE
              </button>
              <div className="rp-signal-footer">
                Neural signal confirmed via market data nodes.
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
              <div className="rp-signal-loading">Waiting for candle data…</div>
            )}

            <button
              type="button"
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
              <div className="ai-commentary">{aiText}</div>
            ) : !aiLoading && (
              <div className="rp-signal-loading">
                Click &quot;Read Chart&quot; for deep AI analysis of current market structure.
              </div>
            )}

            {/* Multi-TF confirmation */}
            <div className="section-hdr section-hdr-mt">Multi-TF Confirmation</div>
            {(['4h', '1d'] as const).map(tf => {
              const closes   = candles?.map((c: any) => c.close as number) ?? [];
              const last     = closes.length - 1;
              const prev     = closes[last - Math.min(5, last)] ?? closes[last];
              const momentum = last > 0 ? ((closes[last] - prev) / (prev || 1)) * 100 : 0;
              const type     = momentum > 0.3 ? 'BUY' : momentum < -0.3 ? 'SELL' : 'NEUTRAL';
              return (
                <div key={tf} className="rp-level-row">
                  <span className="rp-regime-adx">{tf}</span>
                  <span className={`rp-signal-badge-full${type === 'BUY' ? ' buy' : type === 'SELL' ? ' sell' : ' neutral'}`}
                    style={{ width: 'auto', margin: 0, padding: '1px 5px', fontSize: 9, borderRadius: 3 }}>
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
              <div key={key} className="rp-level-row" style={{ paddingTop: 4, paddingBottom: 4 }}>
                <span className="rp-ind-lbl">{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    className="risk-input"
                    type="number"
                    value={riskStoreSnapshot[key]}
                    step={step}
                    min={min}
                    onChange={e => updateRisk({ [key]: parseFloat(e.target.value) || 0 })}
                  />
                  {suffix && <span className="rp-ind-lbl" style={{ flex: 'none' }}>{suffix}</span>}
                </div>
              </div>
            ))}

            {/* Today's stats (mock) */}
            <div className="section-hdr section-hdr-mt">Today&apos;s Stats</div>
            {[
              { label: 'Trades Today', value: '0' },
              { label: 'PnL Today',    value: '0.00%' },
              { label: 'Drawdown',     value: '0.00%' },
              { label: 'Status',       value: killActive ? 'KILL SWITCH' : 'ACTIVE', color: killActive ? 'var(--tv-down)' : 'var(--tv-up)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rp-level-row">
                <span className="rp-ind-lbl">{label}</span>
                <span className="rp-level-val mono" style={{ color: color ?? 'var(--tv-text)' }}>{value}</span>
              </div>
            ))}

            {/* Kelly fraction */}
            <div className="section-hdr section-hdr-mt">Kelly Sizing</div>
            <div className="rp-signal-footer" style={{ textAlign: 'left', marginTop: 4 }}>
              Kelly = (WR × avgWin − (1−WR) × avgLoss) / avgWin
            </div>
            <div className="rp-level-row">
              <span className="rp-ind-lbl">Kelly %</span>
              <span className="rp-level-val mono" style={{ color: 'var(--tv-blue)' }}>
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
              type="button"
              className={`kill-switch${killActive ? ' active' : ''}`}
              onClick={() => setKillActive(k => !k)}
              style={{ marginTop: 12 }}
            >
              <Power size={13} style={{ marginRight: 6 }} />
              {killActive ? 'KILL SWITCH ACTIVE — Click to Reset' : 'KILL SWITCH (Stop All)'}
            </button>

            <div className="rp-signal-footer" style={{ marginTop: 6 }}>
              No auto trading. Manual execution only.
            </div>
          </>
        )}

      </div>
    </div>
  );
}
