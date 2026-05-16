/**
 * Atlas Quant · Indicator parameter schema
 * --------------------------------------------------------------------
 * Per-indicator metadata used by the settings UI:
 *   - id (matches registry id, or a base family key like "rsi", "ema")
 *   - fields: list of editable inputs (type, default, min/max, step, label)
 *
 * The schema is consulted by IndicatorParamModal so every indicator gets
 * a proper "Settings" dialog like TradingView.
 */

export type ParamFieldType = 'number' | 'boolean' | 'select' | 'color';

export interface ParamField {
  key: string;
  type: ParamFieldType;
  label: string;
  defaultValue: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string | number; label: string }>;
}

export interface ParamSchema {
  id: string;       // matches the indicator family key (e.g. "rsi", "ema", "bb")
  category: string;
  fields: ParamField[];
}

const lengthField = (defVal: number, min = 1, max = 500): ParamField =>
  ({ key: 'length', type: 'number', label: 'Length', defaultValue: defVal, min, max, step: 1 });

const sourceField: ParamField = {
  key: 'source',
  type: 'select',
  label: 'Source',
  defaultValue: 'close',
  options: [
    { value: 'close', label: 'Close' },
    { value: 'open', label: 'Open' },
    { value: 'high', label: 'High' },
    { value: 'low', label: 'Low' },
    { value: 'hl2', label: '(H+L)/2' },
    { value: 'hlc3', label: '(H+L+C)/3' },
    { value: 'ohlc4', label: '(O+H+L+C)/4' },
  ],
};

