export const INDICATOR_CATEGORIES = {
  QUANT: {
    label: 'Quantitative', labelId: 'Kuantitatif', color: 'purple',
    indicators: [
      { id: 'QUANT_REGIME',     name: 'Market Regime Detector', nameId: 'Detektor Kondisi Pasar', default: true  },
      { id: 'QUANT_SIGNAL',     name: 'Quant Signal Engine',    nameId: 'Engine Sinyal Quant',    default: true  },
      { id: 'QUANT_CONFIDENCE', name: 'Signal Confidence',      nameId: 'Keyakinan Sinyal',       default: true  },
      { id: 'VOLATILITY_PCT',   name: 'Volatility Percentile',  nameId: 'Persentil Volatilitas',  default: false },
      { id: 'WILLIAMS_AD',      name: 'Williams A/D',           nameId: 'Williams A/D',           default: false },
      { id: 'MTF_CONFIRM',      name: 'Multi-TF Confirmation',  nameId: 'Konfirmasi Multi-TF',    default: false },
    ],
  },
  TREND: {
    label: 'Trend', labelId: 'Tren', color: 'blue',
    indicators: [
      { id: 'EMA_9',   name: 'EMA 9',     nameId: 'EMA 9',     default: true  },
      { id: 'EMA_21',  name: 'EMA 21',    nameId: 'EMA 21',    default: true  },
      { id: 'EMA_50',  name: 'EMA 50',    nameId: 'EMA 50',    default: false },
      { id: 'EMA_200', name: 'EMA 200',   nameId: 'EMA 200',   default: false },
      { id: 'SMA_20',  name: 'SMA 20',    nameId: 'SMA 20',    default: false },
      { id: 'ALMA',    name: 'ALMA (21)', nameId: 'ALMA',      default: false },
      { id: 'DEMA',    name: 'DEMA',      nameId: 'DEMA',      default: false },
      { id: 'VWAP',    name: 'VWAP',      nameId: 'VWAP',      default: true  },
      { id: 'MACD',    name: 'MACD',      nameId: 'MACD',      default: false },
    ],
  },
  MOMENTUM: {
    label: 'Momentum', labelId: 'Momentum', color: 'green',
    indicators: [
      { id: 'RSI_7',     name: 'RSI (7)',         nameId: 'RSI (7)',         default: true  },
      { id: 'RSI_14',    name: 'RSI (14)',         nameId: 'RSI (14)',        default: false },
      { id: 'STOCH_RSI', name: 'Stoch RSI',       nameId: 'Stoch RSI',      default: false },
      { id: 'WILLIAMS_R',name: 'Williams %R',     nameId: 'Williams %R',    default: false },
      { id: 'ROC',       name: 'Rate of Change',  nameId: 'Rate of Change', default: false },
    ],
  },
  VOLATILITY: {
    label: 'Volatility', labelId: 'Volatilitas', color: 'amber',
    indicators: [
      { id: 'ATR',        name: 'ATR (14)',         nameId: 'ATR (14)',         default: true  },
      { id: 'BB',         name: 'Bollinger Bands',  nameId: 'Bollinger Bands', default: false },
      { id: 'KELTNER',    name: 'Keltner Channel',  nameId: 'Keltner Channel', default: false },
      { id: 'BB_SQUEEZE', name: 'BB Squeeze',       nameId: 'BB Squeeze',      default: false },
    ],
  },
  VOLUME: {
    label: 'Volume', labelId: 'Volume', color: 'teal',
    indicators: [
      { id: 'VOLUME',     name: 'Volume',       nameId: 'Volume',       default: true  },
      { id: 'VOL_SPIKE',  name: 'Volume Spike', nameId: 'Volume Spike', default: true  },
      { id: 'OBV',        name: 'OBV',          nameId: 'OBV',          default: false },
      { id: 'MFI',        name: 'MFI (14)',      nameId: 'MFI (14)',     default: false },
      { id: 'WILLIAMS_AD',name: 'Williams A/D', nameId: 'Williams A/D', default: false },
    ],
  },
  SMART_MONEY: {
    label: 'Smart Money (SMC)', labelId: 'Smart Money (SMC)', color: 'coral',
    indicators: [
      { id: 'SMC_OB',    name: 'Order Blocks',       nameId: 'Order Blocks',       default: false },
      { id: 'SMC_FVG',   name: 'Fair Value Gap',      nameId: 'Fair Value Gap',     default: false },
      { id: 'SMC_BOS',   name: 'Break of Structure',  nameId: 'Break of Structure', default: false },
      { id: 'SMC_CHOCH', name: 'CHoCH',               nameId: 'CHoCH',              default: false },
      { id: 'SMC_BIAS',  name: 'SMC Bias',            nameId: 'SMC Bias',           default: false },
    ],
  },
  ICT: {
    label: 'ICT Concepts', labelId: 'Konsep ICT', color: 'pink',
    indicators: [
      { id: 'ICT_OTE',      name: 'OTE Zone (62-79%)',  nameId: 'Zona OTE',     default: false },
      { id: 'ICT_KILLZONE', name: 'ICT Killzones',      nameId: 'ICT Killzones',default: false },
      { id: 'ICT_PD',       name: 'PD Arrays',          nameId: 'PD Arrays',    default: false },
      { id: 'ICT_NWOG',     name: 'New Week Opening Gap',nameId: 'NWOG',        default: false },
    ],
  },
};

export const SUPPORTED_TIMEFRAMES = [
  { value: '1s',  label: '1s',  labelId: '1D',  group: 'seconds'  },
  { value: '15s', label: '15s', labelId: '15D', group: 'seconds'  },
  { value: '30s', label: '30s', labelId: '30D', group: 'seconds'  },
  { value: '1m',  label: '1m',  labelId: '1M',  group: 'minutes', scalping: true },
  { value: '3m',  label: '3m',  labelId: '3M',  group: 'minutes'  },
  { value: '5m',  label: '5m',  labelId: '5M',  group: 'minutes'  },
  { value: '15m', label: '15m', labelId: '15M', group: 'minutes'  },
  { value: '30m', label: '30m', labelId: '30M', group: 'minutes'  },
  { value: '1h',  label: '1H',  labelId: '1J',  group: 'hours'    },
  { value: '2h',  label: '2H',  labelId: '2J',  group: 'hours'    },
  { value: '4h',  label: '4H',  labelId: '4J',  group: 'hours'    },
  { value: '1d',  label: '1D',  labelId: '1H',  group: 'days'     },
];

export const DEFAULT_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'LINKUSDT', 'DOTUSDT',
];

export const BINANCE_TF_MAP: Record<string, string> = {
  '1s': '1s', '15s': '1m', '30s': '1m',
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '1d': '1d',
};
