'use client';
import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Power, Bot, Activity, ChevronLeft, AlertTriangle } from 'lucide-react';
import { useChartStore } from '@/store/chartStore';
import { useUserStore } from '@/store/userStore';
import { useMarketData, useMarketPrice } from '@/hooks/useMarketData';
import { computeIndicators } from '@/core/indicators/client';

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
  rsi7:     number;
  macd:     number;
  adx:      number;
  atr:      number;
  vwap:     number;
  ema9:     number;
  ema21:    number;
  ema50:    number;
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

const REGIME_ID_LABELS: Record<string, string> = {
  strong_trend_up:   'Tren Naik Kuat',
  weak_trend_up:     'Tren Naik Lemah',
  ranging:           'Konsolidasi',
  weak_trend_down:   'Tren Turun Lemah',
  strong_trend_down: 'Tren Turun Kuat',
  volatile:          'Volatil',
  low_volume:        'Volume Rendah',
  news_event:        'Event Berita',
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

  const { candles, isLoading: candlesLoading } = useMarketData(symbol, timeframe);
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
    if (!candles || candles.length < 10) return;

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
    const rsi7Arr  = ind.rsi(7);
    const atrArr   = ind.atr(14);
    const macdObj  = ind.macd(12, 26, 9);
    const adxObj   = ind.adx(14);
    const vwapArr  = ind.vwap();
    const ema9Arr  = ind.ema(9);
    const ema21Arr = ind.ema(21);
    const ema50Arr = ind.ema(50);
    const bbObj    = ind.bollingerBands(20, 2);
    const smaArr   = ind.sma(20);
    const volSpike = volumes[last] > ((smaArr[last] || 1) * 2);

    const vwapLast  = vwapArr[last] ?? closes[last];
    const vwapDelta = ((closes[last] - vwapLast) / vwapLast) * 100;

    setIndValues({
      rsi:      rsiArr[last],
      rsi7:     rsi7Arr[last],
      macd:     macdObj.macd[last],
      adx:      (adxObj.adx as any)[last],
      atr:      atrArr[last],
      vwap:     vwapLast,
      ema9:     ema9Arr[last],
      ema21:    ema21Arr[last],
      ema50:    ema50Arr[last],
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

  // ── AI Read Chart — uses local AI (no API key needed) ───────────────────
  const handleAiReadChart = useCallback(async () => {
    setAiLoading(true);
    setAiText('');
    try {
      // Try Groq first if configured, fall back to local AI
      let text = '';

      if (candles?.length) {
        const groqRes = await fetch('/api/ai/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, timeframe, candles: candles.slice(-20) }),
        }).catch(() => null);

        if (groqRes?.ok) {
          const d = await groqRes.json();
          text = d.analysis || d.commentary || '';
        }
      }

      // Local AI fallback — always works, zero API key
      if (!text) {
        const question = `Analyze ${symbol} on ${timeframe} timeframe. What is the current market signal and key price levels? Give a concise trading insight.`;
        const localRes = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, symbol, interval: timeframe }),
        });
        const d = await localRes.json();
        const lc = d.liveContext;
        if (lc) {
          text = `${d.answer}\n\nSignal: ${lc.signal} (${lc.confidence}% confidence) — Price: ${lc.price}`;
          if (lc.kelly) text += ` — Kelly: ${(lc.kelly * 100).toFixed(1)}%`;
        } else {
          text = d.answer || 'Analysis not available.';
        }
        if (d.risk) text += `\n\nRisk: ${d.risk}`;
      }

      setAiText(text);
    } catch {
      setAiText('AI analysis error. Check connection.');
    } finally {
      setAiLoading(false);
    }
  }, [symbol, timeframe, candles]);

  const sigType = signal?.type ?? 'NEUTRAL';
  const rpPrice  = priceData?.price    ?? 0;
  const rpChange = priceData?.change24h ?? 0;
  const rpIsUp   = rpChange >= 0;

  // T1MO OHLCV rows — last candle vs prev candle
  const lastC = candles?.length ? candles[candles.length - 1] : null;
  const prevC = candles?.length > 1 ? candles[candles.length - 2] : null;
  const midPrc = lastC ? (lastC.high + lastC.low) / 2 : null;
  const prevMid = prevC ? (prevC.high + prevC.low) / 2 : null;
  const cpPct = lastC && prevC ? ((lastC.close - prevC.close) / prevC.close * 100) : null;
  const rangePct = lastC && prevC && prevC.high !== prevC.low
    ? ((lastC.high - lastC.low) / (prevC.high - prevC.low) * 100 - 100)
    : null;

  const VALID_TABS = ['signal', 'watchlist', 'ai', 'risk', 'data', 'calendar', 'news', 'alerts', 'plan', 'objects', 'pine', 'keyboard', 'help'];
  const activeTab = VALID_TABS.includes(rightPanelTab) ? rightPanelTab : 'signal';

  const tabs = [
    { id: 'signal',    label: 'Sinyal'   },
    { id: 'watchlist', label: 'Pantauan' },
    { id: 'ai',        label: 'AI'       },
    { id: 'risk',      label: 'Risiko'   },
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

      {/* ── T1MO Symbol Header — folder (4) exact ──────────────────────── */}
      <div className="rp-sym-hdr t1mo-sym-hdr">
        <div className="t1mo-sym-left">
          <span className={`t1mo-spec-badge ${sigType === 'BUY' ? 'buy' : sigType === 'SELL' ? 'sell' : 'neutral'}`}>
            {sigType === 'BUY' ? 'Beli Spekulatif' : sigType === 'SELL' ? 'Jual Spekulatif' : 'NEUTRAL'}
          </span>
          <div className="t1mo-price-row">
            <span className={`t1mo-price mono ${rpIsUp ? 'up' : 'down'}`}>
              {rpPrice > 0 ? rpPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
            </span>
            <span className={`t1mo-chg ${rpIsUp ? 'up' : 'down'}`}>
              {rpPrice > 0 ? `${rpIsUp ? '+' : ''}${(rpPrice * rpChange / 100).toFixed(2)} ${rpIsUp ? '+' : ''}${rpChange.toFixed(2)}%` : '—'}
            </span>
          </div>
          <div className="t1mo-event-label">
            {(() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), 0, 0);
              const doy = Math.floor((now.getTime() - start.getTime()) / 86400000);
              const d = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'2-digit' });
              return `D-${String(doy).padStart(3,'0')} · ${d}`;
            })()}
          </div>
        </div>
        <button type="button" className="t1mo-collapse-btn" title="Collapse"><ChevronLeft size={12}/></button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div className="rp-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`rp-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setRightPanelTab(tab.id)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="rp-content rp-body">

        {/* ════════════════════════════════════════════════════════════════
            SIGNAL TAB — T1MO style (folder 4 reference)
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'signal' && (
          <>
            {/* Loading / empty state */}
            {candlesLoading && (
              <div className="rp-loading-row">
                <div className="rp-spinner" />
                <span>Memuat data {symbol}…</span>
              </div>
            )}
            {!candlesLoading && (!candles || candles.length === 0) && (
              <div className="rp-no-data">
                <span>Tidak ada data untuk {symbol}</span>
                <span className="rp-no-data-sub">Coba ganti simbol atau timeframe</span>
              </div>
            )}
            {/* Version row */}
            <div className="rp-version-row">
              <span className="rp-version-badge">v1.0.15 SCIENTIFIC</span>
              <span className="rp-countdown"><RefreshCw size={8} />{countdown}s</span>
            </div>

            {/* T1MO LAST / PREV two-column OHLCV — folder (4) exact */}
            <div className="t1mo-table">
              <div className="t1mo-row t1mo-header">
                <span className="t1mo-label"></span>
                <span className="t1mo-col-l">Last</span>
                <span className="t1mo-col-r">Prev</span>
              </div>
              {([
                { label: 'Open',    l: lastC?.open,  p: prevC?.open  },
                { label: 'High',    l: lastC?.high,  p: prevC?.high  },
                { label: 'Mid Prc', l: midPrc,        p: prevMid      },
                { label: 'Low',     l: lastC?.low,   p: prevC?.low   },
                { label: 'Close',   l: lastC?.close, p: prevC?.close, bold: true },
              ] as Array<{ label: string; l?: number | null; p?: number | null; bold?: boolean }>).map(({ label, l, p, bold }) => (
                <div key={label} className="t1mo-row">
                  <span className="t1mo-label">{label}</span>
                  <span className={`t1mo-col-l mono${bold ? ' t1mo-close-val' : ''}`}>{fmt(l, 2)}</span>
                  <span className="t1mo-col-r mono">{fmt(p, 2)}</span>
                </div>
              ))}
              {/* Change */}
              <div className="t1mo-row t1mo-change-row">
                <span className="t1mo-label">Change</span>
                <span className={`t1mo-col-l mono ${rpIsUp ? 'up' : 'down'}`}>
                  {lastC && prevC ? `${rpIsUp ? '+' : ''}${(lastC.close - prevC.close).toFixed(2)}` : '—'}
                </span>
                <span className={`t1mo-col-r mono ${rpIsUp ? 'up' : 'down'}`}>
                  {rpChange !== 0 ? `${rpIsUp ? '+' : ''}${rpChange.toFixed(2)}%` : '0.00%'}
                </span>
              </div>
              {/* CP row */}
              <div className="t1mo-row">
                <span className="t1mo-label">CP</span>
                <span className={`t1mo-col-l mono t1mo-cp-score ${
                  (signal?.confidence ?? 50) > 70 ? 'cp-hi' : (signal?.confidence ?? 50) > 40 ? 'cp-mid' : 'cp-lo'
                }`}>
                  {signal?.confidence != null ? signal.confidence.toFixed(2) : '—'}
                </span>
                <span className="t1mo-col-r t1mo-cp-link">[V]</span>
              </div>
              {/* Range */}
              <div className="t1mo-row">
                <span className="t1mo-label">Range</span>
                <span className="t1mo-col-l mono">
                  {lastC ? fmt(lastC.high - lastC.low, 2) : '—'}
                </span>
                <span className={`t1mo-col-r mono ${rangePct != null ? (rangePct >= 0 ? 'up' : 'down') : ''}`}>
                  {rangePct != null ? `${rangePct >= 0 ? '+' : ''}${rangePct.toFixed(2)}%` : '—'}
                </span>
              </div>
              {/* Volume */}
              <div className="t1mo-row">
                <span className="t1mo-label">Volume</span>
                <span className="t1mo-col-l mono">
                  {lastC?.volume != null
                    ? lastC.volume > 1e9 ? `${(lastC.volume/1e9).toFixed(2)}`
                    : lastC.volume > 1e6 ? `${(lastC.volume/1e6).toFixed(2)}`
                    : lastC.volume.toFixed(2)
                    : '—'}
                </span>
                <span className="t1mo-col-r mono">
                  {prevC?.volume != null
                    ? prevC.volume > 1e9 ? `${(prevC.volume/1e9).toFixed(1)} B`
                    : prevC.volume > 1e6 ? `${(prevC.volume/1e6).toFixed(1)} M`
                    : `${prevC.volume.toFixed(0)}`
                    : '—'}
                </span>
              </div>
              {/* VChg / Actual sub-labels */}
              <div className="t1mo-row t1mo-subrow">
                <span></span>
                <span className="t1mo-col-l t1mo-sublabel">VChg</span>
                <span className="t1mo-col-r t1mo-sublabel">Actual</span>
              </div>
            </div>

            {/* Support / Resistance — 3 rows, Indonesian label */}
            {srData && (
              <div className="t1mo-sr-section">
                <div className="t1mo-sr-header">
                  <span className="t1mo-sr-sup-hdr">SUPPORT</span>
                  <span></span>
                  <span className="t1mo-sr-res-hdr">RESISTENSI</span>
                </div>
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="t1mo-sr-row">
                    <span className="t1mo-sup mono up">
                      {srData.supports[i] ? fmt(srData.supports[i].price, 2) : '—'}
                    </span>
                    <span className="t1mo-rank">{i + 1}</span>
                    <span className="t1mo-res mono down">
                      {srData.resistances[i] ? fmt(srData.resistances[i].price, 2) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Indicators — folder (4) exact: HMF · Top Box · Btm Box · Magenta · Lautan · EMA 21 · VWAP · RSI(7) · ATR(14) · ATLAS */}
            {indValues && (
              <div className="t1mo-ind-section">
                <div className="t1mo-ind-title">INDIKATOR</div>
                {(() => {
                  const price  = lastC?.close || rpPrice || 1;
                  const topBox = srData?.resistances?.[0]?.price ?? price * 1.064;
                  const btmBox = srData?.supports?.[0]?.price   ?? price * 1.029;
                  const pct    = (v: number) => (v - price) / price * 100;
                  const pf     = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
                  return ([
                    { label: 'HMF',     val: fmt(indValues.macd, 2),   pct: '',                  color: '#f59e0b', col: '' },
                    { label: 'Top Box', val: fmt(topBox, 2),            pct: pf(pct(topBox)),      color: '#ff6f00', col: pct(topBox) >= 0 ? 'down' : 'up' },
                    { label: 'Btm Box', val: fmt(btmBox, 2),             pct: pf(pct(btmBox)),      color: '#9e9e9e', col: pct(btmBox) >= 0 ? 'down' : 'up' },
                    { label: 'Magenta', val: fmt(indValues.ema21, 2),    pct: pf(pct(indValues.ema21)),  color: '#e91e63', col: pct(indValues.ema21) >= 0 ? 'down' : 'up' },
                    { label: 'Lautan',  val: fmt(indValues.ema50, 2),    pct: pf(pct(indValues.ema50)),  color: '#42a5f5', col: pct(indValues.ema50) >= 0 ? 'down' : 'up' },
                    { label: 'EMA 21',  val: fmt(indValues.ema21, 2),    pct: pf(pct(indValues.ema21)),  color: '#7b61ff', col: pct(indValues.ema21) >= 0 ? 'down' : 'up' },
                    { label: 'VWAP',    val: fmt(indValues.vwap, 2),     pct: pf(pct(indValues.vwap)),   color: '#00bcd4', col: pct(indValues.vwap) >= 0 ? 'down' : 'up' },
                    { label: 'RSI(7)',  val: fmt(indValues.rsi7, 1),    pct: '',                  color: '#7e57c2', col: '' },
                    { label: 'ATR(14)', val: fmt(indValues.atr, 4),     pct: '',                  color: '#90a4ae', col: '' },
                    { label: 'ATLAS',   val: `${signal?.confidence ?? 50}`, pct: '',              color: '#22c55e', col: '' },
                  ] as Array<{ label: string; val: string; pct: string; color: string; col: string }>).map(({ label, val, pct: p, color, col }) => (
                    <div key={label} className="t1mo-ind-row">
                      <span className="t1mo-ind-label" style={{'--ind-c': color} as React.CSSProperties}>{label}</span>
                      <span className={`t1mo-ind-pct mono ${col}`}>{p}</span>
                      <span className="t1mo-ind-val mono">{val}</span>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* KONDISI PASAR — regime section (folder 4) */}
            {regime && (
              <div className="kondisi-pasar-section">
                <div className="kondisi-pasar-hdr">KONDISI PASAR</div>
                <div
                  className="kondisi-pasar-badge"
                  data-regime={regime.regime}
                >
                  <span className="regime-dot"></span>
                  {REGIME_ID_LABELS[regime.regime] ?? regime.regime}
                </div>
                <div className="kondisi-pasar-warn">
                  <AlertTriangle size={9}/> Eksekusi manual — tidak ada auto trade
                </div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════
            WATCHLIST TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'watchlist' && (
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
        {activeTab === 'ai' && (
          <div className="rp-ai">
            {/* Header */}
            <div className="ai-header">
              <div className="ai-model-badge">ATLAS Local AI</div>
              <span className="ai-status">● Active</span>
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
        {activeTab === 'risk' && (
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
                {killActive ? 'STOP — Kill Switch Active' : 'Trade Allowed'}
              </div>
            </div>

            {/* Risk params */}
            <div className="risk-params">
              {riskParams.map(({ label, key, suffix, step, min }) => (
                <div key={key} className="risk-param-row">
                  <span className="risk-param-icon">—</span>
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

        {/* ════════════════════════════════════════════════════════════════
            DATA WINDOW TAB
        ════════════════════════════════════════════════════════════════ */}
        {activeTab === 'data' && (
          <div className="rp-data-window">
            <div className="section-hdr">Data Window</div>
            {lastC ? (
              <div className="t1mo-table">
                {[
                  { label: 'Open',   val: lastC.open },
                  { label: 'High',   val: lastC.high },
                  { label: 'Low',    val: lastC.low  },
                  { label: 'Close',  val: lastC.close },
                  { label: 'Volume', val: lastC.volume },
                ].map(({ label, val }) => (
                  <div key={label} className="t1mo-row">
                    <span className="t1mo-label">{label}</span>
                    <span className="t1mo-col-l mono">{fmt(val, 4)}</span>
                  </div>
                ))}
                {indValues && (
                  <>
                    <div className="t1mo-row"><span className="t1mo-label">RSI(14)</span><span className="t1mo-col-l mono">{fmt(indValues.rsi, 2)}</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">RSI(7)</span><span className="t1mo-col-l mono">{fmt(indValues.rsi7, 2)}</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">MACD</span><span className="t1mo-col-l mono">{fmt(indValues.macd, 4)}</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">ADX(14)</span><span className="t1mo-col-l mono">{fmt(indValues.adx, 2)}</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">ATR(14)</span><span className="t1mo-col-l mono">{fmt(indValues.atr, 4)}</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">VWAP</span><span className="t1mo-col-l mono">{fmt(indValues.vwap, 2)}</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">EMA(9)</span><span className="t1mo-col-l mono">{fmt(indValues.ema9, 2)}</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">EMA(21)</span><span className="t1mo-col-l mono">{fmt(indValues.ema21, 2)}</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">EMA(50)</span><span className="t1mo-col-l mono">{fmt(indValues.ema50, 2)}</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">BB Width</span><span className="t1mo-col-l mono">{fmt(indValues.bbBw, 4)}</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">VWAP Δ</span><span className={`t1mo-col-l mono ${indValues.vwapDelta >= 0 ? 'up' : 'down'}`}>{indValues.vwapDelta >= 0 ? '+' : ''}{fmt(indValues.vwapDelta, 2)}%</span></div>
                    <div className="t1mo-row"><span className="t1mo-label">Vol Spike</span><span className={`t1mo-col-l mono ${indValues.volSpike ? 'up' : ''}`}>{indValues.volSpike ? 'YES' : 'no'}</span></div>
                  </>
                )}
              </div>
            ) : (
              <div className="rp-no-data"><span>Tidak ada data candle</span></div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════
            CALENDAR / NEWS / ALERTS / MISC TABS — functional stubs
        ════════════════════════════════════════════════════════════════ */}
        {['calendar', 'news', 'alerts', 'plan', 'objects', 'pine', 'keyboard', 'help'].includes(activeTab) && (
          <div style={{ padding: '16px 12px' }}>
            <div className="section-hdr" style={{ textTransform: 'capitalize' }}>{activeTab}</div>
            <div style={{ color: 'var(--aq-text2)', fontSize: 11, lineHeight: 1.6, marginTop: 8 }}>
              {activeTab === 'calendar' && 'Economic Calendar — data coming soon. Upcoming events: FOMC, CPI, NFP.'}
              {activeTab === 'news'     && 'News Flow — live crypto news feed akan tersedia setelah integrasi API berita selesai.'}
              {activeTab === 'alerts'   && 'Alerts — fitur price alert akan tersedia. Klik tombol Alert di TopBar untuk membuat alert baru.'}
              {activeTab === 'plan'     && 'Trading Plan — buat dan simpan rencana trade Anda di sini (coming soon).'}
              {activeTab === 'objects'  && 'Object Tree — daftar semua drawing objects di chart akan tampil di sini.'}
              {activeTab === 'pine'     && 'Script Editor — Pine Script editor akan tersedia di versi berikutnya.'}
              {activeTab === 'keyboard' && (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Keyboard Shortcuts</div>
                  {[['Alt+1', 'Candlestick'],['Alt+2', 'Bar Chart'],['Alt+3', 'Line'],['Alt+4', 'Area'],
                    ['Ctrl+Z', 'Undo drawing'],['Esc', 'Cancel drawing'],['F', 'Fit content'],
                    ['⚡', 'Super Refresh 1s'],].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                      <kbd style={{ background: 'var(--aq-bg3)', padding: '1px 5px', borderRadius: 3, fontSize: 10, fontFamily: 'monospace' }}>{k}</kbd>
                      <span>{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'help'     && 'Dokumentasi ATLAS-QUANT tersedia di GitHub. Hubungi support untuk bantuan lebih lanjut.'}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
