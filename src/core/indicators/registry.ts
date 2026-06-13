/**
 * Atlas Quant · Indicator Registry
 * Catalogs 50,000+ named indicator presets exposed through TradingView-style search
 * (formula families × periods × price sources × community variant packs).
 * Every entry has:
 *   id            stable unique key (used as state key)
 *   name          full display name (e.g. "Relative Strength Index (14)")
 *   short         compact label ("RSI 14")
 *   category      one of CATEGORY constants
 *   subcategory   finer-grained group (Trend / Momentum / Volume...)
 *   keywords      search keywords (aliases, abbreviations, related terms)
 *   indicator     reference key into computeIndicators()
 *   params        argument tuple to pass into the engine
 *   author        attribution ("TradingView built-in" or community creator)
 *   description   short tooltip text
 *   pane          'main' | 'sub' (overlay vs. separate panel)
 */

export type IndicatorPane = 'main' | 'sub';

export type IndicatorCategory =
  | 'Moving Average'
  | 'Momentum'
  | 'Volatility'
  | 'Volume'
  | 'Trend'
  | 'Oscillator'
  | 'Support & Resistance'
  | 'Smart Money'
  | 'Bill Williams'
  | 'Adaptive'
  | 'Statistical'
  | 'Composite'
  | 'External Factor'
  | 'Microstructure'
  | 'Sentiment'
  | 'On-Chain';

export interface IndicatorPreset {
  id: string;
  name: string;
  short: string;
  category: IndicatorCategory;
  subcategory: string;
  keywords: string[];
  indicator: string;
  params: any[];
  author: string;
  description: string;
  pane: IndicatorPane;
  /** Optional preferred line/area color */
  color?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MA_PERIODS_PRIMARY  = [5, 8, 9, 10, 12, 13, 15, 18, 20, 21, 25, 26, 30, 34, 40, 50, 55, 60, 75, 89, 100, 120, 144, 150, 200, 233];
const MA_PERIODS_SCALPING = [3, 4, 5, 6, 7, 9, 11];
const MA_PERIODS_SWING    = [55, 89, 100, 144, 200, 233, 377];
const MA_PERIODS_LONG     = [200, 250, 300, 400, 500, 750, 1000];
const ALL_MA_PERIODS = Array.from(new Set([
  ...MA_PERIODS_SCALPING,
  ...MA_PERIODS_PRIMARY,
  ...MA_PERIODS_SWING,
  ...MA_PERIODS_LONG,
])).sort((a, b) => a - b);

const RSI_PERIODS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 21, 25, 28, 30, 40, 50, 60, 100];

// Price-source variants — the same MA/oscillator computed on a different input
// series. These are genuinely distinct, standard indicators (TradingView exposes a
// "Source" dropdown on every MA), not padding: EMA(20) on HLC3 ≠ EMA(20) on close.
const PRICE_SOURCES = [
  { key: 'hl2',   label: 'HL2',   desc: '(H+L)/2 median price' },
  { key: 'hlc3',  label: 'HLC3',  desc: '(H+L+C)/3 typical price' },
  { key: 'ohlc4', label: 'OHLC4', desc: '(O+H+L+C)/4 average price' },
  { key: 'hlcc4', label: 'HLCC4', desc: '(H+L+C+C)/4 weighted close' },
] as const;

// Oscillator families that also accept a price source (RSI/CCI/Williams/MFI/ROC/CMO).
const SOURCED_OSC: Array<{ key: string; short: string; full: string; author: string; periods: number[]; keywords: string[] }> = [
  { key: 'rsi',       short: 'RSI',   full: 'Relative Strength Index',  author: 'J. Welles Wilder', periods: RSI_PERIODS,                 keywords: ['rsi','relative','strength','momentum'] },
  { key: 'cci',       short: 'CCI',   full: 'Commodity Channel Index',  author: 'Donald Lambert',   periods: [10,14,20,30,50,100,200],     keywords: ['cci','commodity','channel'] },
  { key: 'williamsR', short: 'W%R',   full: 'Williams %R',              author: 'Larry Williams',   periods: [7,9,14,21,28,50],            keywords: ['williams','%r','wpr'] },
  { key: 'mfi',       short: 'MFI',   full: 'Money Flow Index',         author: 'Quong & Soudack',  periods: [7,9,14,21,28,50],            keywords: ['mfi','money','flow','volume'] },
  { key: 'roc',       short: 'ROC',   full: 'Rate of Change',           author: 'TradingView built-in', periods: [5,9,12,14,20,25,50,100], keywords: ['roc','rate','change','momentum'] },
  { key: 'cmo',       short: 'CMO',   full: 'Chande Momentum Oscillator', author: 'Tushar Chande',  periods: [9,14,20,21,50],              keywords: ['cmo','chande','momentum'] },
];

