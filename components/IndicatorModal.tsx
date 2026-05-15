'use client';
import { useState } from 'react';
import { X, Search, Layers, Check } from 'lucide-react';
import { useChartStore } from '@/store/chartStore';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT SET (for Reset)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_RESET = ['EMA_9', 'EMA_21', 'EMA_50', 'VWAP', 'BB'];

// ─────────────────────────────────────────────────────────────────────────────
// INDICATOR CATALOGUE
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

const CATEGORIES: Category[] = [
  {
    id: 'Trend',
    label: 'Trend',
    color: '#2962ff',
    items: [
      { id: 'EMA_9',      name: 'EMA (9)',        desc: 'Exponential Moving Average, period 9' },
      { id: 'EMA_21',     name: 'EMA (21)',       desc: 'Exponential Moving Average, period 21' },
      { id: 'EMA_50',     name: 'EMA (50)',       desc: 'Exponential Moving Average, period 50' },
      { id: 'EMA_200',    name: 'EMA (200)',      desc: 'Exponential Moving Average, period 200' },
      { id: 'SMA_20',     name: 'SMA (20)',       desc: 'Simple Moving Average, period 20' },
      { id: 'SMA_50',     name: 'SMA (50)',       desc: 'Simple Moving Average, period 50' },
      { id: 'SMA_200',    name: 'SMA (200)',      desc: 'Simple Moving Average, period 200' },
      { id: 'HMA',        name: 'Hull MA (14)',   desc: 'Hull Moving Average, reduces lag' },
      { id: 'ALMA',       name: 'ALMA (21)',      desc: 'Arnaud Legoux Moving Average' },
      { id: 'DEMA',       name: 'DEMA (21)',      desc: 'Double Exponential Moving Average' },
      { id: 'TEMA',       name: 'TEMA (21)',      desc: 'Triple Exponential Moving Average' },
      { id: 'ZLEMA',      name: 'ZLEMA (21)',     desc: 'Zero-Lag Exponential Moving Average' },
      { id: 'WMA_20',     name: 'WMA (20)',       desc: 'Weighted Moving Average, period 20' },
      { id: 'VWMA',       name: 'VWMA (20)',      desc: 'Volume-Weighted Moving Average' },
      { id: 'PSAR',       name: 'Parabolic SAR',  desc: 'Parabolic Stop and Reverse' },
      { id: 'ICHIMOKU',   name: 'Ichimoku Cloud', desc: 'Ichimoku Kinko Hyo cloud system' },
      { id: 'SUPERTREND', name: 'Supertrend',     desc: 'ATR-based trend-following indicator' },
      { id: 'ADX_PANEL',  name: 'ADX (14)',       desc: 'Average Directional Index, trend strength' },
    ],
  },
  {
    id: 'Momentum',
    label: 'Momentum',
    color: '#089981',
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
      { id: 'DPO',           name: 'Detrended Price Osc',   desc: 'Eliminates trend to isolate cycles' },
      { id: 'PPO',           name: 'Pct Price Osc',         desc: 'Percentage Price Oscillator' },
      { id: 'ROC',           name: 'Rate of Change',         desc: 'Price rate of change' },
      { id: 'MOM',           name: 'Momentum',               desc: 'Classic momentum indicator' },
      { id: 'TRIX',          name: 'TRIX',                   desc: 'Triple-smoothed EMA percentage change' },
      { id: 'AROON',         name: 'Aroon (25)',             desc: 'Aroon Up/Down oscillator' },
      { id: 'VORTEX',        name: 'Vortex',                 desc: 'Vortex indicator (VI+ vs VI-)' },
      { id: 'ULT_OSC',       name: 'Ultimate Oscillator',   desc: 'Combines 3 timeframes of momentum' },
      { id: 'FISHER',        name: 'Fisher Transform',       desc: 'Converts price to Gaussian distribution' },
      { id: 'COPPOCK',       name: 'Coppock Curve',         desc: 'Long-term momentum indicator' },
    ],
  },
  {
    id: 'Volatility',
    label: 'Volatility',
    color: '#ff9800',
    items: [
      { id: 'BB',        name: 'Bollinger Bands',    desc: 'Standard deviation bands around SMA' },
      { id: 'KELTNER',   name: 'Keltner Channel',   desc: 'ATR-based envelope around EMA' },
      { id: 'DONCHIAN',  name: 'Donchian Channel',  desc: 'Highest high / lowest low channel' },
      { id: 'ATR_PANEL', name: 'ATR (14)',           desc: 'Average True Range, raw volatility' },
      { id: 'CHANDELIER',name: 'Chandelier Exit',   desc: 'ATR-based trailing stop system' },
      { id: 'HIST_VOL',  name: 'Historical Volatility', desc: 'Realized volatility (annualized)' },
      { id: 'ZSCORE',    name: 'Z-Score',            desc: 'Standard deviations from mean' },
      { id: 'SQUEEZE',   name: 'Squeeze Momentum',  desc: 'BB inside Keltner squeeze indicator' },
    ],
  },
  {
    id: 'Volume',
    label: 'Volume',
    color: '#00bcd4',
    items: [
      { id: 'VWAP',      name: 'VWAP',                  desc: 'Volume-Weighted Average Price (intraday)' },
      { id: 'VWAP_BANDS',name: 'VWAP Bands',            desc: 'Standard deviation bands around VWAP' },
      { id: 'VOLUME',    name: 'Volume',                 desc: 'Raw volume histogram' },
      { id: 'OBV_PANEL', name: 'On Balance Volume',     desc: 'Cumulative volume pressure' },
      { id: 'CMF_PANEL', name: 'Chaikin Money Flow',   desc: 'Money flow pressure oscillator' },
      { id: 'AD_LINE',   name: 'Accum/Distribution',   desc: 'Accumulation/distribution line' },
      { id: 'MFI_PANEL', name: 'Money Flow Index',     desc: 'RSI using volume-weighted prices' },
      { id: 'PVO',       name: 'Pct Volume Osc',       desc: 'Percentage Volume Oscillator' },
    ],
  },
  {
    id: 'SMC',
    label: 'SMC',
    color: '#f23645',
    items: [
      { id: 'SMC_OB',    name: 'Order Blocks',          desc: 'Institutional order block zones' },
      { id: 'SMC_FVG',   name: 'Fair Value Gaps',       desc: 'Imbalance / FVG zones' },
      { id: 'SMC_BOS',   name: 'Break of Structure',    desc: 'BOS break of market structure' },
      { id: 'SMC_CHOCH', name: 'CHoCH',                 desc: 'Change of Character signal' },
      { id: 'SMC_ZONES', name: 'Supply/Demand Zones',  desc: 'Supply and demand areas' },
    ],
  },
  {
    id: 'Quantitative',
    label: 'Quantitative',
    color: '#9c27b0',
    items: [
      { id: 'HIST_VOL',  name: 'Historical Volatility', desc: 'Realized annualized volatility' },
      { id: 'ZSCORE',    name: 'Z-Score',               desc: 'Statistical deviation from mean' },
      { id: 'SQUEEZE',   name: 'Squeeze Momentum',      desc: 'Volatility compression indicator' },
      { id: 'FORCE',     name: 'Force Index',           desc: 'Elder Force Index (power of move)' },
      { id: 'ELDER_RAY', name: 'Elder Ray',             desc: 'Bull/Bear power from EMA' },
      { id: 'MASS_IDX',  name: 'Mass Index',            desc: 'Range expansion reversal signal' },
      { id: 'SR_LEVELS', name: 'Support/Resistance',   desc: 'Auto-detected S/R price levels' },
      { id: 'PIVOTS',    name: 'Pivot Points',          desc: 'Daily standard pivot point levels' },
    ],
  },
  {
    id: 'Patterns',
    label: 'Patterns',
    color: '#607d8b',
    items: [
      { id: 'HnS',         name: 'Head & Shoulders',   desc: 'Classic reversal pattern (coming soon)', disabled: true },
      { id: 'ABCD',        name: 'ABCD Pattern',        desc: 'ABCD harmonic pattern (coming soon)',    disabled: true },
      { id: 'HARMONIC',    name: 'Harmonic Patterns',  desc: 'Gartley, Bat, Crab, etc. (coming soon)', disabled: true },
      { id: 'CANDLESTICK', name: 'Candlestick Patterns',desc: 'Doji, Hammer, Engulfing, etc. (coming soon)', disabled: true },
    ],
  },
];

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
  } = useChartStore();

  const [search, setSearch]   = useState('');
  const [activeCat, setActiveCat] = useState('Trend');
  const [tooltip, setTooltip] = useState<string | null>(null);

  if (!showIndicatorModal) return null;

  const isActive = (id: string) => activeIndicators.includes(id);

  // Flat list for search
  const allItems = CATEGORIES.flatMap(cat =>
    cat.items.map(item => ({ ...item, catId: cat.id, catColor: cat.color, catLabel: cat.label }))
  );

  const searchResults = search.trim().length > 0
    ? allItems.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.id.toLowerCase().includes(search.toLowerCase()) ||
        i.desc.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  const currentCat  = CATEGORIES.find(c => c.id === activeCat);
  const displayList = searchResults ?? (currentCat?.items ?? []);

  const handleClose = () => {
    closeIndicatorModal();
  };

  const handleReset = () => {
    // Reset to the 5 defaults
    DEFAULT_RESET.forEach(id => {
      if (!activeIndicators.includes(id)) toggleIndicator(id);
    });
    // Deactivate anything not in defaults
    activeIndicators.forEach(id => {
      if (!DEFAULT_RESET.includes(id)) toggleIndicator(id);
    });
  };

  return (
    <div className="indicator-modal-overlay" onClick={handleClose}>
      <div className="indicator-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ───────────────────────────────────────── */}
        <div className="indmod-header">
          <div className="indmod-title">
            <Layers size={14} />
            <span>Indicators</span>
          </div>
          <div className="indmod-search-wrap">
            <Search size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
            <input
              className="indmod-search ind-search"
              placeholder="Search indicators..."
              value={search}
              autoFocus
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="indmod-close" onClick={handleClose}>
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
                    className={`indmod-cat-btn ind-cat-item${activeCat === cat.id ? ' active' : ''}`}
                    onClick={() => setActiveCat(cat.id)}
                    style={activeCat === cat.id ? { borderLeftColor: cat.color } : {}}
                  >
                    <span className="indmod-cat-dot" style={{ background: cat.color }} />
                    <span className="indmod-cat-name">{cat.label}</span>
                    {count > 0 && (
                      <span className="indmod-cat-count" style={{ background: cat.color }}>
                        {count}
                      </span>
                    )}
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
                className={`indmod-item ind-list-item${isActive(item.id) ? ' active' : ''}${(item as IndicatorItem).disabled ? ' disabled' : ''}`}
                onClick={() => { if (!(item as IndicatorItem).disabled) toggleIndicator(item.id); }}
                title={(item as IndicatorItem).desc}
                onMouseEnter={() => setTooltip((item as IndicatorItem).desc)}
                onMouseLeave={() => setTooltip(null)}
                style={(item as IndicatorItem).disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
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
                    <div className="indmod-item-id">{item.id}</div>
                  </div>
                </div>
                <div className="indmod-item-right">
                  {(item as IndicatorItem).disabled && (
                    <span className="indmod-default-badge" style={{ background: 'var(--tv-bg3)', color: 'var(--tv-text2)' }}>
                      Soon
                    </span>
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
            {activeIndicators.length} active
          </span>
          <button className="indmod-reset-btn" onClick={handleReset}>
            Reset defaults
          </button>
          <button className="indmod-apply-btn" onClick={handleClose}>
            Apply &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
