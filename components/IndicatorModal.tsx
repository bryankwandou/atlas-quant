'use client';
import { useMemo, useState } from 'react';
import { X, Search, Layers, Check, Library, Settings } from 'lucide-react';
import { useChartStore } from '@/store/chartStore';

// Map indicator IDs that act as sub-panel selectors → sub-panel ID
const SUB_PANEL_MAP: Record<string, string> = {
  RSI_PANEL:         'rsi',
  MACD_PANEL:        'macd',
  WILLIAMS_PANEL:    'williams',
  STOCHRSI_PANEL:    'stochrsi',
  MFI_PANEL:         'mfi',
  CCI_PANEL:         'cci',
  ADX_PANEL:         'adx',
  OBV_PANEL:         'obv',
  ATR_PANEL:         'atr',
  CMF_PANEL:         'cmf',
  AROON:             'aroon',
  ELDER_RAY:         'elder',
  CVD_PANEL:         'cvd',
  BANDAR_PANEL:      'bandar',
  BANDAR_AD_PANEL:   'bandar_ad',
  VOL_DELTA_PANEL:   'vol_delta',
  BANDAR_SUITE_PANEL:'bandar_suite',
};
import { INDICATOR_REGISTRY, type IndicatorPreset } from '@/core/indicators/registry';
import IndicatorParamModal from './IndicatorParamModal';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SET (for Reset)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_RESET = ['EMA_9', 'EMA_21', 'EMA_50', 'VWAP', 'BB'];

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY CATEGORIES (kept so chart renderer keeps rendering everything it already supported)
// ─────────────────────────────────────────────────────────────────────────────
interface IndicatorItem {
  id: string;
  name: string;
  desc: string;
  disabled?: boolean;
}

interface Category {
  id: string;
  label: string;
  color: string;
  items: IndicatorItem[];
}

