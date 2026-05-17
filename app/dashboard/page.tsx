'use client';
/**
 * /dashboard — FAITHFUL PORT dari E:\CLAUDE DESIGN\ATLAS-QUANT (2)\AtlasQuant Dashboard.html
 *
 * Struktur EXACT:
 *   .atlas-app (grid 3x3) =
 *     .topbar      (logo + symbol search + price + TF + actions + lang/theme)
 *     .left-sidebar (nav + 43 drawing tools)
 *     .main-area    (chart-toolbar + chart-panels[main/vol/sub])
 *     .right-panel  (symbol-hdr + tabs[Signal/Watchlist/AI/Risk] + content)
 *     .status-bar
 *
 * Data dari API yang sudah ada:
 *   - /api/market/symbols (3000+ aset)
 *   - /api/quant/t1mo (T1MO + local-brain)
 *   - /api/quant/indicators (registry browse)
 *   - /api/quant/compute (SMC_RR_FIB, dll)
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import TopBar from '@/components/aq/TopBar';
import LeftSidebar from '@/components/aq/LeftSidebar';
import RightPanel from '@/components/aq/RightPanel';
import StatusBar from '@/components/aq/StatusBar';

const T1MOChart = dynamic(() => import('@/components/T1MOChart'), { ssr: false });
const IndicatorModal = dynamic(() => import('@/components/aq/IndicatorModal'), { ssr: false });

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };

interface T1MOResponse {
  symbol: string;
  timeframe: string;
  params: Record<string, number>;
  candles: Candle[];
  t1mo: {
    series: {
      backbone: (number | null)[];
      magenta: (number | null)[];
      topBox: (number | null)[];
      btmBox: (number | null)[];
      hmf: (number | null)[];
      regimeStrength: number[];
    };
    levels?: Array<{ key: string; value: number; label?: string; color?: string }>;
    meta?: { regimeColors?: string[]; backboneLen?: number; magentaLen?: number };
  };
  brain: {
    regime: string;
    regimeConfidence: number;
    signalScore: number;
    bias: 'long' | 'short' | 'flat';
    commentary: string;
    rationale: string[];
    risks: string[];
    validity: 'strong' | 'moderate' | 'weak' | 'invalid';
    forecastReturnPct: number;
    volPercentile: number;
    provider: string;
    model: string;
    ensembleVotes: Record<string, number>;
  };
}

const REGIME_COLOR: Record<string, string> = {
  strong_bull: '#089981',
  weak_bull: '#26a69a',
  neutral: '#787b86',
  weak_bear: '#f57c00',
  strong_bear: '#f23645',
  high_vol_chop: '#a855f7',
  low_vol_drift: '#42a5f5',
};

const REGIME_LABEL_ID: Record<string, string> = {
  strong_bull: 'Bullish Kuat',
  weak_bull: 'Bullish Lemah',
  neutral: 'Netral',
  weak_bear: 'Bearish Lemah',
  strong_bear: 'Bearish Kuat',
  high_vol_chop: 'Volatil Chop',
  low_vol_drift: 'Drift Low-Vol',
};

export default function Dashboard() {
  const router = useRouter();
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [tf, setTf] = useState<string>('15m');
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [data, setData] = useState<T1MOResponse | null>(null);
  const [showIndicators, setShowIndicators] = useState(false);
  const [showSignals, setShowSignals] = useState(true);
  const [activeIndicators, setActiveIndicators] = useState<string[]>([
    'T1MO_CORE', 'SMC_RR_FIB', 'EMA_9', 'EMA_21', 'EMA_50', 'VWAP', 'RSI_7',
  ]);
  const [universeSize, setUniverseSize] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [, setActiveTool] = useState<string>('cursor');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const adminTk = localStorage.getItem('atlas-admin-token');
    const userTk = localStorage.getItem('session_token');
    if (!adminTk && !userTk) {
      // Allow chart demo without login: keep route public.
    }
    const savedTheme = (localStorage.getItem('atlas-theme') as 'dark' | 'light') || 'dark';
    const savedLang = (localStorage.getItem('atlas-lang') as 'id' | 'en') || 'id';
    setTheme(savedTheme); setLang(savedLang);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, [router]);

  const loadData = useCallback(async (sym: string, timeframe: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/quant/t1mo?symbol=${sym}&tf=${timeframe}&limit=400&lang=${lang}`);
      if (r.ok) setData(await r.json() as T1MOResponse);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [lang]);

  useEffect(() => {
    loadData(symbol, tf);
    const id = setInterval(() => loadData(symbol, tf), 60_000);
    return () => clearInterval(id);
  }, [symbol, tf, loadData]);

  useEffect(() => {
    fetch('/api/market/symbols?limit=1&expand=true').then((r) => r.json()).then((d) => setUniverseSize(d.universeSize ?? d.total ?? 0)).catch(() => null);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('atlas-theme', next); } catch { /* ignore */ }
      return next;
    });
  }, []);
  const toggleLang = useCallback(() => {
    setLang((l) => {
      const next = l === 'id' ? 'en' : 'id';
      try { localStorage.setItem('atlas-lang', next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const last = data?.candles?.[data.candles.length - 1];
  const lastPrice = last?.close ?? 0;
  const prev = data?.candles?.[(data.candles.length ?? 1) - 2];
  const changePct = prev ? ((lastPrice - prev.close) / prev.close) * 100 : 0;

  const brain = data?.brain;
  const t1moMeta = data?.t1mo?.meta as { regimeColors?: string[]; backboneLen?: number; magentaLen?: number } | undefined;
  const regimeKey = brain?.regime ?? 'neutral';
  const regimeColor = REGIME_COLOR[regimeKey] || '#787b86';

  const signalShape = useMemo(() => {
    if (!brain || !last) return undefined;
    const bias = brain.bias;
    const type: 'BUY' | 'SELL' | 'NEUTRAL' = bias === 'long' ? 'BUY' : bias === 'short' ? 'SELL' : 'NEUTRAL';
    const atr = Math.abs((data?.candles ?? []).slice(-14).reduce((s, c) => s + (c.high - c.low), 0) / 14);
    const dir = bias === 'long' ? 1 : bias === 'short' ? -1 : 0;
    const sl = last.close - dir * atr * 1.2;
    const tp1 = last.close + dir * atr * 1.5;
    const tp2 = last.close + dir * atr * 2.5;
    const tp3 = last.close + dir * atr * 4;
    return {
      type, confidence: brain.regimeConfidence, strategy: 'AQ_LOCAL_BRAIN',
      entry: last.close, tp1, tp2, tp3, sl,
      rr: atr === 0 ? 0 : Math.abs(tp1 - last.close) / Math.abs(sl - last.close),
      atr,
      regimeLabel: (lang === 'id' ? REGIME_LABEL_ID[regimeKey] : regimeKey.replace(/_/g, ' ')).toUpperCase(),
      regimeColor,
      indicators: data?.t1mo?.meta
        ? {
            Backbone: (t1moMeta as { lastBackbone?: number })?.lastBackbone,
            Magenta: (t1moMeta as { lastMagenta?: number })?.lastMagenta,
            'Top Box': (t1moMeta as { lastTopBox?: number })?.lastTopBox,
            'Btm Box': (t1moMeta as { lastBtmBox?: number })?.lastBtmBox,
            HMF: (t1moMeta as { lastHmf?: number })?.lastHmf,
          }
        : undefined,
    };
  }, [brain, last, data?.candles, data?.t1mo?.meta, t1moMeta, regimeKey, regimeColor, lang]);

  return (
    <div className="atlas-app">
      <TopBar
        symbol={symbol}
        tf={tf}
        price={lastPrice}
        changePct={changePct}
        exchange="BINANCE"
        lang={lang}
        theme={theme}
        onSymbol={setSymbol}
        onTf={setTf}
        onToggleTheme={toggleTheme}
        onToggleLang={toggleLang}
        onOpenIndicators={() => setShowIndicators(true)}
        onToggleSignals={() => setShowSignals((v) => !v)}
        showSignals={showSignals}
      />

      <LeftSidebar activePage="chart" onTool={setActiveTool} />

      <div className="main-area">
        <div className="chart-toolbar">
          <div className="chart-type-btns">
            {['📊', '┃', '⌒', '▱', '◐'].map((ic, i) => (
              <button key={i} className={`chart-type-btn ${i === 0 ? 'active' : ''}`}>{ic}</button>
            ))}
          </div>
          <div className="toolbar-sep" />
          <div className="chart-ohlcv-info">
            {last && (
              <>
                <span className="ohlcv-sym">{symbol}</span>
                {(['O', 'H', 'L', 'C'] as const).map((k, i) => {
                  const v = [last.open, last.high, last.low, last.close][i];
                  return (
                    <span key={k} className="ohlcv-item">
                      <span className="ohlcv-label">{k}</span>
                      <span className={`ohlcv-value mono ${changePct >= 0 ? 'up' : 'down'}`}>{v.toFixed(2)}</span>
                    </span>
                  );
                })}
                <span className="ohlcv-item">
                  <span className="ohlcv-label">V</span>
                  <span className="ohlcv-value mono">{(last.volume / 1000).toFixed(1)}K</span>
                </span>
              </>
            )}
          </div>
          <div style={{ flex: 1 }} />
          <div className="chart-right-tools">
            <button className={`chart-toolbar-btn ${showSignals ? 'active' : ''}`} onClick={() => setShowSignals(!showSignals)}>
              <span>⚡</span><span>Signals</span>
            </button>
            <button className="chart-toolbar-btn">
              <span>OB</span><span>SMC</span>
            </button>
            <button className="chart-toolbar-btn icon-only" title="Log Scale">log</button>
            <button className="chart-toolbar-btn icon-only" title="Auto Scale">↔</button>
          </div>
        </div>

        <div className="chart-panels">
          {data ? (
            <T1MOChart
              candles={data.candles}
              series={data.t1mo.series}
              meta={{ backboneLen: data.params.backbone, magentaLen: data.params.magenta }}
              fibLevels={[]}
              symbol={symbol}
              timeframe={tf}
              height={600}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--tv-text2)', fontSize: 12 }}>
              {loading ? 'Memuat data pasar live…' : 'Pilih simbol untuk memulai.'}
            </div>
          )}
        </div>
      </div>

      <RightPanel
        symbol={symbol}
        symbolName={symbol}
        price={lastPrice}
        changePct={changePct}
        exchange="BINANCE"
        assetClass="crypto"
        lang={lang}
        signal={signalShape}
        brain={brain ? {
          regime: brain.regime,
          regimeConfidence: brain.regimeConfidence,
          signalScore: brain.signalScore,
          commentary: brain.commentary,
          validity: brain.validity,
          model: brain.model,
          provider: brain.provider,
        } : undefined}
        onSymbol={setSymbol}
      />

      <StatusBar
        regime={regimeKey}
        regimeColor={regimeColor}
        activeIndicatorCount={activeIndicators.length}
        universeSize={universeSize}
        symbol={symbol}
        lang={lang}
      />

      <IndicatorModal
        open={showIndicators}
        activeCodes={activeIndicators}
        onClose={() => setShowIndicators(false)}
        onChange={(codes) => setActiveIndicators(codes)}
      />
    </div>
  );
}