export const PARAM_SCHEMAS: Record<string, ParamSchema> = {
  // Moving averages — share the same shape
  ema:   { id: 'ema',   category: 'Moving Average', fields: [lengthField(9), sourceField,  { key: 'offset', type: 'number', label: 'Offset',  defaultValue: 0, min: -50, max: 50, step: 1 }] },
  sma:   { id: 'sma',   category: 'Moving Average', fields: [lengthField(20), sourceField, { key: 'offset', type: 'number', label: 'Offset',  defaultValue: 0, min: -50, max: 50, step: 1 }] },
  wma:   { id: 'wma',   category: 'Moving Average', fields: [lengthField(20), sourceField] },
  hma:   { id: 'hma',   category: 'Moving Average', fields: [lengthField(14), sourceField] },
  alma:  {
    id: 'alma', category: 'Moving Average',
    fields: [
      lengthField(21),
      sourceField,
      { key: 'sigma',  type: 'number', label: 'Sigma',  defaultValue: 6,    min: 1, max: 30, step: 0.1 },
      { key: 'offset', type: 'number', label: 'Offset', defaultValue: 0.85, min: 0, max: 1,  step: 0.01 },
    ],
  },
  dema:  { id: 'dema',  category: 'Moving Average', fields: [lengthField(21)] },
  tema:  { id: 'tema',  category: 'Moving Average', fields: [lengthField(21)] },
  zlema: { id: 'zlema', category: 'Moving Average', fields: [lengthField(21)] },
  vwma:  { id: 'vwma',  category: 'Moving Average', fields: [lengthField(20)] },
  smma:  { id: 'smma',  category: 'Moving Average', fields: [lengthField(14)] },
  lsma:  { id: 'lsma',  category: 'Moving Average', fields: [lengthField(25), { key: 'offset', type: 'number', label: 'Offset', defaultValue: 0, min: -50, max: 50, step: 1 }] },
  kama:  { id: 'kama',  category: 'Adaptive',       fields: [lengthField(10), { key: 'fast', type: 'number', label: 'Fast',  defaultValue: 2,  min: 1, max: 50, step: 1 }, { key: 'slow', type: 'number', label: 'Slow', defaultValue: 30, min: 5, max: 200, step: 1 }] },
  vidya: { id: 'vidya', category: 'Adaptive',       fields: [lengthField(14)] },
  t3:    { id: 't3',    category: 'Adaptive',       fields: [lengthField(5), { key: 'volumeFactor', type: 'number', label: 'Volume Factor', defaultValue: 0.7, min: 0, max: 1, step: 0.05 }] },
  mcginley:{ id: 'mcginley', category: 'Adaptive',  fields: [lengthField(14)] },

  // RSI family
  rsi:       { id: 'rsi',       category: 'Momentum', fields: [lengthField(14, 1, 200), sourceField, { key: 'overbought', type: 'number', label: 'Overbought', defaultValue: 70, min: 50, max: 95, step: 1 }, { key: 'oversold', type: 'number', label: 'Oversold', defaultValue: 30, min: 5,  max: 50, step: 1 }] },
  hullRsi:   { id: 'hullrsi',   category: 'Momentum', fields: [{ key: 'rsiLength', type: 'number', label: 'RSI Length', defaultValue: 14, min: 1, max: 200, step: 1 }, { key: 'hmaLength', type: 'number', label: 'HMA Length', defaultValue: 14, min: 1, max: 200, step: 1 }] },
  stochRsi:  { id: 'stochrsi',  category: 'Momentum', fields: [{ key: 'rsiLength', type: 'number', label: 'RSI Length', defaultValue: 14, min: 1, max: 200, step: 1 }, { key: 'stochLength', type: 'number', label: 'Stoch Length', defaultValue: 14, min: 1, max: 200, step: 1 }, { key: 'kSmoothing', type: 'number', label: '%K Smoothing', defaultValue: 3, min: 1, max: 20, step: 1 }, { key: 'dSmoothing', type: 'number', label: '%D Smoothing', defaultValue: 3, min: 1, max: 20, step: 1 }] },
  laguerreRsi:{id:'laguerrersi',category: 'Momentum', fields: [{ key: 'gamma', type: 'number', label: 'Gamma', defaultValue: 0.5, min: 0, max: 1, step: 0.01 }] },
  connorsRsi:{ id: 'connorsrsi',category: 'Momentum', fields: [{ key: 'rsiLength', type: 'number', label: 'RSI Length', defaultValue: 3, min: 1, max: 50, step: 1 }, { key: 'streakLength', type: 'number', label: 'Streak Length', defaultValue: 2, min: 1, max: 20, step: 1 }, { key: 'rocLength', type: 'number', label: 'ROC Length', defaultValue: 100, min: 5, max: 500, step: 1 }] },

  // Oscillators
  macd:        { id: 'macd',        category: 'Momentum',   fields: [{ key: 'fast', type: 'number', label: 'Fast', defaultValue: 12, min: 1, max: 200, step: 1 }, { key: 'slow', type: 'number', label: 'Slow', defaultValue: 26, min: 1, max: 400, step: 1 }, { key: 'signal', type: 'number', label: 'Signal', defaultValue: 9, min: 1, max: 100, step: 1 }, sourceField] },
  ppo:         { id: 'ppo',         category: 'Momentum',   fields: [{ key: 'fast', type: 'number', label: 'Fast', defaultValue: 12, min: 1, max: 200, step: 1 }, { key: 'slow', type: 'number', label: 'Slow', defaultValue: 26, min: 1, max: 400, step: 1 }, { key: 'signal', type: 'number', label: 'Signal', defaultValue: 9, min: 1, max: 100, step: 1 }] },
  dpo:         { id: 'dpo',         category: 'Oscillator', fields: [lengthField(20)] },
  stochastic:  { id: 'stochastic',  category: 'Oscillator', fields: [{ key: 'kLength', type: 'number', label: '%K Length', defaultValue: 14, min: 1, max: 200, step: 1 }, { key: 'dLength', type: 'number', label: '%D Length', defaultValue: 3, min: 1, max: 30, step: 1 }, { key: 'smooth', type: 'number', label: 'Smooth', defaultValue: 3, min: 1, max: 20, step: 1 }] },
  williamsR:   { id: 'williamsr',   category: 'Oscillator', fields: [lengthField(14)] },
  cci:         { id: 'cci',         category: 'Oscillator', fields: [lengthField(20)] },
  roc:         { id: 'roc',         category: 'Momentum',   fields: [lengthField(9)] },
  momentum:    { id: 'momentum',    category: 'Momentum',   fields: [lengthField(10)] },
  tsi:         { id: 'tsi',         category: 'Momentum',   fields: [{ key: 'longLength', type: 'number', label: 'Long', defaultValue: 25, min: 1, max: 100, step: 1 }, { key: 'shortLength', type: 'number', label: 'Short', defaultValue: 13, min: 1, max: 50, step: 1 }, { key: 'signalLength', type: 'number', label: 'Signal', defaultValue: 13, min: 1, max: 50, step: 1 }] },
  cmo:         { id: 'cmo',         category: 'Momentum',   fields: [lengthField(9)] },
  aroon:       { id: 'aroon',       category: 'Trend',      fields: [lengthField(25)] },
  vortex:      { id: 'vortex',      category: 'Trend',      fields: [lengthField(14)] },
  massIndex:   { id: 'massindex',   category: 'Volatility', fields: [{ key: 'emaLength', type: 'number', label: 'EMA Length', defaultValue: 9, min: 1, max: 50, step: 1 }, { key: 'sumLength', type: 'number', label: 'Sum Length', defaultValue: 25, min: 5, max: 100, step: 1 }] },
  elderRay:    { id: 'elderray',    category: 'Momentum',   fields: [lengthField(13)] },
  forceIndex:  { id: 'forceindex',  category: 'Volume',     fields: [lengthField(13)] },
  ultimateOsc: { id: 'ultimateosc', category: 'Oscillator', fields: [{ key: 'p1', type: 'number', label: 'Length 1', defaultValue: 7, min: 1, max: 100, step: 1 }, { key: 'p2', type: 'number', label: 'Length 2', defaultValue: 14, min: 1, max: 200, step: 1 }, { key: 'p3', type: 'number', label: 'Length 3', defaultValue: 28, min: 1, max: 400, step: 1 }] },
  coppock:     { id: 'coppock',     category: 'Momentum',   fields: [{ key: 'wmaLength', type: 'number', label: 'WMA Length', defaultValue: 10, min: 1, max: 100, step: 1 }, { key: 'roc1', type: 'number', label: 'ROC 1', defaultValue: 14, min: 1, max: 100, step: 1 }, { key: 'roc2', type: 'number', label: 'ROC 2', defaultValue: 11, min: 1, max: 100, step: 1 }] },
  trix:        { id: 'trix',        category: 'Momentum',   fields: [lengthField(15), { key: 'signalLength', type: 'number', label: 'Signal', defaultValue: 9, min: 1, max: 100, step: 1 }] },
  fisher:      { id: 'fisher',      category: 'Oscillator', fields: [lengthField(9)] },
  smi:         { id: 'smi',         category: 'Oscillator', fields: [lengthField(13)] },
  rvi:         { id: 'rvi',         category: 'Momentum',   fields: [lengthField(10)] },

  // Volatility
  bollingerBands: { id: 'bb',        category: 'Volatility', fields: [lengthField(20), sourceField, { key: 'stdDev', type: 'number', label: 'StdDev', defaultValue: 2, min: 0.1, max: 10, step: 0.1 }] },
  keltner:        { id: 'kc',        category: 'Volatility', fields: [{ key: 'emaLength', type: 'number', label: 'EMA Length', defaultValue: 20, min: 1, max: 200, step: 1 }, { key: 'atrLength', type: 'number', label: 'ATR Length', defaultValue: 10, min: 1, max: 200, step: 1 }, { key: 'multiplier', type: 'number', label: 'Multiplier', defaultValue: 1.5, min: 0.1, max: 10, step: 0.1 }] },
  donchian:       { id: 'donchian',  category: 'Volatility', fields: [lengthField(20)] },
  atr:            { id: 'atr',       category: 'Volatility', fields: [lengthField(14)] },
  chandelierExit: { id: 'chandelier',category: 'Volatility', fields: [lengthField(22), { key: 'multiplier', type: 'number', label: 'Multiplier', defaultValue: 3, min: 0.1, max: 10, step: 0.1 }] },
  historicalVol:  { id: 'histvol',   category: 'Statistical', fields: [lengthField(20)] },
  zscore:         { id: 'zscore',    category: 'Statistical', fields: [lengthField(20)] },
  parabolicSAR:   { id: 'psar',      category: 'Trend',      fields: [{ key: 'step', type: 'number', label: 'Step', defaultValue: 0.02, min: 0.001, max: 1, step: 0.001 }, { key: 'max', type: 'number', label: 'Max', defaultValue: 0.2, min: 0.01, max: 1, step: 0.01 }] },
  supertrend:     { id: 'supertrend',category: 'Trend',      fields: [lengthField(10), { key: 'multiplier', type: 'number', label: 'Multiplier', defaultValue: 3, min: 0.1, max: 20, step: 0.1 }] },
  ichimoku:       { id: 'ichimoku',  category: 'Trend',      fields: [{ key: 'tenkan', type: 'number', label: 'Tenkan-sen', defaultValue: 9, min: 1, max: 50, step: 1 }, { key: 'kijun', type: 'number', label: 'Kijun-sen', defaultValue: 26, min: 1, max: 100, step: 1 }, { key: 'senkouB', type: 'number', label: 'Senkou B', defaultValue: 52, min: 1, max: 200, step: 1 }, { key: 'displacement', type: 'number', label: 'Displacement', defaultValue: 26, min: 1, max: 100, step: 1 }] },
  adx:            { id: 'adx',       category: 'Trend',      fields: [lengthField(14)] },
  squeezeMomentum:{ id: 'squeeze',   category: 'Volatility', fields: [{ key: 'bbLength', type: 'number', label: 'BB Length', defaultValue: 20, min: 1, max: 200, step: 1 }, { key: 'bbMult', type: 'number', label: 'BB Mult', defaultValue: 2, min: 0.1, max: 10, step: 0.1 }, { key: 'kcLength', type: 'number', label: 'KC Length', defaultValue: 20, min: 1, max: 200, step: 1 }, { key: 'kcMult', type: 'number', label: 'KC Mult', defaultValue: 1.5, min: 0.1, max: 10, step: 0.1 }] },

  // Volume
  vwap:        { id: 'vwap',       category: 'Volume', fields: [{ key: 'anchor', type: 'select', label: 'Anchor', defaultValue: 'session', options: [{ value: 'session', label: 'Session' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }] }] },
  vwapBands:   { id: 'vwapbands',  category: 'Volume', fields: [{ key: 'multiplier', type: 'number', label: 'StdDev Mult', defaultValue: 1.5, min: 0.1, max: 10, step: 0.1 }] },
  mfi:         { id: 'mfi',        category: 'Volume', fields: [lengthField(14)] },
  cmf:         { id: 'cmf',        category: 'Volume', fields: [lengthField(20)] },
  pvo:         { id: 'pvo',        category: 'Volume', fields: [{ key: 'fast', type: 'number', label: 'Fast', defaultValue: 12, min: 1, max: 200, step: 1 }, { key: 'slow', type: 'number', label: 'Slow', defaultValue: 26, min: 1, max: 400, step: 1 }, { key: 'signal', type: 'number', label: 'Signal', defaultValue: 9, min: 1, max: 100, step: 1 }] },
  emv:         { id: 'emv',        category: 'Volume', fields: [lengthField(14)] },
  kvo:         { id: 'kvo',        category: 'Volume', fields: [{ key: 'fast', type: 'number', label: 'Fast', defaultValue: 34, min: 1, max: 200, step: 1 }, { key: 'slow', type: 'number', label: 'Slow', defaultValue: 55, min: 1, max: 400, step: 1 }, { key: 'signal', type: 'number', label: 'Signal', defaultValue: 13, min: 1, max: 100, step: 1 }] },

  // Composite / Atlas
  latestSignal: { id: 'latestSignal', category: 'Composite', fields: [{ key: 'mode', type: 'select', label: 'Mode', defaultValue: 'ensemble', options: [{ value: 'ensemble', label: 'Ensemble' }, { value: 'renaissance', label: 'Renaissance' }] }] },
  detectSMC:    { id: 'detectSMC',    category: 'Smart Money', fields: [{ key: 'swingLookback', type: 'number', label: 'Swing Lookback', defaultValue: 5, min: 2, max: 50, step: 1 }] },
};

/** Resolve a schema for a given registry preset id (e.g. "rsi_14" → "rsi"). */
export function resolveSchema(presetId: string, fallbackIndicator?: string): ParamSchema | undefined {
  // Trim trailing community-pack tags
  const base = presetId.replace(/_(lux|lazy|oon|cm|kfr|krown|tot|zen|qt|algo|pc|atlas)$/, '');
  // Try direct match against schema id
  if (PARAM_SCHEMAS[base]) return PARAM_SCHEMAS[base];
  // Try first segment before underscore
  const firstSeg = base.split('_')[0];
  if (PARAM_SCHEMAS[firstSeg]) return PARAM_SCHEMAS[firstSeg];
  // Fall back to indicator field
  if (fallbackIndicator && PARAM_SCHEMAS[fallbackIndicator]) return PARAM_SCHEMAS[fallbackIndicator];
  return undefined;
}