const LEGACY_CATEGORIES: Category[] = [
  {
    id: 'Trend', label: 'Trend', color: '#2962ff',
    items: [
      { id: 'EMA_9',      name: 'EMA (9)',         desc: 'Exponential Moving Average, period 9' },
      { id: 'EMA_21',     name: 'EMA (21)',        desc: 'Exponential Moving Average, period 21' },
      { id: 'EMA_50',     name: 'EMA (50)',        desc: 'Exponential Moving Average, period 50' },
      { id: 'EMA_200',    name: 'EMA (200)',       desc: 'Exponential Moving Average, period 200' },
      { id: 'SMA_20',     name: 'SMA (20)',        desc: 'Simple Moving Average, period 20' },
      { id: 'SMA_50',     name: 'SMA (50)',        desc: 'Simple Moving Average, period 50' },
      { id: 'SMA_200',    name: 'SMA (200)',       desc: 'Simple Moving Average, period 200' },
      { id: 'HMA',        name: 'Hull MA (14)',    desc: 'Hull Moving Average, reduces lag' },
      { id: 'ALMA',       name: 'ALMA (21)',       desc: 'Arnaud Legoux Moving Average' },
      { id: 'DEMA',       name: 'DEMA (21)',       desc: 'Double Exponential Moving Average' },
      { id: 'TEMA',       name: 'TEMA (21)',       desc: 'Triple Exponential Moving Average' },
      { id: 'ZLEMA',      name: 'ZLEMA (21)',      desc: 'Zero-Lag Exponential Moving Average' },
      { id: 'WMA_20',     name: 'WMA (20)',        desc: 'Weighted Moving Average, period 20' },
      { id: 'VWMA',       name: 'VWMA (20)',       desc: 'Volume-Weighted Moving Average' },
      { id: 'PSAR',       name: 'Parabolic SAR',   desc: 'Parabolic Stop and Reverse' },
      { id: 'ICHIMOKU',   name: 'Ichimoku Cloud',  desc: 'Ichimoku Kinko Hyo cloud system' },
      { id: 'SUPERTREND', name: 'Supertrend',      desc: 'ATR-based trend-following indicator' },
      { id: 'ADX_PANEL',  name: 'ADX (14)',        desc: 'Average Directional Index, trend strength' },
      { id: 'KAMA',       name: 'KAMA (10)',        desc: 'Kaufman Adaptive Moving Average' },
      { id: 'MCGINLEY',   name: 'McGinley Dyn',    desc: 'McGinley Dynamic MA, auto-adjusting speed' },
      { id: 'T3',         name: 'T3 (5)',           desc: "Tim Tillson's T3 — 5th-order EMA" },
      { id: 'SMMA',       name: 'SMMA / RMA (14)', desc: "Smoothed MA (Wilder's running average)" },
      { id: 'LSMA',       name: 'LSMA (25)',        desc: 'Least Squares / Linear Regression MA' },
      { id: 'VIDYA',      name: 'VIDYA (14)',       desc: 'Variable Index Dynamic Average (adaptive)' },
      { id: 'EMA_RIBBON', name: 'EMA Ribbon',       desc: 'Multiple EMAs: 3,5,8,13,21,34,55,89' },
    ],
  },
  {
    id: 'Momentum', label: 'Momentum', color: '#089981',
    items: [
      { id: 'RSI_PANEL',     name: 'RSI (14)',               desc: 'Relative Strength Index, period 14' },
      { id: 'MACD_PANEL',    name: 'MACD (12,26,9)',         desc: 'Moving Average Convergence Divergence' },
      { id: 'STOCHRSI_PANEL',name: 'Stoch RSI',              desc: 'Stochastic of RSI — faster oscillator' },
      { id: 'STOCH_PANEL',   name: 'Stochastic',             desc: 'Classic Stochastic oscillator' },
      { id: 'WILLIAMS_PANEL',name: 'Williams %R',            desc: 'Williams Percent Range' },
      { id: 'CCI_PANEL',     name: 'CCI (14)',               desc: 'Commodity Channel Index' },
      { id: 'MFI_PANEL',     name: 'MFI (14)',               desc: 'Money Flow Index' },
      { id: 'TSI',           name: 'True Strength Index',    desc: 'Double-smoothed price momentum' },
      { id: 'CMO',           name: 'Chande Momentum',        desc: 'Chande Momentum Oscillator' },
      { id: 'DPO',           name: 'Detrended Price Osc',    desc: 'Eliminates trend to isolate cycles' },
      { id: 'PPO',           name: 'Pct Price Osc',          desc: 'Percentage Price Oscillator' },
      { id: 'ROC',           name: 'Rate of Change',          desc: 'Price rate of change' },
      { id: 'MOM',           name: 'Momentum',                desc: 'Classic momentum indicator' },
      { id: 'TRIX',          name: 'TRIX',                    desc: 'Triple-smoothed EMA percentage change' },
      { id: 'AROON',         name: 'Aroon (25)',              desc: 'Aroon Up/Down oscillator' },
      { id: 'VORTEX',        name: 'Vortex',                  desc: 'Vortex indicator (VI+ vs VI-)' },
      { id: 'ULT_OSC',       name: 'Ultimate Oscillator',    desc: 'Combines 3 timeframes of momentum' },
      { id: 'FISHER',        name: 'Fisher Transform',        desc: 'Converts price to Gaussian distribution' },
      { id: 'COPPOCK',       name: 'Coppock Curve',          desc: 'Long-term momentum indicator' },
      { id: 'WAVETREND',     name: 'WaveTrend (10,21)',       desc: 'LazyBear WaveTrend Oscillator — WT1/WT2' },
      { id: 'STC',           name: 'Schaff Trend Cycle',      desc: 'MACD + stochastic double-smoothed cycle' },
      { id: 'CONNORS_RSI',   name: 'Connors RSI',             desc: '3-component RSI: RSI2 + streak + percentile' },
      { id: 'RVI_PANEL',     name: 'Relative Vigor Index',    desc: 'Open/Close vs High/Low momentum symmetry' },
      { id: 'SMI_PANEL',     name: 'Stoch Momentum Index',    desc: 'Centered stochastic oscillator (SMI)' },
      { id: 'HULL_RSI',      name: 'Hull RSI (14)',           desc: 'RSI smoothed with Hull Moving Average' },
      { id: 'LAG_RSI',       name: 'Laguerre RSI',            desc: 'Ehlers Laguerre RSI — reduced whipsaw' },
    ],
  },
  {
    id: 'Volatility', label: 'Volatility', color: '#ff9800',
    items: [
      { id: 'BB',           name: 'Bollinger Bands',     desc: 'Standard deviation bands around SMA' },
      { id: 'KELTNER',      name: 'Keltner Channel',    desc: 'ATR-based envelope around EMA' },
      { id: 'DONCHIAN',     name: 'Donchian Channel',   desc: 'Highest high / lowest low channel' },
      { id: 'ATR_PANEL',    name: 'ATR (14)',            desc: 'Average True Range, raw volatility' },
      { id: 'CHANDELIER',   name: 'Chandelier Exit',    desc: 'ATR-based trailing stop system' },
      { id: 'HIST_VOL',     name: 'Historical Volatility', desc: 'Realized volatility (annualized)' },
      { id: 'ZSCORE',       name: 'Z-Score',             desc: 'Standard deviations from mean' },
      { id: 'SQUEEZE',      name: 'Squeeze Momentum',    desc: 'BB inside Keltner squeeze indicator' },
      { id: 'CHANDE_KROLL', name: 'Chande Kroll Stop',   desc: 'ATR-based dual stop-loss system' },
      { id: 'LIN_REG_CHAN', name: 'Linear Reg Channel',  desc: 'Regression channel with std-dev bands' },
    ],
  },
  {
    id: 'Volume', label: 'Volume', color: '#00bcd4',
    items: [
      { id: 'VWAP',      name: 'VWAP',                  desc: 'Volume-Weighted Average Price (intraday)' },
      { id: 'VWAP_BANDS',name: 'VWAP Bands',            desc: 'Standard deviation bands around VWAP' },
      { id: 'VOLUME',    name: 'Volume',                 desc: 'Raw volume histogram' },
      { id: 'OBV_PANEL', name: 'On Balance Volume',     desc: 'Cumulative volume pressure' },
      { id: 'CMF_PANEL', name: 'Chaikin Money Flow',    desc: 'Money flow pressure oscillator' },
      { id: 'AD_LINE',   name: 'Accum/Distribution',    desc: 'Accumulation/distribution line' },
      { id: 'MFI_PANEL', name: 'Money Flow Index',      desc: 'RSI using volume-weighted prices' },
      { id: 'PVO',       name: 'Pct Volume Osc',        desc: 'Percentage Volume Oscillator' },
      { id: 'PVT',       name: 'Price Volume Trend',    desc: 'Cumulative % price change × volume' },
      { id: 'EMV_PANEL', name: 'Ease of Movement',      desc: 'Price movement relative to volume' },
      { id: 'KVO_PANEL', name: 'Klinger Vol Osc',       desc: 'Volume trend oscillator by Stephen Klinger' },
      { id: 'PVI_PANEL', name: 'Positive Volume Idx',   desc: 'Tracks price change on rising volume days' },
      { id: 'NVI_PANEL', name: 'Negative Volume Idx',   desc: 'Tracks price change on falling volume days' },
    ],
  },
  {
    id: 'SMC', label: 'SMC', color: '#f23645',
    items: [
      { id: 'SMC_OB',    name: 'Order Blocks',          desc: 'Institutional order block zones' },
      { id: 'SMC_FVG',   name: 'Fair Value Gaps',       desc: 'Imbalance / FVG zones' },
      { id: 'SMC_BOS',   name: 'Break of Structure',    desc: 'BOS break of market structure' },
      { id: 'SMC_CHOCH', name: 'CHoCH',                 desc: 'Change of Character signal' },
      { id: 'SMC_ZONES', name: 'Supply/Demand Zones',   desc: 'Supply and demand areas' },
    ],
  },
  {
    id: 'Quantitative', label: 'Quantitative', color: '#9c27b0',
    items: [
      { id: 'HIST_VOL',  name: 'Historical Volatility', desc: 'Realized annualized volatility' },
      { id: 'ZSCORE',    name: 'Z-Score',               desc: 'Statistical deviation from mean' },
      { id: 'SQUEEZE',   name: 'Squeeze Momentum',      desc: 'Volatility compression indicator' },
      { id: 'FORCE',     name: 'Force Index',           desc: 'Elder Force Index (power of move)' },
      { id: 'ELDER_RAY', name: 'Elder Ray',             desc: 'Bull/Bear power from EMA' },
      { id: 'MASS_IDX',  name: 'Mass Index',            desc: 'Range expansion reversal signal' },
      { id: 'SR_LEVELS', name: 'Support/Resistance',    desc: 'Auto-detected S/R price levels' },
      { id: 'PIVOTS',    name: 'Pivot Points',          desc: 'Daily standard pivot point levels' },
      { id: 'BOP_PANEL', name: 'Balance of Power',      desc: 'Bull/bear strength: (Close-Open)/(High-Low)' },
      { id: 'REX_PANEL', name: 'Rex Oscillator',        desc: 'TVS oscillator — price vs OHLC midpoint' },
      { id: 'HEIKIN_ASHI',name: 'Heikin-Ashi',          desc: 'Smoothed candle chart for trend clarity' },
    ],
  },
  {
    id: 'BillWilliams', label: 'Bill Williams', color: '#e91e63',
    items: [
      { id: 'ALLIGATOR',  name: 'Alligator',            desc: 'Three SMMA lines: Jaw (13), Teeth (8), Lips (5)' },
      { id: 'FRACTALS',   name: 'Fractals',             desc: 'Up/down fractal reversal points (Bill Williams)' },
      { id: 'AO_PANEL',   name: 'Awesome Oscillator',   desc: '5-34 SMA of midpoints — market momentum' },
      { id: 'AC_PANEL',   name: 'Accelerator Osc',      desc: 'AO minus 5-SMA of AO — acceleration of momentum' },
      { id: 'GATOR_PANEL',name: 'Gator Oscillator',     desc: 'Alligator jaw-teeth-lips divergence histogram' },
      { id: 'BWMFI_PANEL',name: 'Market Facilitation',  desc: 'BW MFI — tick volume facilitation index' },
    ],
  },
  {
    id: 'Bandarmologi', label: 'Bandarmologi', color: '#e91e63',
    items: [
      { id: 'BANDAR_SUITE_PANEL', name: 'Bandar Suite (Multi)',  desc: 'All-in-one: Bandar Score + CVD% + MFI + CMF% + OBV% — 6 indicators normalized 0–100 in one panel' },
      { id: 'BANDAR_PANEL',       name: 'Bandar Detector',      desc: 'Composite 0–100 smart-money accumulation score — blends CVD, A/D, OBV, CMF, MFI slopes. >55 = akumulasi, <45 = distribusi' },
      { id: 'CVD_PANEL',          name: 'CVD — Cumul Vol Delta', desc: 'Cumulative Volume Delta: per-bar buy/sell pressure from candle body+close position. Rising = net accumulation' },
      { id: 'BANDAR_AD_PANEL',    name: 'Bandar A/D Line',      desc: 'Accumulation/Distribution + EMA signal + oscillator histogram. Shows where big money is quietly entering/exiting' },
      { id: 'VOL_DELTA_PANEL',    name: 'Volume Delta (Buy/Sell)',desc: 'Buy-vol (green) vs Sell-vol (red) bars with Delta EMA trend line. Visual of net order flow per candle' },
      { id: 'OBV_PANEL',          name: 'On Balance Volume',     desc: 'Cumulative volume pressure — classic Bandar tracking indicator' },
      { id: 'CMF_PANEL',          name: 'Chaikin Money Flow',    desc: 'Rolling money flow oscillator −1→+1. Positive = bandar accumulating' },
      { id: 'MFI_PANEL',          name: 'Money Flow Index',      desc: 'RSI of money flow using volume-weighted prices. OB/OS zones detect bandar overextension' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMBINED CATEGORIES — legacy + registry-derived dynamic categories
// ─────────────────────────────────────────────────────────────────────────────

interface ExtendedCategory {
  id: string;
  label: string;
  color: string;
  items: IndicatorItem[];
  source: 'legacy' | 'library';
}

const PALETTE: Record<string, string> = {
  'Moving Average':        '#2962ff',
  'Momentum':              '#089981',
  'Volatility':            '#ff9800',
  'Volume':                '#00bcd4',
  'Trend':                 '#1e88e5',
  'Oscillator':            '#43a047',
  'Support & Resistance':  '#8e24aa',
  'Smart Money':           '#f23645',
  'Bill Williams':         '#e91e63',
  'Adaptive':              '#3f51b5',
  'Statistical':           '#5d6d7e',
  'Composite':             '#9c27b0',
  'External Factor':       '#ff6f00',
  'Microstructure':        '#26a69a',
  'Sentiment':             '#d81b60',
  'On-Chain':              '#00897b',
};

function buildExtendedCategories(): ExtendedCategory[] {
  const legacy: ExtendedCategory[] = LEGACY_CATEGORIES.map((c) => ({ ...c, source: 'legacy' as const }));

  // Group registry presets by their category field
  const byCat: Record<string, IndicatorPreset[]> = {};
  for (const p of INDICATOR_REGISTRY) {
    (byCat[p.category] ||= []).push(p);
  }
  const palette: Record<string, string> = {
    'Moving Average':        '#2962ff',
    'Momentum':              '#089981',
    'Volatility':            '#ff9800',
    'Volume':                '#00bcd4',
    'Trend':                 '#1e88e5',
    'Oscillator':            '#43a047',
    'Support & Resistance':  '#8e24aa',
    'Smart Money':           '#f23645',
    'Bill Williams':         '#e91e63',
    'Adaptive':              '#3f51b5',
    'Statistical':           '#5d6d7e',
    'Composite':             '#9c27b0',
    'External Factor':       '#ff6f00',
    'Microstructure':        '#26a69a',
    'Sentiment':             '#d81b60',
    'On-Chain':              '#00897b',
  };

  const libraryCats: ExtendedCategory[] = Object.entries(byCat).map(([cat, items]) => ({
    id: `lib:${cat}`,
    label: `${cat}`,
    color: palette[cat] ?? '#546e7a',
    source: 'library' as const,
    items: items.slice(0, 250).map((p) => ({ id: p.id, name: p.name, desc: `${p.description} · ${p.author}` })),
  }));

  return [
    ...legacy,
    ...libraryCats,
  ];
}

const CATEGORIES: ExtendedCategory[] = buildExtendedCategories();

// ─────────────────────────────────────────────────────────────────────────────
// SMART SEARCH (TradingView-style)
// Score: exact > short > name prefix > keyword > contains
// ─────────────────────────────────────────────────────────────────────────────

interface FlatItem extends IndicatorItem {
  catId: string;
  catColor: string;
  catLabel: string;
  /** flat keywords for searching */
  keywords?: string[];
  short?: string;
  author?: string;
}

function flattenAll(): FlatItem[] {
  const out: FlatItem[] = [];
  for (const cat of CATEGORIES) {
    for (const item of cat.items) {
      const reg = INDICATOR_REGISTRY.find((p) => p.id === item.id);
      out.push({
        ...item,
        catId: cat.id,
        catColor: cat.color,
        catLabel: cat.label,
        keywords: reg?.keywords,
        short: reg?.short,
        author: reg?.author,
      });
    }
  }
  return out;
}

function scoreItem(item: FlatItem, qLow: string): number {
  if (!qLow) return 0;
  const id = item.id.toLowerCase();
  const name = item.name.toLowerCase();
  const desc = item.desc.toLowerCase();
  const short = (item.short || '').toLowerCase();
  let score = 0;
  if (id === qLow) score += 1000;
  if (short === qLow) score += 900;
  if (name === qLow) score += 800;
  if (id.startsWith(qLow)) score += 500;
  if (name.startsWith(qLow)) score += 400;
  if (short.startsWith(qLow)) score += 350;
  if (id.includes(qLow)) score += 200;
  if (name.includes(qLow)) score += 180;
  if (desc.includes(qLow)) score += 80;
  if (item.keywords?.some((k) => k.toLowerCase() === qLow)) score += 150;
  if (item.keywords?.some((k) => k.toLowerCase().includes(qLow))) score += 60;
  return score;
}

/** Score a raw registry preset (search across the FULL 16k catalog, TradingView-style). */
function scorePreset(p: IndicatorPreset, qLow: string): number {
  if (!qLow) return 0;
  const id = p.id.toLowerCase();
  const name = p.name.toLowerCase();
  const short = (p.short || '').toLowerCase();
  const desc = (p.description || '').toLowerCase();
  let score = 0;
  if (id === qLow) score += 1000;
  if (short === qLow) score += 900;
  if (name === qLow) score += 800;
  if (id.startsWith(qLow)) score += 500;
  if (name.startsWith(qLow)) score += 400;
  if (short.startsWith(qLow)) score += 350;
  if (id.includes(qLow)) score += 200;
  if (name.includes(qLow)) score += 180;
  if ((p.author || '').toLowerCase().includes(qLow)) score += 120;
  if (desc.includes(qLow)) score += 80;
  if (p.keywords?.some((k) => k.toLowerCase() === qLow)) score += 150;
  if (p.keywords?.some((k) => k.toLowerCase().includes(qLow))) score += 60;
  return score;
}

function presetToFlat(p: IndicatorPreset): FlatItem {
  return {
    id: p.id,
    name: p.name,
    desc: `${p.description ?? ''} · ${p.author}`,
    catId: `lib:${p.category}`,
    catColor: PALETTE[p.category] ?? '#546e7a',
    catLabel: p.category,
    keywords: p.keywords,
    short: p.short,
    author: p.author,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function IndicatorModal() {
  const {
    activeIndicators,
    toggleIndicator,
    resetIndicators,
    closeIndicatorModal,
    showIndicatorModal,
    setSubPanel,
    subPanels,
  } = useChartStore();

  const handleItemClick = (item: IndicatorItem) => {
    if (item.disabled) return;
    const panelId = SUB_PANEL_MAP[item.id];
    if (panelId) {
      setSubPanel(panelId); // toggles: add if absent, remove if present
    } else {
      toggleIndicator(item.id);
    }
  };

  const [search, setSearch]   = useState('');
  const [activeCat, setActiveCat] = useState('Trend');
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [paramFor, setParamFor] = useState<string | null>(null);

  const allFlat = useMemo(() => flattenAll(), []);

  // Search the FULL 16k registry (not just the ~250/category browse slices).
  const searchResults: FlatItem[] | null = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return null;
    // Legacy items first (they actually render on the chart), then the full library.
    const legacyHits = allFlat
      .map((i) => ({ item: i, score: scoreItem(i, q) }))
      .filter(({ score }) => score > 0);
    const legacyIds = new Set(legacyHits.map((h) => h.item.id));
    const libHits: { item: FlatItem; score: number }[] = [];
    for (const p of INDICATOR_REGISTRY) {
      if (legacyIds.has(p.id)) continue;
      const score = scorePreset(p, q);
      if (score > 0) libHits.push({ item: presetToFlat(p), score });
    }
    return [...legacyHits, ...libHits]
      .sort((a, b) => b.score - a.score)
      .slice(0, 300)
      .map(({ item }) => item);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  if (!showIndicatorModal) return null;

  const isActive = (id: string) => activeIndicators.includes(id);

  const currentCat  = CATEGORIES.find(c => c.id === activeCat);
  const displayList = (searchResults ?? (currentCat?.items ?? [])) as Array<IndicatorItem & Partial<FlatItem>>;

  const handleClose = () => closeIndicatorModal();

  const handleReset = () => {
    DEFAULT_RESET.forEach(id => { if (!activeIndicators.includes(id)) toggleIndicator(id); });
    activeIndicators.forEach(id => { if (!DEFAULT_RESET.includes(id)) toggleIndicator(id); });
  };

  const totalRegistryCount = INDICATOR_REGISTRY.length;

  return (
    <div className="indicator-modal-overlay" onClick={handleClose}>
      <div className="indicator-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ───────────────────────────────────────── */}
        <div className="indmod-header">
          <div className="indmod-title">
            <Layers size={14} />
            <span>Indicators</span>
            <span className="indmod-count">
              {totalRegistryCount}+ available
            </span>
          </div>
          <div className="indmod-search-wrap">
            <Search size={12} className="indmod-search-icon" />
            <input
              className="indmod-search ind-search"
              placeholder="Search indicators, scripts, oscillators…"
              value={search}
              autoFocus
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button type="button" className="indmod-close" onClick={handleClose} title="Close indicators panel" aria-label="Close">
            <X size={15} />
          </button>
        </div>

        {/* ── Body ─────────────────────────────────────────── */}
        <div className="indmod-body">

          {/* Category sidebar */}
          {!searchResults && (
            <div className="indmod-cats ind-modal-left">
              {CATEGORIES.map(cat => {
                const count = cat.items.filter(i => isActive(i.id)).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`indmod-cat-btn ind-cat-item${activeCat === cat.id ? ' active' : ''}`}
                    onClick={() => setActiveCat(cat.id)}
                    style={activeCat === cat.id ? { borderLeftColor: cat.color } : {}}
                  >
                    {cat.source === 'library' ? (
                      <Library size={10} className="indmod-lib-icon" />
                    ) : (
                      <span className="indmod-cat-dot" style={{ background: cat.color }} />
                    )}
                    <span className="indmod-cat-name">{cat.label}</span>
                    {count > 0 && (
                      <span className="indmod-cat-count" style={{ background: cat.color }}>
                        {count}
                      </span>
                    )}
                    <span className="indmod-cat-count-num">
                      {cat.items.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Indicator list */}
          <div className="indmod-items ind-modal-right">
            {displayList.map(item => (
              <div
                key={item.id}
                className={`indmod-item ind-list-item${isActive(item.id) ? ' active' : ''}${item.disabled ? ' disabled' : ''}${SUB_PANEL_MAP[item.id] ? ' sub-panel-item' : ''}`}
                onClick={() => handleItemClick(item)}
                title={item.desc}
                onMouseEnter={() => setTooltip(item.desc)}
                onMouseLeave={() => setTooltip(null)}
              >
                <div className="indmod-item-left">
                  <div
                    className="indmod-item-check"
                    style={isActive(item.id) ? {
                      background: (item as any).catColor ?? currentCat?.color ?? '#2962ff',
                      borderColor: (item as any).catColor ?? currentCat?.color ?? '#2962ff',
                    } : {}}
                  >
                    {isActive(item.id) && <Check size={9} color="#fff" strokeWidth={3} />}
                  </div>
                  <div className="indmod-item-info">
                    <div className="indmod-item-name">{item.name}</div>
                    <div className="indmod-item-id">
                      {item.id}
                      {(item as any).author && (
                        <span className="indmod-item-author">· {(item as any).author}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="indmod-item-right indmod-item-right-wrap">
                  {item.disabled && (
                    <span className="indmod-default-badge indmod-soon-badge">
                      Soon
                    </span>
                  )}
                  {!item.disabled && SUB_PANEL_MAP[item.id] && (
                    <span className={`indmod-panel-badge${subPanels.includes(SUB_PANEL_MAP[item.id]) ? ' active' : ''}`}>
                      {subPanels.includes(SUB_PANEL_MAP[item.id]) ? 'Active' : 'Panel'}
                    </span>
                  )}
                  {!item.disabled && !SUB_PANEL_MAP[item.id] && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setParamFor(item.id); }}
                      title="Configure parameters"
                      className="indmod-cfg-btn"
                    >
                      <Settings size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {searchResults && searchResults.length === 0 && (
              <div className="indmod-empty">No indicators found for &quot;{search}&quot;</div>
            )}
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div className="indmod-footer ind-modal-footer">
          <span className="indmod-active-count">
            {activeIndicators.length} active · {totalRegistryCount}+ in library
          </span>
          <button type="button" className="indmod-reset-btn" onClick={handleReset}>
            Reset defaults
          </button>
          <button type="button" className="indmod-apply-btn" onClick={handleClose}>
            Apply &amp; Close
          </button>
        </div>
      </div>

      {/* Per-indicator parameter editor */}
      <IndicatorParamModal presetId={paramFor} onClose={() => setParamFor(null)} />
    </div>
  );
}
