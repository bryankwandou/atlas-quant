/**
 * Atlas Quant · Indicator Registry
 * Catalogs 800+ named indicator presets exposed through TradingView-style search.
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
  const community = buildCommunityVariants(base);
  return [...base, ...community];
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