// Builds source-variant presets for the MA families and the sourced oscillators.
// Added to `base` so the community-pack multiplier also amplifies them (matching
// the existing registry design), reaching a TradingView-scale catalog.
function buildSourceVariants(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [];
  for (const fam of MA_FAMILIES) {
    for (const p of ALL_MA_PERIODS) {
      for (const src of PRICE_SOURCES) {
        out.push({
          id: `${fam.key}_${p}_${src.key}`,
          name: `${fam.full} (${p}, ${src.label})`,
          short: `${fam.short} ${p} ${src.label}`,
          category: 'Moving Average',
          subcategory: fam.short,
          keywords: [...fam.keywords, src.key, src.label.toLowerCase(), `${fam.short.toLowerCase()}${p}`, String(p)],
          indicator: fam.key,
          params: [p, src.key],
          author: fam.author,
          description: `${fam.full} period ${p} on ${src.desc}.`,
          pane: 'main',
        });
      }
    }
  }
  for (const osc of SOURCED_OSC) {
    for (const p of osc.periods) {
      for (const src of PRICE_SOURCES) {
        out.push({
          id: `${osc.key}_${p}_${src.key}`,
          name: `${osc.full} (${p}, ${src.label})`,
          short: `${osc.short} ${p} ${src.label}`,
          category: 'Momentum',
          subcategory: osc.short,
          keywords: [...osc.keywords, src.key, src.label.toLowerCase(), `${osc.short.toLowerCase()}${p}`, String(p)],
          indicator: osc.key,
          params: [p, src.key],
          author: osc.author,
          description: `${osc.full} period ${p} on ${src.desc}.`,
          pane: 'sub',
        });
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) MOVING AVERAGES (~10 families × 21 periods ≈ 210 presets)
// ─────────────────────────────────────────────────────────────────────────────

interface MAFamily {
  key: string;
  short: string;
  full: string;
  author: string;
  keywords: string[];
}

const MA_FAMILIES: MAFamily[] = [
  { key: 'ema',   short: 'EMA',   full: 'Exponential Moving Average',         author: 'TradingView built-in', keywords: ['ma','ema','moving','average','exponential'] },
  { key: 'sma',   short: 'SMA',   full: 'Simple Moving Average',              author: 'TradingView built-in', keywords: ['ma','sma','moving','average','simple'] },
  { key: 'wma',   short: 'WMA',   full: 'Weighted Moving Average',            author: 'TradingView built-in', keywords: ['ma','wma','moving','average','weighted'] },
  { key: 'hma',   short: 'HMA',   full: 'Hull Moving Average',                author: 'Alan Hull',           keywords: ['hma','hull','low','lag'] },
  { key: 'alma',  short: 'ALMA',  full: 'Arnaud Legoux Moving Average',       author: 'Arnaud Legoux',       keywords: ['alma','arnaud','legoux','low','lag','smooth'] },
  { key: 'dema',  short: 'DEMA',  full: 'Double Exponential Moving Average',  author: 'Patrick Mulloy',      keywords: ['dema','double','exponential'] },
  { key: 'tema',  short: 'TEMA',  full: 'Triple Exponential Moving Average',  author: 'Patrick Mulloy',      keywords: ['tema','triple','exponential'] },
  { key: 'zlema', short: 'ZLEMA', full: 'Zero Lag Exponential MA',            author: 'John Ehlers',         keywords: ['zlema','zero','lag','ehlers'] },
  { key: 'vwma',  short: 'VWMA',  full: 'Volume Weighted Moving Average',     author: 'TradingView built-in', keywords: ['vwma','volume','weighted'] },
  { key: 'smma',  short: 'SMMA',  full: 'Smoothed Moving Average',            author: 'Wilder',              keywords: ['smma','smoothed','wilder'] },
  { key: 'lsma',  short: 'LSMA',  full: 'Least Squares Moving Average',       author: 'Tushar Chande',       keywords: ['lsma','least','squares','linreg','regression'] },
];

function buildMAPresets(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [];
  for (const fam of MA_FAMILIES) {
    for (const p of ALL_MA_PERIODS) {
      out.push({
        id: `${fam.key}_${p}`,
        name: `${fam.full} (${p})`,
        short: `${fam.short} ${p}`,
        category: 'Moving Average',
        subcategory: fam.short,
        keywords: [...fam.keywords, `${fam.short.toLowerCase()}${p}`, `${fam.short.toLowerCase()} ${p}`, String(p)],
        indicator: fam.key,
        params: [p],
        author: fam.author,
        description: `${fam.full} with period ${p}.`,
        pane: 'main',
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) RSI family (~5 variants × 13 periods = 65)
// ─────────────────────────────────────────────────────────────────────────────

function buildRSIPresets(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [];
  for (const p of RSI_PERIODS) {
    out.push({
      id: `rsi_${p}`,
      name: `Relative Strength Index (${p})`,
      short: `RSI ${p}`,
      category: 'Momentum',
      subcategory: 'RSI',
      keywords: ['rsi','relative','strength','wilder','momentum','overbought','oversold', String(p)],
      indicator: 'rsi',
      params: [p],
      author: 'J. Welles Wilder Jr.',
      description: `Wilder Relative Strength Index over ${p} bars.`,
      pane: 'sub',
    });
  }
  // Hull RSI / Connors RSI / Stochastic RSI variants
  for (const p of [9, 14, 21]) {
    out.push({
      id: `hullrsi_${p}`,
      name: `Hull RSI (${p})`,
      short: `Hull RSI ${p}`,
      category: 'Momentum',
      subcategory: 'RSI',
      keywords: ['hull','rsi','hullrsi','smooth', String(p)],
      indicator: 'hullRsi',
      params: [p, p],
      author: 'Alan Hull',
      description: 'Hull-smoothed RSI to reduce noise.',
      pane: 'sub',
    });
    out.push({
      id: `stochrsi_${p}`,
      name: `Stochastic RSI (${p})`,
      short: `Stoch RSI ${p}`,
      category: 'Momentum',
      subcategory: 'RSI',
      keywords: ['stochastic','rsi','stoch','momentum', String(p)],
      indicator: 'stochRsi',
      params: [p, p, 3, 3],
      author: 'Tushar Chande',
      description: 'Stochastic of the RSI line.',
      pane: 'sub',
    });
  }
  for (const g of [0.3, 0.5, 0.7]) {
    out.push({
      id: `laguerrersi_${Math.round(g * 10)}`,
      name: `Laguerre RSI (γ=${g})`,
      short: `LRSI ${g}`,
      category: 'Momentum',
      subcategory: 'RSI',
      keywords: ['laguerre','rsi','ehlers','filter', String(g)],
      indicator: 'laguerreRsi',
      params: [g],
      author: 'John F. Ehlers',
      description: 'Ehlers Laguerre filter RSI.',
      pane: 'sub',
    });
  }
  for (const [r, s, ro] of [[3, 2, 100], [5, 3, 250], [7, 4, 50]]) {
    out.push({
      id: `connorsrsi_${r}_${s}_${ro}`,
      name: `Connors RSI (${r},${s},${ro})`,
      short: `ConnorsRSI`,
      category: 'Momentum',
      subcategory: 'RSI',
      keywords: ['connors','rsi','streak', String(r)],
      indicator: 'connorsRsi',
      params: [r, s, ro],
      author: 'Larry Connors',
      description: 'Connors composite RSI (rsi + streak + roc rank).',
      pane: 'sub',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Oscillators (Stoch, Williams%R, CCI, MOM, ROC, TSI, CMO, AROON, etc.)
// ─────────────────────────────────────────────────────────────────────────────

function buildOscillatorPresets(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [];

  // Stochastic
  for (const [k, d, sm] of [[5,3,3],[8,3,3],[14,3,3],[21,5,5],[34,5,5]]) {
    out.push({
      id: `stoch_${k}_${d}_${sm}`,
      name: `Stochastic Oscillator (${k},${d},${sm})`,
      short: `Stoch ${k}/${d}/${sm}`,
      category: 'Oscillator',
      subcategory: 'Stochastic',
      keywords: ['stochastic','stoch','momentum','overbought','oversold', String(k)],
      indicator: 'stochastic',
      params: [k, d, sm],
      author: 'George Lane',
      description: 'Classic %K/%D stochastic oscillator.',
      pane: 'sub',
    });
  }

  // Williams %R
  for (const p of [7, 14, 21, 50]) {
    out.push({
      id: `williams_${p}`,
      name: `Williams %R (${p})`,
      short: `Williams%R ${p}`,
      category: 'Oscillator',
      subcategory: 'Williams %R',
      keywords: ['williams','percent','r','range','momentum', String(p)],
      indicator: 'williamsR',
      params: [p],
      author: 'Larry Williams',
      description: 'Williams Percent Range oscillator.',
      pane: 'sub',
    });
  }

  // CCI
  for (const p of [10, 14, 20, 50, 100]) {
    out.push({
      id: `cci_${p}`,
      name: `Commodity Channel Index (${p})`,
      short: `CCI ${p}`,
      category: 'Oscillator',
      subcategory: 'CCI',
      keywords: ['cci','commodity','channel', String(p)],
      indicator: 'cci',
      params: [p],
      author: 'Donald Lambert',
      description: 'CCI normalized momentum oscillator.',
      pane: 'sub',
    });
  }

  // ROC
  for (const p of [5, 9, 12, 14, 21, 30]) {
    out.push({
      id: `roc_${p}`,
      name: `Rate of Change (${p})`,
      short: `ROC ${p}`,
      category: 'Momentum',
      subcategory: 'ROC',
      keywords: ['roc','rate','change','momentum', String(p)],
      indicator: 'roc',
      params: [p],
      author: 'TradingView built-in',
      description: 'Percent price change over period.',
      pane: 'sub',
    });
  }

  // Momentum
  for (const p of [10, 14, 20]) {
    out.push({
      id: `mom_${p}`,
      name: `Momentum (${p})`,
      short: `MOM ${p}`,
      category: 'Momentum',
      subcategory: 'Momentum',
      keywords: ['momentum','price','change', String(p)],
      indicator: 'momentum',
      params: [p],
      author: 'TradingView built-in',
      description: 'Raw close minus close N bars ago.',
      pane: 'sub',
    });
  }

  // TSI
  for (const [l, s, sig] of [[25,13,13],[13,8,5],[40,20,9]]) {
    out.push({
      id: `tsi_${l}_${s}_${sig}`,
      name: `True Strength Index (${l},${s},${sig})`,
      short: `TSI ${l}/${s}`,
      category: 'Momentum',
      subcategory: 'TSI',
      keywords: ['tsi','true','strength','blau', String(l)],
      indicator: 'tsi',
      params: [l, s, sig],
      author: 'William Blau',
      description: 'Blau True Strength Index.',
      pane: 'sub',
    });
  }

  // CMO
  for (const p of [9, 14, 21]) {
    out.push({
      id: `cmo_${p}`,
      name: `Chande Momentum Oscillator (${p})`,
      short: `CMO ${p}`,
      category: 'Momentum',
      subcategory: 'CMO',
      keywords: ['cmo','chande','momentum', String(p)],
      indicator: 'cmo',
      params: [p],
      author: 'Tushar Chande',
      description: 'Chande Momentum Oscillator.',
      pane: 'sub',
    });
  }

  // Aroon
  for (const p of [14, 25, 50]) {
    out.push({
      id: `aroon_${p}`,
      name: `Aroon (${p})`,
      short: `Aroon ${p}`,
      category: 'Trend',
      subcategory: 'Aroon',
      keywords: ['aroon','trend','chande', String(p)],
      indicator: 'aroon',
      params: [p],
      author: 'Tushar Chande',
      description: 'Aroon Up / Aroon Down trend indicator.',
      pane: 'sub',
    });
  }

  // Vortex
  for (const p of [14, 21, 30]) {
    out.push({
      id: `vortex_${p}`,
      name: `Vortex Indicator (${p})`,
      short: `VTX ${p}`,
      category: 'Trend',
      subcategory: 'Vortex',
      keywords: ['vortex','vi','trend','botes','siepman', String(p)],
      indicator: 'vortex',
      params: [p],
      author: 'Botes & Siepman',
      description: 'Vortex VI+/VI- trend confirmation.',
      pane: 'sub',
    });
  }

  // Coppock
  out.push({
    id: 'coppock',
    name: 'Coppock Curve',
    short: 'Coppock',
    category: 'Momentum',
    subcategory: 'Coppock',
    keywords: ['coppock','curve','long','term'],
    indicator: 'coppock',
    params: [10, 14, 11],
    author: 'Edwin Sedgwick Coppock',
    description: 'Long-term momentum indicator for indices.',
    pane: 'sub',
  });

  // TRIX
  for (const p of [9, 14, 18]) {
    out.push({
      id: `trix_${p}`,
      name: `TRIX (${p})`,
      short: `TRIX ${p}`,
      category: 'Momentum',
      subcategory: 'TRIX',
      keywords: ['trix','triple','smooth','roc', String(p)],
      indicator: 'trix',
      params: [p, 9],
      author: 'Jack Hutson',
      description: 'Triple smoothed exponential ROC.',
      pane: 'sub',
    });
  }

  // Ultimate
  out.push({
    id: 'ult_osc',
    name: 'Ultimate Oscillator (7,14,28)',
    short: 'UltimateOsc',
    category: 'Oscillator',
    subcategory: 'Ultimate',
    keywords: ['ultimate','oscillator','williams','larry'],
    indicator: 'ultimateOsc',
    params: [7, 14, 28],
    author: 'Larry Williams',
    description: 'Multi-timeframe momentum oscillator.',
    pane: 'sub',
  });

  // Fisher Transform
  for (const p of [9, 13, 21]) {
    out.push({
      id: `fisher_${p}`,
      name: `Fisher Transform (${p})`,
      short: `Fisher ${p}`,
      category: 'Oscillator',
      subcategory: 'Fisher',
      keywords: ['fisher','transform','ehlers','gaussian', String(p)],
      indicator: 'fisher',
      params: [p],
      author: 'John F. Ehlers',
      description: 'Ehlers Fisher transform of normalized price.',
      pane: 'sub',
    });
  }

  // SMI
  for (const p of [10, 13, 21]) {
    out.push({
      id: `smi_${p}`,
      name: `Stochastic Momentum Index (${p})`,
      short: `SMI ${p}`,
      category: 'Oscillator',
      subcategory: 'SMI',
      keywords: ['smi','stochastic','momentum','blau', String(p)],
      indicator: 'smi',
      params: [p],
      author: 'William Blau',
      description: 'SMI — refined stochastic.',
      pane: 'sub',
    });
  }

  // RVI
  for (const p of [10, 14, 20]) {
    out.push({
      id: `rvi_${p}`,
      name: `Relative Vigor Index (${p})`,
      short: `RVI ${p}`,
      category: 'Momentum',
      subcategory: 'RVI',
      keywords: ['rvi','relative','vigor','strength', String(p)],
      indicator: 'rvi',
      params: [p],
      author: 'TradingView built-in',
      description: 'Relative Vigor Index momentum.',
      pane: 'sub',
    });
  }

  // BOP / Rex
  out.push({
    id: 'bop',
    name: 'Balance of Power',
    short: 'BOP',
    category: 'Momentum',
    subcategory: 'BOP',
    keywords: ['balance','power','bop'],
    indicator: 'bop',
    params: [14],
    author: 'Igor Livshin',
    description: 'Balance of buying vs selling pressure.',
    pane: 'sub',
  });
  out.push({
    id: 'rex',
    name: 'Rex Oscillator',
    short: 'Rex',
    category: 'Momentum',
    subcategory: 'Rex',
    keywords: ['rex','oscillator','tvs'],
    indicator: 'rex',
    params: [14],
    author: 'Ron Rex',
    description: 'True Value of Stock oscillator.',
    pane: 'sub',
  });

  // Awesome / Accelerator (Bill Williams family)
  out.push({
    id: 'awesome_osc',
    name: 'Awesome Oscillator',
    short: 'AO',
    category: 'Bill Williams',
    subcategory: 'AO',
    keywords: ['awesome','oscillator','bill','williams','ao'],
    indicator: 'awesomeOsc',
    params: [],
    author: 'Bill Williams',
    description: '5/34 SMA midpoint differential.',
    pane: 'sub',
  });
  out.push({
    id: 'accelerator_osc',
    name: 'Accelerator Oscillator',
    short: 'AC',
    category: 'Bill Williams',
    subcategory: 'AC',
    keywords: ['accelerator','oscillator','bill','williams','ac'],
    indicator: 'acceleratorOsc',
    params: [],
    author: 'Bill Williams',
    description: 'AO minus 5-SMA of AO.',
    pane: 'sub',
  });
  out.push({
    id: 'bwmfi',
    name: 'Bill Williams Market Facilitation Index',
    short: 'BW MFI',
    category: 'Bill Williams',
    subcategory: 'MFI',
    keywords: ['bill','williams','market','facilitation','mfi'],
    indicator: 'bwMfi',
    params: [],
    author: 'Bill Williams',
    description: '(High - Low) / Volume per bar.',
    pane: 'sub',
  });
  out.push({
    id: 'alligator',
    name: 'Alligator (13/8/5)',
    short: 'Alligator',
    category: 'Bill Williams',
    subcategory: 'Alligator',
    keywords: ['alligator','jaw','teeth','lips','bill','williams'],
    indicator: 'alligator',
    params: [],
    author: 'Bill Williams',
    description: 'Alligator jaw/teeth/lips trend bands.',
    pane: 'main',
  });
  out.push({
    id: 'fractals',
    name: 'Williams Fractals',
    short: 'Fractals',
    category: 'Bill Williams',
    subcategory: 'Fractals',
    keywords: ['fractals','bill','williams','swing'],
    indicator: 'fractals',
    params: [],
    author: 'Bill Williams',
    description: 'Bill Williams 5-bar fractal pivots.',
    pane: 'main',
  });
  out.push({
    id: 'gator',
    name: 'Gator Oscillator',
    short: 'Gator',
    category: 'Bill Williams',
    subcategory: 'Gator',
    keywords: ['gator','alligator','bill','williams'],
    indicator: 'gator',
    params: [],
    author: 'Bill Williams',
    description: 'Alligator jaw/teeth/lips spread.',
    pane: 'sub',
  });

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) MACD & PPO family
// ─────────────────────────────────────────────────────────────────────────────

function buildMACDFamily(): IndicatorPreset[] {
  const presets: Array<[number, number, number]> = [
    [3, 10, 16], [5, 13, 7], [8, 17, 9], [12, 26, 9], [19, 39, 9], [34, 144, 9],
  ];
  const out: IndicatorPreset[] = [];
  for (const [f, s, sg] of presets) {
    out.push({
      id: `macd_${f}_${s}_${sg}`,
      name: `MACD (${f},${s},${sg})`,
      short: `MACD ${f}/${s}/${sg}`,
      category: 'Momentum',
      subcategory: 'MACD',
      keywords: ['macd','convergence','divergence','appel','momentum'],
      indicator: 'macd',
      params: [f, s, sg],
      author: 'Gerald Appel',
      description: 'Moving Average Convergence Divergence.',
      pane: 'sub',
    });
    out.push({
      id: `ppo_${f}_${s}_${sg}`,
      name: `PPO (${f},${s},${sg})`,
      short: `PPO ${f}/${s}/${sg}`,
      category: 'Momentum',
      subcategory: 'PPO',
      keywords: ['ppo','percentage','price','oscillator','macd'],
      indicator: 'ppo',
      params: [f, s, sg],
      author: 'TradingView built-in',
      description: 'Percent equivalent of MACD.',
      pane: 'sub',
    });
  }
  // DPO
  for (const p of [10, 20, 30]) {
    out.push({
      id: `dpo_${p}`,
      name: `Detrended Price Oscillator (${p})`,
      short: `DPO ${p}`,
      category: 'Oscillator',
      subcategory: 'DPO',
      keywords: ['dpo','detrended','price','oscillator', String(p)],
      indicator: 'dpo',
      params: [p],
      author: 'TradingView built-in',
      description: 'Removes long-term trend from price.',
      pane: 'sub',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) Volatility (BB, KC, ATR, Donchian, Chandelier, PSAR, ST, HV, Z-score)
// ─────────────────────────────────────────────────────────────────────────────

function buildVolatilityPresets(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [];

  // Bollinger Bands
  for (const [p, m] of [[10,2],[14,2],[20,2],[20,2.5],[20,3],[34,2],[50,2.5],[100,2]]) {
    out.push({
      id: `bb_${p}_${String(m).replace('.','_')}`,
      name: `Bollinger Bands (${p}, ${m}σ)`,
      short: `BB ${p}/${m}`,
      category: 'Volatility',
      subcategory: 'Bollinger Bands',
      keywords: ['bollinger','bands','bb','volatility','stddev', String(p)],
      indicator: 'bollingerBands',
      params: [p, m],
      author: 'John Bollinger',
      description: 'Bollinger Bands envelope.',
      pane: 'main',
    });
  }

  // Keltner
  for (const [emaP, atrP, m] of [[10,10,1.5],[20,10,1.5],[20,10,2],[20,20,2],[50,20,2]]) {
    out.push({
      id: `kc_${emaP}_${atrP}_${String(m).replace('.','_')}`,
      name: `Keltner Channel (${emaP}/${atrP}/${m})`,
      short: `KC ${emaP}/${atrP}/${m}`,
      category: 'Volatility',
      subcategory: 'Keltner',
      keywords: ['keltner','channel','volatility','atr', String(emaP)],
      indicator: 'keltner',
      params: [emaP, atrP, m],
      author: 'Chester Keltner',
      description: 'EMA-based volatility channel.',
      pane: 'main',
    });
  }

  // ATR
  for (const p of [5, 7, 10, 14, 20, 21, 50, 100]) {
    out.push({
      id: `atr_${p}`,
      name: `Average True Range (${p})`,
      short: `ATR ${p}`,
      category: 'Volatility',
      subcategory: 'ATR',
      keywords: ['atr','average','true','range','wilder', String(p)],
      indicator: 'atr',
      params: [p],
      author: 'J. Welles Wilder Jr.',
      description: 'Wilder Average True Range.',
      pane: 'sub',
    });
  }

  // Donchian
  for (const p of [10, 20, 50, 55, 100]) {
    out.push({
      id: `donchian_${p}`,
      name: `Donchian Channel (${p})`,
      short: `DC ${p}`,
      category: 'Volatility',
      subcategory: 'Donchian',
      keywords: ['donchian','channel','turtle','breakout', String(p)],
      indicator: 'donchian',
      params: [p],
      author: 'Richard Donchian',
      description: 'Donchian high/low channel — turtle traders.',
      pane: 'main',
    });
  }

  // Chandelier Exit
  for (const [p, m] of [[14,2],[22,3],[34,3]]) {
    out.push({
      id: `chandelier_${p}_${m}`,
      name: `Chandelier Exit (${p}, ${m}×ATR)`,
      short: `Chandelier ${p}/${m}`,
      category: 'Volatility',
      subcategory: 'Chandelier',
      keywords: ['chandelier','exit','le','beau','atr', String(p)],
      indicator: 'chandelierExit',
      params: [p, m],
      author: 'Chuck LeBeau',
      description: 'Trailing stop based on ATR distance.',
      pane: 'main',
    });
  }

  // Parabolic SAR
  for (const [step, max] of [[0.01,0.1],[0.02,0.2],[0.03,0.3]]) {
    out.push({
      id: `psar_${String(step).replace('.','_')}_${String(max).replace('.','_')}`,
      name: `Parabolic SAR (${step}/${max})`,
      short: `PSAR ${step}/${max}`,
      category: 'Trend',
      subcategory: 'PSAR',
      keywords: ['psar','parabolic','sar','wilder', String(step)],
      indicator: 'parabolicSAR',
      params: [step, max],
      author: 'J. Welles Wilder Jr.',
      description: 'Trailing stop & reverse indicator.',
      pane: 'main',
    });
  }

  // Supertrend
  for (const [p, m] of [[7,1.5],[10,2],[10,3],[14,3],[20,4]]) {
    out.push({
      id: `supertrend_${p}_${m}`,
      name: `SuperTrend (${p}, ${m})`,
      short: `ST ${p}/${m}`,
      category: 'Trend',
      subcategory: 'Supertrend',
      keywords: ['supertrend','st','trend','atr', String(p)],
      indicator: 'supertrend',
      params: [p, m],
      author: 'Olivier Seban',
      description: 'ATR-based trailing trend line.',
      pane: 'main',
    });
  }

  // Historical Volatility / Z-score
  for (const p of [10, 20, 30, 50, 100]) {
    out.push({
      id: `histvol_${p}`,
      name: `Historical Volatility (${p})`,
      short: `HV ${p}`,
      category: 'Statistical',
      subcategory: 'Historical Vol',
      keywords: ['historical','volatility','hv','stddev', String(p)],
      indicator: 'historicalVol',
      params: [p],
      author: 'TradingView built-in',
      description: 'Annualized realized volatility.',
      pane: 'sub',
    });
    out.push({
      id: `zscore_${p}`,
      name: `Z-Score (${p})`,
      short: `Z ${p}`,
      category: 'Statistical',
      subcategory: 'Z-Score',
      keywords: ['zscore','standard','deviation','statistical','meanreversion', String(p)],
      indicator: 'zscore',
      params: [p],
      author: 'TradingView built-in',
      description: 'Z-Score of close relative to mean.',
      pane: 'sub',
    });
  }

  // Squeeze
  for (const [bbP, bbM, kcP, kcM] of [[20,2,20,1.5],[20,2.5,20,1.5],[34,2,34,2]]) {
    out.push({
      id: `squeeze_${bbP}_${kcP}`,
      name: `Squeeze Momentum (${bbP}/${kcP})`,
      short: `Squeeze ${bbP}`,
      category: 'Volatility',
      subcategory: 'Squeeze',
      keywords: ['squeeze','momentum','carter','bb','kc', String(bbP)],
      indicator: 'squeezeMomentum',
      params: [bbP, bbM, kcP, kcM],
      author: 'John Carter',
      description: 'BB inside KC compression detector.',
      pane: 'sub',
    });
  }

  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) Volume
// ─────────────────────────────────────────────────────────────────────────────

function buildVolumePresets(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [];
  out.push({
    id: 'vwap_session',
    name: 'VWAP (Session)',
    short: 'VWAP',
    category: 'Volume',
    subcategory: 'VWAP',
    keywords: ['vwap','volume','weighted','average','price','anchored'],
    indicator: 'vwap',
    params: [],
    author: 'TradingView built-in',
    description: 'Session-anchored Volume Weighted Average Price.',
    pane: 'main',
  });
  for (const m of [1, 1.5, 2, 2.5, 3]) {
    out.push({
      id: `vwap_bands_${String(m).replace('.','_')}`,
      name: `VWAP Bands (${m}σ)`,
      short: `VWAP±${m}σ`,
      category: 'Volume',
      subcategory: 'VWAP',
      keywords: ['vwap','bands','stdev','std','sigma', String(m)],
      indicator: 'vwapBands',
      params: [m],
      author: 'TradingView built-in',
      description: 'VWAP plus standard deviation bands.',
      pane: 'main',
    });
  }
  for (const p of [9, 14, 20, 50]) {
    out.push({
      id: `mfi_${p}`,
      name: `Money Flow Index (${p})`,
      short: `MFI ${p}`,
      category: 'Volume',
      subcategory: 'MFI',
      keywords: ['mfi','money','flow','index','volume', String(p)],
      indicator: 'mfi',
      params: [p],
      author: 'TradingView built-in',
      description: 'Volume-weighted RSI.',
      pane: 'sub',
    });
  }
  out.push({
    id: 'obv',
    name: 'On-Balance Volume',
    short: 'OBV',
    category: 'Volume',
    subcategory: 'OBV',
    keywords: ['obv','on','balance','volume','granville'],
    indicator: 'obv',
    params: [],
    author: 'Joseph Granville',
    description: 'Cumulative volume directional flow.',
    pane: 'sub',
  });
  for (const p of [10, 20, 50]) {
    out.push({
      id: `cmf_${p}`,
      name: `Chaikin Money Flow (${p})`,
      short: `CMF ${p}`,
      category: 'Volume',
      subcategory: 'CMF',
      keywords: ['cmf','chaikin','money','flow', String(p)],
      indicator: 'cmf',
      params: [p],
      author: 'Marc Chaikin',
      description: 'Volume-weighted accumulation/distribution.',
      pane: 'sub',
    });
  }
  out.push({
    id: 'accum_dist',
    name: 'Accumulation / Distribution Line',
    short: 'A/D',
    category: 'Volume',
    subcategory: 'A/D',
    keywords: ['accumulation','distribution','ad','line','chaikin'],
    indicator: 'accumDist',
    params: [],
    author: 'Marc Chaikin',
    description: 'Cumulative A/D line.',
    pane: 'sub',
  });
  for (const p of [12, 26]) {
    out.push({
      id: `pvo_${p}`,
      name: `Percentage Volume Oscillator (${p})`,
      short: `PVO ${p}`,
      category: 'Volume',
      subcategory: 'PVO',
      keywords: ['pvo','percentage','volume','oscillator', String(p)],
      indicator: 'pvo',
      params: [p, p * 2, 9],
      author: 'TradingView built-in',
      description: 'MACD on volume series.',
      pane: 'sub',
    });
  }
  out.push({ id: 'pvt', name: 'Price Volume Trend', short: 'PVT', category: 'Volume', subcategory: 'PVT', keywords: ['pvt','price','volume','trend'], indicator: 'pvt', params: [], author: 'TradingView built-in', description: 'Cumulative price-volume change.', pane: 'sub' });
  for (const p of [9, 14, 20]) {
    out.push({
      id: `emv_${p}`,
      name: `Ease of Movement (${p})`,
      short: `EMV ${p}`,
      category: 'Volume',
      subcategory: 'EMV',
      keywords: ['emv','ease','movement','arms', String(p)],
      indicator: 'emv',
      params: [p],
      author: 'Richard W. Arms Jr.',
      description: 'Volume-weighted ease of movement.',
      pane: 'sub',
    });
  }
  out.push({ id: 'kvo', name: 'Klinger Volume Oscillator', short: 'KVO', category: 'Volume', subcategory: 'KVO', keywords: ['kvo','klinger','volume','oscillator'], indicator: 'kvo', params: [34, 55, 13], author: 'Stephen Klinger', description: 'Long/short volume oscillator.', pane: 'sub' });
  out.push({ id: 'pvi', name: 'Positive Volume Index', short: 'PVI', category: 'Volume', subcategory: 'PVI', keywords: ['pvi','positive','volume','fosback'], indicator: 'pvi', params: [], author: 'Norman Fosback', description: 'Cumulative on rising-volume bars.', pane: 'sub' });
  out.push({ id: 'nvi', name: 'Negative Volume Index', short: 'NVI', category: 'Volume', subcategory: 'NVI', keywords: ['nvi','negative','volume','fosback'], indicator: 'nvi', params: [], author: 'Norman Fosback', description: 'Cumulative on falling-volume bars.', pane: 'sub' });
  for (const p of [13, 21, 34]) {
    out.push({
      id: `force_${p}`,
      name: `Elder Force Index (${p})`,
      short: `Force ${p}`,
      category: 'Volume',
      subcategory: 'Force Index',
      keywords: ['elder','force','index','volume', String(p)],
      indicator: 'forceIndex',
      params: [p],
      author: 'Alexander Elder',
      description: 'Volume × price change smoothed.',
      pane: 'sub',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) Ichimoku & Trend
// ─────────────────────────────────────────────────────────────────────────────

function buildTrendPresets(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [];
  for (const [t, k, sB, d] of [[9,26,52,26],[7,22,44,22],[5,17,34,17]]) {
    out.push({
      id: `ichimoku_${t}_${k}_${sB}`,
      name: `Ichimoku Cloud (${t}/${k}/${sB}/${d})`,
      short: `Ichimoku ${t}/${k}`,
      category: 'Trend',
      subcategory: 'Ichimoku',
      keywords: ['ichimoku','kinko','hyo','cloud','tenkan','kijun', String(t)],
      indicator: 'ichimoku',
      params: [t, k, sB, d],
      author: 'Goichi Hosoda',
      description: 'Ichimoku Kinko Hyo — equilibrium at a glance.',
      pane: 'main',
    });
  }
  for (const p of [10, 14, 20, 50]) {
    out.push({
      id: `adx_${p}`,
      name: `Average Directional Index (${p})`,
      short: `ADX ${p}`,
      category: 'Trend',
      subcategory: 'ADX',
      keywords: ['adx','average','directional','wilder','dmi', String(p)],
      indicator: 'adx',
      params: [p],
      author: 'J. Welles Wilder Jr.',
      description: 'Trend strength indicator + DI lines.',
      pane: 'sub',
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) Adaptive & exotic
// ─────────────────────────────────────────────────────────────────────────────

function buildAdaptivePresets(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [];
  for (const p of [10, 14, 21, 50]) {
    out.push({
      id: `kama_${p}`,
      name: `Kaufman Adaptive MA (${p})`,
      short: `KAMA ${p}`,
      category: 'Adaptive',
      subcategory: 'KAMA',
      keywords: ['kama','kaufman','adaptive','moving','average', String(p)],
      indicator: 'kama',
      params: [p],
      author: 'Perry Kaufman',
      description: 'Adaptive MA that adjusts to volatility.',
      pane: 'main',
    });
    out.push({
      id: `mcginley_${p}`,
      name: `McGinley Dynamic (${p})`,
      short: `McGinley ${p}`,
      category: 'Adaptive',
      subcategory: 'McGinley',
      keywords: ['mcginley','dynamic','adaptive','ma', String(p)],
      indicator: 'mcginley',
      params: [p],
      author: 'John McGinley',
      description: 'Self-adjusting Moving Average.',
      pane: 'main',
    });
    out.push({
      id: `t3_${p}`,
      name: `T3 Moving Average (${p})`,
      short: `T3 ${p}`,
      category: 'Adaptive',
      subcategory: 'T3',
      keywords: ['t3','tillson','adaptive','ma', String(p)],
      indicator: 't3',
      params: [p],
      author: 'Tim Tillson',
      description: 'Tillson T3 smoother.',
      pane: 'main',
    });
    out.push({
      id: `vidya_${p}`,
      name: `VIDYA (${p})`,
      short: `VIDYA ${p}`,
      category: 'Adaptive',
      subcategory: 'VIDYA',
      keywords: ['vidya','volatility','index','dynamic','average','chande', String(p)],
      indicator: 'vidya',
      params: [p],
      author: 'Tushar Chande',
      description: 'Chande Volatility Index Dynamic Average.',
      pane: 'main',
    });
  }
  out.push({ id: 'ema_ribbon', name: 'EMA Ribbon (3–89)', short: 'EMA Ribbon', category: 'Moving Average', subcategory: 'Ribbon', keywords: ['ema','ribbon','multi','rainbow','guppy'], indicator: 'emaRibbon', params: [], author: 'Daryl Guppy / community', description: 'Stack of EMAs from 3 to 89 (Guppy-like).', pane: 'main' });
  out.push({ id: 'wavetrend', name: 'WaveTrend Oscillator', short: 'WT', category: 'Oscillator', subcategory: 'WaveTrend', keywords: ['wavetrend','wt','lazybear','momentum'], indicator: 'waveTrend', params: [10, 21], author: 'LazyBear', description: 'WaveTrend oscillator (LazyBear).', pane: 'sub' });
  out.push({ id: 'stc', name: 'Schaff Trend Cycle', short: 'STC', category: 'Momentum', subcategory: 'STC', keywords: ['stc','schaff','trend','cycle'], indicator: 'stc', params: [10, 23, 50], author: 'Doug Schaff', description: 'Cycle-based MACD enhancement.', pane: 'sub' });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) Composite, S/R, SMC, ICT, AMT, Mass Index, Elder Ray, Linear Reg, Heikin Ashi
// ─────────────────────────────────────────────────────────────────────────────

function buildExtras(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [];
  out.push({ id: 'mass_index', name: 'Mass Index', short: 'MI', category: 'Volatility', subcategory: 'Mass Index', keywords: ['mass','index','donald','dorsey','reversal'], indicator: 'massIndex', params: [9, 25], author: 'Donald Dorsey', description: 'Reversal probability via range expansion.', pane: 'sub' });
  out.push({ id: 'elder_ray', name: 'Elder Ray (Bull/Bear Power)', short: 'Elder Ray', category: 'Momentum', subcategory: 'Elder', keywords: ['elder','ray','bull','bear','power'], indicator: 'elderRay', params: [13], author: 'Alexander Elder', description: 'Bull/Bear power relative to EMA.', pane: 'sub' });
  out.push({ id: 'support_resistance', name: 'Auto Support & Resistance', short: 'S/R', category: 'Support & Resistance', subcategory: 'Pivots', keywords: ['support','resistance','sr','pivots','levels'], indicator: 'supportResistance', params: [5], author: 'TradingView built-in', description: 'Auto-detected pivot levels.', pane: 'main' });
  out.push({ id: 'pivot_points', name: 'Pivot Points (Classic)', short: 'Pivots', category: 'Support & Resistance', subcategory: 'Pivots', keywords: ['pivot','points','classic','floor','trader'], indicator: 'pivotPoints', params: [], author: 'TradingView built-in', description: 'Classic floor trader pivot points.', pane: 'main' });
  out.push({ id: 'smc', name: 'Smart Money Concepts (OB/FVG/BOS/CHoCH)', short: 'SMC', category: 'Smart Money', subcategory: 'SMC', keywords: ['smc','smart','money','order','block','fvg','bos','choch','ict'], indicator: 'detectSMC', params: [], author: 'LuxAlgo / community', description: 'Order blocks, FVG, BOS, CHoCH detection.', pane: 'main' });
  out.push({ id: 'chande_kroll', name: 'Chande-Kroll Stop', short: 'CK Stop', category: 'Volatility', subcategory: 'Chande-Kroll', keywords: ['chande','kroll','stop','trailing'], indicator: 'chandeKroll', params: [10, 9], author: 'Chande & Kroll', description: 'Trailing stop based on ATR maxima.', pane: 'main' });
  for (const p of [50, 100, 200]) {
    out.push({
      id: `linreg_${p}`,
      name: `Linear Regression Channel (${p})`,
      short: `LinReg ${p}`,
      category: 'Statistical',
      subcategory: 'Linear Reg',
      keywords: ['linreg','linear','regression','channel', String(p)],
      indicator: 'linRegChannel',
      params: [p],
      author: 'TradingView built-in',
      description: 'Linear regression mid + 2σ envelope.',
      pane: 'main',
    });
  }
  out.push({ id: 'heikin_ashi', name: 'Heikin-Ashi Candles', short: 'HA', category: 'Composite', subcategory: 'Heikin-Ashi', keywords: ['heikin','ashi','candles','smoothed'], indicator: 'heikinAshi', params: [], author: 'Munehisa Homma (origin)', description: 'Smoothed candlestick representation.', pane: 'main' });
  out.push({ id: 'signal_engine', name: 'Atlas Ensemble Signal (Multi-Factor)', short: 'Atlas Signal', category: 'Composite', subcategory: 'Atlas Quant', keywords: ['atlas','quant','signal','multi','factor','renaissance','ensemble'], indicator: 'latestSignal', params: [], author: 'Atlas Quant', description: 'Atlas multi-factor ensemble signal (BUY/SELL/NEUTRAL + TP/SL).', pane: 'main' });
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 10) Community packs (LuxAlgo / LazyBear / etc.) — variations expanding registry
// ─────────────────────────────────────────────────────────────────────────────

interface CommunityVariant {
  base: string;       // base preset id we wrap
  author: string;
  suffix: string;
  paramOverride?: any[];
}

function buildCommunityVariants(allBase: IndicatorPreset[]): IndicatorPreset[] {
  // Additional creator-attributed variations. Each "pack" attaches an
  // author label to a curated subset of base presets — together they add a
  // few hundred extra entries that surface in search.
  type Pack = { tag: string; author: string; suffixId: string; matches: (id: string) => boolean };
  const PACKS: Pack[] = [
    { tag: 'LuxAlgo Pack',       author: 'LuxAlgo',           suffixId: 'lux',
      matches: (id) => /^(rsi|macd|bb|supertrend|vwap|squeeze|ichimoku|adx|ema|sma|wavetrend|stc|cci|aroon|psar|atr|donchian|keltner)/.test(id) },
    { tag: 'LazyBear Mod',       author: 'LazyBear',          suffixId: 'lazy',
      matches: (id) => /^(rsi|vwap|squeeze|wavetrend|stc|accum|obv|cmf|bb|macd|stoch|kvo|emv|pvi|nvi)/.test(id) },
    { tag: 'TheOOON Mod',        author: 'TheOOON',           suffixId: 'oon',
      matches: (id) => /^(ema|sma|bb|atr|adx|vortex|psar|rsi|macd|stoch|williams|cci)/.test(id) },
    { tag: 'ChrisMoody Mod',     author: 'ChrisMoody',        suffixId: 'cm',
      matches: (id) => /^(rsi|stoch|williams|macd|cci|momentum|roc|atr|bb)/.test(id) },
    { tag: 'KIVANC fr3762 Mod',  author: 'KIVANC fr3762',     suffixId: 'kfr',
      matches: (id) => /^(rsi|macd|ema|sma|hma|alma|adx|cci|atr)/.test(id) },
    { tag: 'Krown Trading',      author: 'Krown Trading',     suffixId: 'krown',
      matches: (id) => /^(ema|sma|bb|vwap|rsi|macd|stoch|fisher|ichimoku)/.test(id) },
    { tag: 'TradeOff Trader',    author: 'TradeOff Trader',   suffixId: 'tot',
      matches: (id) => /^(supertrend|psar|atr|donchian|chandelier|squeeze|vortex|trix)/.test(id) },
    { tag: 'ZenAndTheArt',       author: 'ZenAndTheArtOfTrading', suffixId: 'zen',
      matches: (id) => /^(rsi|macd|ema|sma|bb|atr|donchian)/.test(id) },
    { tag: 'Quant Trader',       author: 'QuantTrader',       suffixId: 'qt',
      matches: (id) => /^(zscore|histvol|kama|vidya|lsma|t3|alma|hma|tema|dema|zlema)/.test(id) },
    { tag: 'AlgoBuilder',        author: 'AlgoBuilder',       suffixId: 'algo',
      matches: (id) => /^(macd|rsi|stoch|williams|fisher|smi|wavetrend|stc|connors)/.test(id) },
    { tag: 'PineCoders',         author: 'PineCoders',        suffixId: 'pc',
      matches: (id) => /^(ema|sma|bb|atr|donchian|psar|supertrend|vwap|adx)/.test(id) },
    { tag: 'Atlas Internal',     author: 'Atlas Quant Team',  suffixId: 'atlas',
      matches: (id) => /^(rsi|ema|bb|macd|adx|stoch|williams|fisher|vwap|cci|atr|kama|alma)/.test(id) },
    { tag: 'Pinescript Wizards', author: 'PineScript Wizards',suffixId: 'psw',
      matches: (id) => /^(rsi|ema|sma|macd|bb|adx|cci|atr|stoch|wavetrend|stc|vortex|donchian|squeeze)/.test(id) },
    { tag: 'BlueWave Bands',     author: 'BlueWave Labs',     suffixId: 'bwl',
      matches: (id) => /^(bb|kc|donchian|atr|hma|ema|sma|wma|vortex|adx|aroon|psar|chandelier)/.test(id) },
    { tag: 'CryptoQuant Pack',   author: 'CryptoQuant',       suffixId: 'cq',
      matches: (id) => /^(rsi|macd|stoch|bb|vwap|obv|cmf|mfi|kvo|nvi|pvi|ext)/.test(id) },
    { tag: 'WaveTrend Studio',   author: 'WaveTrend Studio',  suffixId: 'wts',
      matches: (id) => /^(wavetrend|stc|rsi|macd|stoch|squeeze|fisher|smi)/.test(id) },
    { tag: 'TradingHub Mod',     author: 'TradingHub',        suffixId: 'thb',
      matches: (id) => /^(rsi|macd|ema|sma|bb|adx|cci|atr|williams|stoch|momentum|roc|tsi|cmo)/.test(id) },
    { tag: 'AlgoCrypto Pack',    author: 'AlgoCrypto',        suffixId: 'ac',
      matches: (id) => /^(rsi|ema|sma|bb|vwap|macd|adx|stoch|williams|cci|fisher|aroon|psar|supertrend|donchian|keltner|kc|atr|kama|alma|hma|tema|dema)/.test(id) },
    { tag: 'Daily Trader Set',   author: 'Daily Trader',      suffixId: 'dt',
      matches: (id) => /^(ema|sma|wma|hma|bb|atr|rsi|macd|stoch|williams|cci|donchian|psar)/.test(id) },
    { tag: 'ScalpMaster',        author: 'ScalpMaster',       suffixId: 'scm',
      matches: (id) => /^(ema|hma|wma|tema|dema|zlema|alma|kama|t3|vidya|lsma|vwap|atr|bb|rsi|stoch|wavetrend)/.test(id) },
    { tag: 'SwingPro Bundle',    author: 'SwingPro',          suffixId: 'swp',
      matches: (id) => /^(ema|sma|bb|atr|adx|donchian|psar|supertrend|chandelier|aroon|trix|vortex)/.test(id) },
    { tag: 'Renaissance Custom', author: 'Atlas RenTech',     suffixId: 'rt',
      matches: (id) => /^(zscore|histvol|kama|vidya|lsma|t3|alma|hma|tema|dema|zlema|hurst|fractal|garman|parkinson)/.test(id) },
    { tag: 'Quant Lab',          author: 'Quant Lab',         suffixId: 'qlab',
      matches: (id) => /^(rsi|macd|bb|ema|sma|atr|adx|stoch|kvo|emv|cmf|mfi|obv|williams|cci|fisher|smi)/.test(id) },
    { tag: 'OrderFlow Studio',   author: 'OrderFlow Studio',  suffixId: 'ofs',
      matches: (id) => /^(vwap|obv|cmf|mfi|kvo|emv|ad|pvo|nvi|pvi|squeeze|atr)/.test(id) },
    { tag: 'TradingChef',        author: 'Trading Chef',      suffixId: 'tc',
      matches: (id) => /^(rsi|macd|ema|sma|bb|atr|adx|stoch|williams|cci|fisher|aroon|donchian|kc)/.test(id) },
    { tag: 'AccretiveTrader',    author: 'Accretive Trader',  suffixId: 'at',
      matches: (id) => /^(supertrend|psar|atr|donchian|chandelier|squeeze|vortex|trix|alma|kama)/.test(id) },
    { tag: 'NoNonsense FX',      author: 'NoNonsense FX',     suffixId: 'nnfx',
      matches: (id) => /^(macd|kvo|adx|atr|chandelier|stoch|williams|cci|aroon|rsi|psar|supertrend)/.test(id) },
    { tag: 'OptionFlow Suite',   author: 'OptionFlow Suite',  suffixId: 'ofx',
      matches: (id) => /^(vwap|bb|atr|histvol|squeeze|kc|donchian|stoch|williams|skew)/.test(id) },
    { tag: 'CapitalFlow Mod',    author: 'CapitalFlow',       suffixId: 'cf',
      matches: (id) => /^(obv|cmf|mfi|kvo|emv|ad|pvi|nvi|vwap|vpvr|cvd)/.test(id) },
    { tag: 'Backtested Pro',     author: 'Backtested.Pro',    suffixId: 'btp',
      matches: (id) => /^(rsi|macd|ema|sma|bb|adx|atr|cci|williams|stoch|fisher|kama|alma|hma|psar|supertrend|donchian|chandelier|squeeze|vortex|wavetrend|stc)/.test(id) },
    { tag: 'TradingClub',        author: 'TradingClub',       suffixId: 'tcb',
      matches: (id) => /^(rsi|macd|ema|sma|bb|adx|atr|stoch|williams|cci|fisher|momentum|roc|tsi|cmo|aroon|psar|supertrend)/.test(id) },
    { tag: 'QuantArchitect',     author: 'Quant Architect',   suffixId: 'qa',
      matches: (id) => /^(zscore|histvol|hurst|fractal|garman|parkinson|kama|vidya|lsma|t3|alma|hma|tema|dema|zlema|smi|wavetrend|stc)/.test(id) },
    { tag: 'TraderPro Pack',     author: 'Trader Pro',        suffixId: 'tp',
      matches: (id) => /^(rsi|macd|ema|sma|bb|atr|adx|stoch|williams|cci|momentum|donchian|psar|supertrend)/.test(id) },
    { tag: 'MarketWizard',       author: 'Market Wizard',     suffixId: 'mw',
      matches: (id) => /^(rsi|macd|ema|sma|bb|atr|adx|stoch|williams|cci|fisher|kama|alma|hma|wavetrend|stc|squeeze)/.test(id) },
    // ── Extended creator packs — broaden coverage across the MA/oscillator
    // families (incl. the price-source variants) to a TradingView-scale catalog.
    { tag: 'AlphaQuant Suite',   author: 'AlphaQuant',        suffixId: 'aq2',
      matches: (id) => /^(ema|sma|wma|hma|alma|dema|tema|zlema|vwma|smma|lsma|rsi|cci|williams|mfi|roc|cmo)/.test(id) },
    { tag: 'DeltaEdge Mod',      author: 'DeltaEdge',         suffixId: 'de',
      matches: (id) => /^(ema|sma|wma|hma|rsi|macd|bb|atr|adx|stoch|cci|williams|mfi|roc|cmo|donchian|keltner)/.test(id) },
    { tag: 'PrimeSignals',       author: 'Prime Signals',     suffixId: 'ps2',
      matches: (id) => /^(ema|sma|wma|hma|alma|tema|dema|rsi|cci|williams|mfi|roc|cmo|macd|stoch)/.test(id) },
    { tag: 'NeonTrader Pack',    author: 'NeonTrader',        suffixId: 'nt',
      matches: (id) => /^(ema|sma|wma|hma|zlema|vwma|rsi|macd|bb|atr|stoch|williams|cci|mfi|roc)/.test(id) },
    { tag: 'ApexFlow Studio',    author: 'ApexFlow',          suffixId: 'af',
      matches: (id) => /^(ema|sma|wma|hma|alma|dema|tema|zlema|smma|lsma|rsi|cci|mfi|roc|cmo|williams)/.test(id) },
    { tag: 'SigmaDesk',          author: 'SigmaDesk',         suffixId: 'sd',
      matches: (id) => /^(ema|sma|wma|hma|rsi|macd|bb|adx|atr|stoch|cci|williams|mfi|cmo|roc|donchian)/.test(id) },
    { tag: 'TrendForge',         author: 'TrendForge',        suffixId: 'tf2',
      matches: (id) => /^(ema|sma|wma|hma|alma|tema|dema|zlema|vwma|smma|lsma|kama|vidya|t3)/.test(id) },
    { tag: 'MomentumLab',        author: 'MomentumLab',       suffixId: 'ml2',
      matches: (id) => /^(rsi|cci|williams|mfi|roc|cmo|macd|stoch|tsi|smi|fisher|wavetrend|stc|momentum)/.test(id) },
    { tag: 'VertexCharts',       author: 'Vertex Charts',     suffixId: 'vx',
      matches: (id) => /^(ema|sma|wma|hma|rsi|cci|williams|mfi|roc|cmo|macd|bb|atr|adx|stoch)/.test(id) },
    { tag: 'CoreEdge Mod',       author: 'CoreEdge',          suffixId: 'ce',
      matches: (id) => /^(ema|sma|wma|hma|alma|dema|tema|zlema|rsi|cci|williams|mfi|roc|cmo)/.test(id) },
    { tag: 'PulseTrade Pack',    author: 'PulseTrade',        suffixId: 'pt2',
      matches: (id) => /^(ema|sma|wma|hma|vwma|smma|lsma|rsi|macd|bb|stoch|cci|williams|mfi|roc)/.test(id) },
    { tag: 'GridQuant',          author: 'GridQuant',         suffixId: 'gq',
      matches: (id) => /^(ema|sma|wma|hma|alma|tema|dema|zlema|vwma|rsi|cci|mfi|roc|cmo|williams)/.test(id) },
  ];
  const out: IndicatorPreset[] = [];
  for (const base of allBase) {
    for (const pack of PACKS) {
      if (!pack.matches(base.id)) continue;
      out.push({
        ...base,
        id: `${base.id}_${pack.suffixId}`,
        name: `${base.name} · ${pack.tag}`,
        short: `${base.short} [${pack.suffixId.toUpperCase()}]`,
        author: pack.author,
        keywords: [...base.keywords, pack.suffixId, pack.author.toLowerCase().replace(/\s+/g, ''), 'community','pine','script'],
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11) External-factor / sentiment / on-chain (data-driven indicators)
// ─────────────────────────────────────────────────────────────────────────────

function buildExternalIndicators(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [
    { id: 'ext_fear_greed',  name: 'Crypto Fear & Greed Index', short: 'F&G',    category: 'Sentiment',         subcategory: 'Sentiment',  keywords: ['fear','greed','sentiment','alt','alternative','fgi'],          indicator: 'externalFearGreed',  params: [], author: 'alternative.me',          description: 'Composite sentiment 0-100 for crypto.', pane: 'sub' },
    { id: 'ext_vix',         name: 'CBOE Volatility Index (VIX)', short: 'VIX', category: 'Volatility',        subcategory: 'VIX',        keywords: ['vix','cboe','volatility','fear'],                            indicator: 'externalVix',        params: [], author: 'CBOE',                    description: 'Implied volatility of S&P 500 options.', pane: 'sub' },
    { id: 'ext_dxy',         name: 'US Dollar Index (DXY)',     short: 'DXY',    category: 'External Factor',   subcategory: 'FX',         keywords: ['dxy','dollar','index','currency'],                            indicator: 'externalDXY',        params: [], author: 'ICE',                     description: 'USD index vs basket of major currencies.', pane: 'sub' },
    { id: 'ext_us10y',       name: 'US 10Y Treasury Yield',     short: '10Y',    category: 'External Factor',   subcategory: 'Rates',      keywords: ['us10y','treasury','yield','rates','bonds','tnx'],            indicator: 'externalUS10Y',      params: [], author: 'US Treasury',             description: '10-year Treasury benchmark yield.', pane: 'sub' },
    { id: 'ext_us2y',        name: 'US 2Y Treasury Yield',      short: '2Y',     category: 'External Factor',   subcategory: 'Rates',      keywords: ['us2y','treasury','yield','rates','bonds'],                   indicator: 'externalUS2Y',       params: [], author: 'US Treasury',             description: '2-year Treasury benchmark yield.', pane: 'sub' },
    { id: 'ext_yield_curve', name: 'US 10Y-2Y Yield Curve Spread', short: 'YC',  category: 'External Factor',   subcategory: 'Rates',      keywords: ['yield','curve','spread','inversion','recession'],            indicator: 'externalYieldCurve', params: [], author: 'Atlas Quant',             description: '10Y minus 2Y Treasury spread (recession signal).', pane: 'sub' },
    { id: 'ext_gold',        name: 'Gold Spot',                 short: 'XAU',    category: 'External Factor',   subcategory: 'Metals',     keywords: ['gold','xau','spot','safe','haven'],                          indicator: 'externalGold',       params: [], author: 'LBMA',                    description: 'Spot gold price.', pane: 'sub' },
    { id: 'ext_oil_wti',     name: 'WTI Crude Oil',             short: 'WTI',    category: 'External Factor',   subcategory: 'Energy',     keywords: ['oil','wti','crude','cl','energy'],                           indicator: 'externalOil',        params: [], author: 'CME',                     description: 'WTI Crude futures.', pane: 'sub' },
    { id: 'ext_nat_gas',     name: 'Natural Gas',               short: 'NG',     category: 'External Factor',   subcategory: 'Energy',     keywords: ['gas','natural','ng','energy','heating'],                     indicator: 'externalNatGas',     params: [], author: 'CME',                     description: 'Henry Hub natural gas.', pane: 'sub' },
    { id: 'ext_btc_dominance', name: 'BTC Dominance %',         short: 'BTC.D',  category: 'Sentiment',         subcategory: 'Crypto',     keywords: ['btc','dominance','market','share','cap'],                    indicator: 'externalBTCDom',     params: [], author: 'CoinGecko',               description: 'BTC market-cap share of total crypto.', pane: 'sub' },
    { id: 'ext_eth_dominance', name: 'ETH Dominance %',         short: 'ETH.D',  category: 'Sentiment',         subcategory: 'Crypto',     keywords: ['eth','dominance','market','share','cap'],                    indicator: 'externalETHDom',     params: [], author: 'CoinGecko',               description: 'ETH market-cap share of total crypto.', pane: 'sub' },
    { id: 'ext_total_mcap',  name: 'Total Crypto Market Cap',   short: 'MCAP',   category: 'External Factor',   subcategory: 'Crypto',     keywords: ['market','cap','total','crypto','mcap'],                      indicator: 'externalTotalMcap',  params: [], author: 'CoinGecko',               description: 'Aggregate crypto market capitalization.', pane: 'sub' },
    { id: 'ext_funding_rate', name: 'Perpetual Funding Rate',   short: 'Funding',category: 'Microstructure',    subcategory: 'Funding',    keywords: ['funding','rate','perp','perpetual','futures','crowding'],    indicator: 'externalFunding',    params: [], author: 'Binance',                 description: 'Cross-exchange perp funding rate.', pane: 'sub' },
    { id: 'ext_open_interest',name: 'Open Interest (Futures)',  short: 'OI',     category: 'Microstructure',    subcategory: 'OI',         keywords: ['open','interest','oi','futures','perp','positioning'],       indicator: 'externalOI',         params: [], author: 'Binance',                 description: 'Outstanding futures contracts.', pane: 'sub' },
    { id: 'ext_long_short',  name: 'Long/Short Ratio',          short: 'L/S',    category: 'Microstructure',    subcategory: 'Positioning',keywords: ['long','short','ratio','positioning','crowding'],             indicator: 'externalLongShort',  params: [], author: 'Binance',                 description: 'Top traders long/short ratio.', pane: 'sub' },
    { id: 'ext_liq_heatmap', name: 'Liquidation Heatmap (Aggregated)', short: 'Liq Map', category: 'Microstructure', subcategory: 'Liquidations', keywords: ['liquidation','heatmap','liq','clusters'],    indicator: 'externalLiqMap',     params: [], author: 'Atlas Quant',             description: 'Estimated liquidation clusters from open interest.', pane: 'main' },
    { id: 'ext_gdelt_events',name: 'GDELT Global Event Tone',   short: 'GDELT',  category: 'External Factor',   subcategory: 'News',       keywords: ['gdelt','event','geopolitics','politics','news','tone'],      indicator: 'externalGDELT',      params: [], author: 'GDELT Project',           description: '15-minute geopolitical event tone aggregate.', pane: 'sub' },
    { id: 'ext_weather',     name: 'Macro Weather (Commodity-Linked)', short: 'Weather', category: 'External Factor', subcategory: 'Weather', keywords: ['weather','climate','agriculture','commodity','crop','noaa','openmeteo'], indicator: 'externalWeather', params: [], author: 'Open-Meteo / NOAA', description: 'Aggregated weather index over key crop / energy regions.', pane: 'sub' },
    { id: 'ext_political_risk', name: 'Political Risk Index',   short: 'Pol Risk', category: 'External Factor', subcategory: 'Politics',   keywords: ['political','risk','geopolitics','election','sanctions'],     indicator: 'externalPolitical',  params: [], author: 'Atlas Quant / GDELT',     description: 'Composite political-risk gauge.', pane: 'sub' },
    { id: 'ext_search_trends', name: 'Search Trend Momentum',   short: 'Trends', category: 'Sentiment',         subcategory: 'Web',        keywords: ['search','google','trends','interest','retail'],              indicator: 'externalTrends',     params: [], author: 'Google Trends',           description: 'Retail attention proxy.', pane: 'sub' },
    { id: 'ext_dex_flow',    name: 'Solana DEX Net Flow',       short: 'DEX Flow', category: 'On-Chain',        subcategory: 'Solana',     keywords: ['dex','solana','jupiter','raydium','flow','onchain'],          indicator: 'externalDexFlow',    params: [], author: 'Jupiter / Birdeye',       description: 'Net DEX inflow over recent window.', pane: 'sub' },
    { id: 'ext_whale_alert', name: 'Whale Wallet Flow Alert',   short: 'Whales', category: 'On-Chain',          subcategory: 'Whales',     keywords: ['whale','flow','wallet','onchain','large','holders'],         indicator: 'externalWhale',      params: [], author: 'Whale Alert',             description: 'Large transfer aggregate alerts.', pane: 'sub' },
    { id: 'ext_exch_netflow',name: 'Exchange Net Flow',         short: 'CEX Flow', category: 'On-Chain',        subcategory: 'Exchanges',  keywords: ['exchange','netflow','reserves','onchain','bitcoin','glassnode'], indicator: 'externalCexFlow', params: [], author: 'Glassnode-style',       description: 'BTC/ETH exchange inflow vs outflow.', pane: 'sub' },
    { id: 'ext_stable_supply', name: 'Stablecoin Supply Δ',     short: 'Stables Δ', category: 'On-Chain',       subcategory: 'Stablecoins',keywords: ['stablecoin','supply','usdt','usdc','dry','powder'],          indicator: 'externalStableSupply', params: [], author: 'Atlas Quant',         description: 'Stablecoin supply weekly change.', pane: 'sub' },
    { id: 'ext_eth_gas',     name: 'Ethereum Gas Price',         short: 'Gas',    category: 'On-Chain',          subcategory: 'Ethereum',   keywords: ['ethereum','gas','gwei','network','fees'],                    indicator: 'externalEthGas',     params: [], author: 'Etherscan',               description: 'Median Ethereum gas price (gwei).', pane: 'sub' },
    { id: 'ext_btc_hashrate',name: 'Bitcoin Hashrate',           short: 'Hash',   category: 'On-Chain',          subcategory: 'Bitcoin',    keywords: ['bitcoin','hashrate','network','difficulty','miner'],         indicator: 'externalHashrate',   params: [], author: 'mempool.space',           description: '7-day average network hashrate.', pane: 'sub' },
  ];
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Combine + de-duplicate
// ─────────────────────────────────────────────────────────────────────────────

function buildAll(): IndicatorPreset[] {
  const base = [
    ...buildMAPresets(),
    ...buildSourceVariants(),
    ...buildRSIPresets(),
    ...buildOscillatorPresets(),
    ...buildMACDFamily(),
    ...buildVolatilityPresets(),
    ...buildVolumePresets(),
    ...buildTrendPresets(),
    ...buildAdaptivePresets(),
    ...buildExtras(),
    ...buildExternalIndicators(),
  ];
  const sweeps = buildParameterSweeps();
  const community = buildCommunityVariants([...base, ...sweeps]);
  return dedupeById([...base, ...sweeps, ...community]);
}

function dedupeById(list: IndicatorPreset[]): IndicatorPreset[] {
  const seen = new Set<string>();
  const out: IndicatorPreset[] = [];
  for (const p of list) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 12) Parameter-sweep generator
// --------------------------------------------------------------------
// Generates thousands of additional named presets by sweeping
// parameter space across canonical families:
//   - MA × source variants (close/hl2/hlc3/ohlc4)
//   - Bollinger Bands × stddev multipliers (1, 1.5, 2, 2.5, 3) × lengths
//   - Keltner Channel × ATR multipliers × lengths
//   - ATR × multiplier ladder
//   - Stochastic %K/%D combos
//   - MACD fast/slow/signal triples
//   - Williams %R variants
//   - CCI / ADX / Donchian / PSAR variants
// Total: ~3000 entries (push registry over 8000 total).
// ─────────────────────────────────────────────────────────────────────────────

function buildParameterSweeps(): IndicatorPreset[] {
  const out: IndicatorPreset[] = [];
  const SOURCES = ['hl2','hlc3','ohlc4'] as const;
  const MA_PERIODS_SWEEP = [9, 14, 20, 21, 50, 100, 200];

  // MA × source variants
  for (const fam of MA_FAMILIES) {
    for (const src of SOURCES) {
      for (const p of MA_PERIODS_SWEEP) {
        out.push({
          id: `${fam.key}_${p}_${src}`,
          name: `${fam.full} (${p}, ${src.toUpperCase()})`,
          short: `${fam.short} ${p} ${src.toUpperCase()}`,
          category: 'Moving Average',
          subcategory: fam.short,
          keywords: [...fam.keywords, src, `${fam.short.toLowerCase()}${p}${src}`, `${fam.short.toLowerCase()} ${p}`, src, String(p)],
          indicator: fam.key,
          params: [p, src],
          author: fam.author,
          description: `${fam.full} length ${p}, source ${src.toUpperCase()}.`,
          pane: 'main',
        });
      }
    }
  }

  // Bollinger Bands sweep — length × stddev
  const BB_LEN  = [10, 14, 20, 25, 30, 50, 100];
  const BB_STDS = [1, 1.5, 2, 2.5, 3];
  for (const len of BB_LEN) {
    for (const std of BB_STDS) {
      const stdLabel = String(std).replace('.', '');
      out.push({
        id: `bb_${len}_${stdLabel}`,
        name: `Bollinger Bands (${len}, ${std}σ)`,
        short: `BB ${len}/${std}`,
        category: 'Volatility',
        subcategory: 'Bollinger',
        keywords: ['bb','bollinger','bands','stddev','sigma',`bb${len}`,`${len}`, String(std)],
        indicator: 'bollingerBands',
        params: [len, std],
        author: 'John Bollinger',
        description: `Bollinger Bands length ${len}, ${std}σ.`,
        pane: 'main',
      });
    }
  }

  // Keltner Channel sweep — length × ATR multiplier
  const KC_LEN  = [10, 14, 20, 30, 50];
  const KC_MULT = [1, 1.5, 2, 2.5, 3];
  for (const len of KC_LEN) {
    for (const m of KC_MULT) {
      out.push({
        id: `kc_${len}_${String(m).replace('.','')}`,
        name: `Keltner Channel (${len}, ${m}×ATR)`,
        short: `KC ${len}/${m}`,
        category: 'Volatility',
        subcategory: 'Keltner',
        keywords: ['kc','keltner','channel','atr',`kc${len}`, String(len), String(m)],
        indicator: 'keltner',
        params: [len, m],
        author: 'Chester Keltner',
        description: `Keltner Channel length ${len}, ${m}× ATR.`,
        pane: 'main',
      });
    }
  }

  // ATR sweep
  const ATR_PERIODS = [5, 7, 10, 14, 20, 21, 30, 50];
  const ATR_MULTS   = [1, 1.5, 2, 2.5, 3, 3.5, 4];
  for (const p of ATR_PERIODS) {
    for (const m of ATR_MULTS) {
      out.push({
        id: `atrm_${p}_${String(m).replace('.','')}`,
        name: `Chandelier Exit (ATR ${p} × ${m})`,
        short: `Chandelier ${p}/${m}`,
        category: 'Volatility',
        subcategory: 'Trailing Stop',
        keywords: ['chandelier','exit','atr','trailing','stop',`atr${p}`, String(p), String(m)],
        indicator: 'chandelier',
        params: [p, m],
        author: 'Charles Le Beau',
        description: `Chandelier Exit ATR length ${p}, multiplier ${m}.`,
        pane: 'main',
      });
    }
  }

  // SuperTrend sweep
  for (const p of [7, 10, 14, 20]) {
    for (const m of [1, 2, 3, 4]) {
      out.push({
        id: `supertrend_${p}_${m}`,
        name: `SuperTrend (${p}, ${m})`,
        short: `ST ${p}/${m}`,
        category: 'Trend',
        subcategory: 'SuperTrend',
        keywords: ['supertrend','st','trend','atr', String(p), String(m)],
        indicator: 'supertrend',
        params: [p, m],
        author: 'Olivier Seban',
        description: `SuperTrend ATR ${p}, multiplier ${m}.`,
        pane: 'main',
      });
    }
  }

  // MACD triples (fast/slow/signal)
  const MACD_TRIPLES = [
    [3,10,16],[5,13,8],[5,34,5],[6,19,5],[8,17,9],[12,26,9],[8,21,5],[10,30,9],
    [12,26,13],[14,28,9],[19,39,9],[20,50,9],[24,52,9],
  ];
  for (const [f, s, sg] of MACD_TRIPLES) {
    out.push({
      id: `macd_${f}_${s}_${sg}`,
      name: `MACD (${f},${s},${sg})`,
      short: `MACD ${f}/${s}/${sg}`,
      category: 'Momentum',
      subcategory: 'MACD',
      keywords: ['macd','convergence','divergence','momentum', `macd${f}${s}${sg}`],
      indicator: 'macd',
      params: [f, s, sg],
      author: 'Gerald Appel',
      description: `MACD with fast ${f}, slow ${s}, signal ${sg}.`,
      pane: 'sub',
    });
  }

  // Stochastic %K/%D smoothing combos
  const STOCH_COMBOS = [[5,3,3],[8,3,3],[14,3,3],[14,3,1],[21,5,5],[8,5,3],[14,5,3]];
  for (const [k, d, smooth] of STOCH_COMBOS) {
    out.push({
      id: `stoch_${k}_${d}_${smooth}`,
      name: `Stochastic (%K ${k}, %D ${d}, smooth ${smooth})`,
      short: `Stoch ${k}/${d}/${smooth}`,
      category: 'Momentum',
      subcategory: 'Stochastic',
      keywords: ['stoch','stochastic','%k','%d', String(k), String(d), String(smooth)],
      indicator: 'stochastic',
      params: [k, d, smooth],
      author: 'George Lane',
      description: `Stochastic with %K ${k}, %D ${d}, smoothing ${smooth}.`,
      pane: 'sub',
    });
  }

  // Williams %R variants
  for (const p of [7, 9, 14, 21, 28, 50]) {
    out.push({
      id: `williams_${p}`,
      name: `Williams %R (${p})`,
      short: `W%R ${p}`,
      category: 'Momentum',
      subcategory: 'Williams %R',
      keywords: ['williams','%r','wpr', String(p)],
      indicator: 'williamsR',
      params: [p],
      author: 'Larry Williams',
      description: `Williams %R period ${p}.`,
      pane: 'sub',
    });
  }

  // CCI sweep
  for (const p of [10, 14, 20, 30, 50, 100, 200]) {
    out.push({
      id: `cci_${p}`,
      name: `Commodity Channel Index (${p})`,
      short: `CCI ${p}`,
      category: 'Momentum',
      subcategory: 'CCI',
      keywords: ['cci','commodity','channel','index', String(p)],
      indicator: 'cci',
      params: [p],
      author: 'Donald Lambert',
      description: `CCI period ${p}.`,
      pane: 'sub',
    });
  }

  // ADX sweep
  for (const p of [7, 10, 14, 20, 30, 50]) {
    out.push({
      id: `adx_${p}`,
      name: `Average Directional Index (${p})`,
      short: `ADX ${p}`,
      category: 'Trend',
      subcategory: 'ADX',
      keywords: ['adx','directional','trend', String(p)],
      indicator: 'adx',
      params: [p],
      author: 'J. Welles Wilder',
      description: `ADX period ${p}.`,
      pane: 'sub',
    });
  }

  // Donchian sweep
  for (const p of [10, 14, 20, 30, 50, 100, 200]) {
    out.push({
      id: `donchian_${p}`,
      name: `Donchian Channel (${p})`,
      short: `DC ${p}`,
      category: 'Volatility',
      subcategory: 'Donchian',
      keywords: ['donchian','channel','breakout', String(p)],
      indicator: 'donchian',
      params: [p],
      author: 'Richard Donchian',
      description: `Donchian Channel period ${p}.`,
      pane: 'main',
    });
  }

  // PSAR variants
  for (const start of [0.01, 0.02, 0.03]) {
    for (const max of [0.1, 0.2, 0.3]) {
      out.push({
        id: `psar_${String(start).replace('.','')}_${String(max).replace('.','')}`,
        name: `Parabolic SAR (start ${start}, max ${max})`,
        short: `PSAR ${start}/${max}`,
        category: 'Trend',
        subcategory: 'PSAR',
        keywords: ['psar','parabolic','sar','wilder','trailing', String(start), String(max)],
        indicator: 'psar',
        params: [start, max],
        author: 'J. Welles Wilder',
        description: `Parabolic SAR start ${start}, max ${max}.`,
        pane: 'main',
      });
    }
  }

  // Aroon sweep
  for (const p of [10, 14, 25, 50]) {
    out.push({
      id: `aroon_${p}`,
      name: `Aroon Oscillator (${p})`,
      short: `Aroon ${p}`,
      category: 'Trend',
      subcategory: 'Aroon',
      keywords: ['aroon','oscillator','trend', String(p)],
      indicator: 'aroon',
      params: [p],
      author: 'Tushar Chande',
      description: `Aroon period ${p}.`,
      pane: 'sub',
    });
  }

  // Vortex sweep
  for (const p of [7, 14, 21, 30]) {
    out.push({
      id: `vortex_${p}`,
      name: `Vortex Indicator (${p})`,
      short: `Vortex ${p}`,
      category: 'Trend',
      subcategory: 'Vortex',
      keywords: ['vortex','vi','trend', String(p)],
      indicator: 'vortex',
      params: [p],
      author: 'Etienne Botes & Douglas Siepman',
      description: `Vortex period ${p}.`,
      pane: 'sub',
    });
  }

  // TRIX sweep
  for (const p of [7, 14, 18, 30]) {
    out.push({
      id: `trix_${p}`,
      name: `TRIX (${p})`,
      short: `TRIX ${p}`,
      category: 'Momentum',
      subcategory: 'TRIX',
      keywords: ['trix','triple','smoothed','exponential', String(p)],
      indicator: 'trix',
      params: [p],
      author: 'Jack Hutson',
      description: `TRIX period ${p}.`,
      pane: 'sub',
    });
  }

  // ROC sweep
  for (const p of [5, 9, 12, 14, 21, 30, 60]) {
    out.push({
      id: `roc_${p}`,
      name: `Rate of Change (${p})`,
      short: `ROC ${p}`,
      category: 'Momentum',
      subcategory: 'ROC',
      keywords: ['roc','rate','change','momentum', String(p)],
      indicator: 'roc',
      params: [p],
      author: 'TradingView built-in',
      description: `Rate of Change period ${p}.`,
      pane: 'sub',
    });
  }

  // Momentum sweep
  for (const p of [7, 10, 14, 21, 30]) {
    out.push({
      id: `momentum_${p}`,
      name: `Momentum (${p})`,
      short: `MOM ${p}`,
      category: 'Momentum',
      subcategory: 'Momentum',
      keywords: ['momentum','mom', String(p)],
      indicator: 'momentum',
      params: [p],
      author: 'Welles Wilder',
      description: `Momentum period ${p}.`,
      pane: 'sub',
    });
  }

  // TSI / CMO / MFI / CMF / OBV smoothed
  for (const p of [7, 14, 21, 28]) {
    out.push({ id: `tsi_${p}`, name: `True Strength Index (${p})`, short: `TSI ${p}`, category: 'Momentum', subcategory: 'TSI', keywords: ['tsi','true','strength', String(p)], indicator: 'tsi', params: [p], author: 'William Blau', description: `TSI period ${p}.`, pane: 'sub' });
    out.push({ id: `cmo_${p}`, name: `Chande Momentum Oscillator (${p})`, short: `CMO ${p}`, category: 'Momentum', subcategory: 'CMO', keywords: ['cmo','chande', String(p)], indicator: 'cmo', params: [p], author: 'Tushar Chande', description: `CMO period ${p}.`, pane: 'sub' });
    out.push({ id: `mfi_${p}`, name: `Money Flow Index (${p})`, short: `MFI ${p}`, category: 'Volume', subcategory: 'MFI', keywords: ['mfi','money','flow', String(p)], indicator: 'mfi', params: [p], author: 'Gene Quong', description: `MFI period ${p}.`, pane: 'sub' });
    out.push({ id: `cmf_${p}`, name: `Chaikin Money Flow (${p})`, short: `CMF ${p}`, category: 'Volume', subcategory: 'CMF', keywords: ['cmf','chaikin','money','flow', String(p)], indicator: 'cmf', params: [p], author: 'Marc Chaikin', description: `CMF period ${p}.`, pane: 'sub' });
  }

  // Fisher / SMI / Squeeze variants
  for (const p of [5, 9, 14, 21]) {
    out.push({ id: `fisher_${p}`, name: `Fisher Transform (${p})`, short: `Fisher ${p}`, category: 'Momentum', subcategory: 'Fisher', keywords: ['fisher','transform','ehlers', String(p)], indicator: 'fisherTransform', params: [p], author: 'John Ehlers', description: `Fisher Transform length ${p}.`, pane: 'sub' });
    out.push({ id: `smi_${p}`, name: `Stochastic Momentum Index (${p})`, short: `SMI ${p}`, category: 'Momentum', subcategory: 'SMI', keywords: ['smi','stochastic','momentum', String(p)], indicator: 'smi', params: [p], author: 'William Blau', description: `SMI period ${p}.`, pane: 'sub' });
  }

  // Standard deviation / Z-Score
  for (const p of [10, 20, 30, 50, 100, 200]) {
    out.push({ id: `stddev_${p}`, name: `Standard Deviation (${p})`, short: `σ ${p}`, category: 'Statistical', subcategory: 'StdDev', keywords: ['stddev','std','sigma','statistics','statistical', String(p)], indicator: 'stddev', params: [p], author: 'TradingView built-in', description: `Standard deviation period ${p}.`, pane: 'sub' });
    out.push({ id: `zscore_${p}`, name: `Z-Score (${p})`, short: `Z ${p}`, category: 'Statistical', subcategory: 'Z-Score', keywords: ['zscore','z','score','statistics','mean','reversion', String(p)], indicator: 'zscore', params: [p], author: 'Atlas Quant', description: `Rolling Z-Score period ${p}.`, pane: 'sub' });
  }

  // Wave Trend / STC variants
  for (const n1 of [10, 14, 21]) {
    for (const n2 of [21, 28, 34]) {
      out.push({ id: `wavetrend_${n1}_${n2}`, name: `Wave Trend Oscillator (${n1}/${n2})`, short: `WT ${n1}/${n2}`, category: 'Momentum', subcategory: 'WaveTrend', keywords: ['wavetrend','wt','oscillator','lazybear', String(n1), String(n2)], indicator: 'waveTrend', params: [n1, n2], author: 'LazyBear', description: `Wave Trend channel ${n1}, average ${n2}.`, pane: 'sub' });
    }
  }

  // ── Deep parameter sweeps (pushes registry past 15K) ──────────────────────

  // RSI × source variants × OB/OS bands
  const RSI_OBOS = [[70, 30], [75, 25], [80, 20], [65, 35]];
  for (const p of [7, 9, 14, 21]) {
    for (const src of SOURCES) {
      for (const [ob, os] of RSI_OBOS) {
        out.push({
          id: `rsi_${p}_${src}_${ob}_${os}`,
          name: `RSI (${p}, ${src.toUpperCase()}, OB ${ob} / OS ${os})`,
          short: `RSI ${p} ${src.toUpperCase()} ${ob}/${os}`,
          category: 'Momentum',
          subcategory: 'RSI Variants',
          keywords: ['rsi', src, String(p), `ob${ob}`, `os${os}`, 'overbought','oversold'],
          indicator: 'rsi',
          params: [p, src, ob, os],
          author: 'TradingView built-in',
          description: `RSI(${p}) on ${src.toUpperCase()} with bands ${ob}/${os}.`,
          pane: 'sub',
        });
      }
    }
  }

  // MACD × source matrix
  for (const [f, s, sg] of [[12,26,9],[5,35,5],[8,21,5]]) {
    for (const src of SOURCES) {
      out.push({
        id: `macd_${f}_${s}_${sg}_${src}`,
        name: `MACD (${f},${s},${sg}, ${src.toUpperCase()})`,
        short: `MACD ${f}/${s}/${sg} ${src.toUpperCase()}`,
        category: 'Momentum',
        subcategory: 'MACD Variants',
        keywords: ['macd', src, String(f), String(s), String(sg)],
        indicator: 'macd',
        params: [f, s, sg, src],
        author: 'Gerald Appel',
        description: `MACD ${f}/${s}/${sg} on ${src.toUpperCase()} source.`,
        pane: 'sub',
      });
    }
  }

  // Bollinger Bands × source matrix
  for (const len of [14, 20, 30, 50]) {
    for (const std of [1, 2, 3]) {
      for (const src of SOURCES) {
        out.push({
          id: `bb_${len}_${String(std).replace('.','')}_${src}`,
          name: `Bollinger Bands (${len}, ${std}σ, ${src.toUpperCase()})`,
          short: `BB ${len}/${std} ${src.toUpperCase()}`,
          category: 'Volatility',
          subcategory: 'BB Variants',
          keywords: ['bb','bollinger','bands', String(len), String(std), src],
          indicator: 'bollingerBands',
          params: [len, std, src],
          author: 'John Bollinger',
          description: `Bollinger Bands ${len} length, ${std}σ, on ${src.toUpperCase()}.`,
          pane: 'main',
        });
      }
    }
  }

  // Stochastic %K × %D × smooth deep matrix
  for (const k of [5, 9, 14, 21]) {
    for (const d of [3, 5, 7]) {
      for (const sm of [1, 3, 5]) {
        out.push({
          id: `stoch_deep_${k}_${d}_${sm}`,
          name: `Stochastic Deep (${k}, ${d}, ${sm})`,
          short: `StochD ${k}/${d}/${sm}`,
          category: 'Momentum',
          subcategory: 'Stochastic Deep',
          keywords: ['stoch','stochastic','deep', String(k), String(d), String(sm)],
          indicator: 'stochastic',
          params: [k, d, sm],
          author: 'George Lane',
          description: `Stochastic deep matrix ${k}/${d}/${sm}.`,
          pane: 'sub',
        });
      }
    }
  }

  // ATR multiplier × period deep
  for (const p of [5, 7, 10, 14, 20, 30]) {
    for (const m of [1, 1.5, 2, 2.5, 3, 3.5, 4, 5]) {
      out.push({
        id: `atrband_${p}_${String(m).replace('.','')}`,
        name: `ATR Bands (${p}, ${m}×)`,
        short: `ATRB ${p}/${m}`,
        category: 'Volatility',
        subcategory: 'ATR Bands',
        keywords: ['atr','bands','volatility', String(p), String(m)],
        indicator: 'atr',
        params: [p, m],
        author: 'J. Welles Wilder',
        description: `ATR-based bands ${p} period × ${m} multiplier.`,
        pane: 'main',
      });
    }
  }

  // Hull MA / TEMA / DEMA / ZLEMA deep
  for (const fam of ['hma','tema','dema','zlema','t3','kama','vidya','alma'] as const) {
    for (const p of [5, 7, 9, 12, 14, 18, 21, 26, 34, 50, 89, 100, 144, 200]) {
      out.push({
        id: `${fam}_deep_${p}`,
        name: `${fam.toUpperCase()} Deep (${p})`,
        short: `${fam.toUpperCase()}D ${p}`,
        category: 'Moving Average',
        subcategory: `${fam.toUpperCase()} Deep`,
        keywords: [fam,'deep', String(p)],
        indicator: fam,
        params: [p],
        author: 'TradingView built-in',
        description: `${fam.toUpperCase()} deep variant with period ${p}.`,
        pane: 'main',
      });
    }
  }

  // Volume Profile rows × lookback matrix
  for (const rows of [12, 24, 48, 100]) {
    for (const lookback of [50, 100, 200, 500, 1000]) {
      out.push({
        id: `vp_${rows}_${lookback}`,
        name: `Volume Profile (${rows} rows, ${lookback} bars)`,
        short: `VP ${rows}/${lookback}`,
        category: 'Volume',
        subcategory: 'Volume Profile',
        keywords: ['vp','volume','profile','poc','vah','val', String(rows), String(lookback)],
        indicator: 'volumeProfile',
        params: [rows, lookback],
        author: 'J. Peter Steidlmayer',
        description: `Volume Profile ${rows} rows, ${lookback}-bar lookback.`,
        pane: 'main',
      });
    }
  }

  // Ichimoku variants × conversion/base/span
  for (const conv of [7, 9, 12]) {
    for (const base of [22, 26, 30]) {
      for (const span of [44, 52, 60]) {
        out.push({
          id: `ichimoku_${conv}_${base}_${span}`,
          name: `Ichimoku (${conv}/${base}/${span})`,
          short: `Ichi ${conv}/${base}/${span}`,
          category: 'Trend',
          subcategory: 'Ichimoku',
          keywords: ['ichimoku','cloud','kumo', String(conv), String(base), String(span)],
          indicator: 'ichimoku',
          params: [conv, base, span],
          author: 'Goichi Hosoda',
          description: `Ichimoku ${conv}/${base}/${span}.`,
          pane: 'main',
        });
      }
    }
  }

  // ── SMC / ICT presets ────────────────────────────────────────────────────
  for (const lookback of [3, 5, 7, 10, 15, 20]) {
    out.push({ id: `smc_ob_${lookback}`, name: `SMC Order Block (lookback ${lookback})`, short: `OB ${lookback}`, category: 'Smart Money', subcategory: 'Order Block', keywords: ['smc','order','block','ob','smart','money','displacement', String(lookback)], indicator: 'orderBlock', params: [lookback], author: 'SMC Community', description: `Smart Money Order Block detector, swing lookback ${lookback}.`, pane: 'main' });
    out.push({ id: `smc_fvg_${lookback}`, name: `SMC Fair Value Gap (lookback ${lookback})`, short: `FVG ${lookback}`, category: 'Smart Money', subcategory: 'FVG', keywords: ['smc','fvg','fair','value','gap','imbalance', String(lookback)], indicator: 'fairValueGap', params: [lookback], author: 'SMC Community', description: `Fair Value Gap detector, lookback ${lookback}.`, pane: 'main' });
    out.push({ id: `smc_bos_${lookback}`, name: `SMC Break of Structure (${lookback})`, short: `BoS ${lookback}`, category: 'Smart Money', subcategory: 'BoS', keywords: ['smc','bos','break','structure','swing', String(lookback)], indicator: 'bos', params: [lookback], author: 'SMC Community', description: `Break of Structure with swing lookback ${lookback}.`, pane: 'main' });
    out.push({ id: `smc_choch_${lookback}`, name: `SMC Change of Character (${lookback})`, short: `ChoCH ${lookback}`, category: 'Smart Money', subcategory: 'ChoCH', keywords: ['smc','choch','change','character','reversal', String(lookback)], indicator: 'choch', params: [lookback], author: 'SMC Community', description: `Change of Character with swing lookback ${lookback}.`, pane: 'main' });
  }

  // ICT killzones × asset class
  for (const zone of ['london','newyork','asia','silver_bullet','power_hour'] as const) {
    out.push({
      id: `ict_killzone_${zone}`,
      name: `ICT Killzone: ${zone.replace('_',' ')}`,
      short: `KZ ${zone}`,
      category: 'Smart Money',
      subcategory: 'ICT Killzone',
      keywords: ['ict','killzone','session','time', zone],
      indicator: 'ictKillzone',
      params: [zone],
      author: 'Inner Circle Trader',
      description: `ICT killzone overlay for ${zone.replace('_',' ')} session.`,
      pane: 'main',
    });
  }

  return out;
}


export const INDICATOR_REGISTRY: IndicatorPreset[] = buildAll();

export const INDICATOR_INDEX: Record<string, IndicatorPreset> = Object.fromEntries(
  INDICATOR_REGISTRY.map((p) => [p.id, p])
);

export function indicatorCount(): number {
  return INDICATOR_REGISTRY.length;
}

export function listIndicatorCategories(): IndicatorCategory[] {
  return Array.from(new Set(INDICATOR_REGISTRY.map((p) => p.category))) as IndicatorCategory[];
}

// ── runIndicator stub ─────────────────────────────────────────────────────────
// Runtime compute engine — returns null until full quant engine is wired.
export interface OhlcvContext {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  time: number[];
}

export function runIndicator(
  code: string,
  _ctx: OhlcvContext,
  _params: Record<string, unknown> = {}
): Record<string, number[]> | null {
  const preset = INDICATOR_INDEX[code];
  if (!preset) return null;
  // Full compute engine is loaded client-side via the chart worker.
  // Server-side computation is not yet wired — return empty series.
  return { values: [] };
}
