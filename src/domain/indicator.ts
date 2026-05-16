/**
 * Atlas Quant — domain types untuk indikator.
 * Semua indikator wajib mendeskripsikan param-nya melalui `inputs`
 * agar otomatis bisa di-render sebagai form di UI.
 */
export type IndicatorCategory =
  | 'trend'
  | 'momentum'
  | 'volatility'
  | 'volume'
  | 'mean_reversion'
  | 'adaptive'
  | 'volume_profile'
  | 'cycle'
  | 'pattern'
  | 'smc'
  | 'ict'
  | 'amt'
  | 'quant'
  | 'alt_data'
  | 'risk'
  | 'fibonacci'
  | 'drawing'
  | 'composite'
  | 'experimental';

export type IndicatorInputType =
  | 'int'
  | 'float'
  | 'bool'
  | 'enum'
  | 'color'
  | 'source'
  | 'session'
  | 'levels';

export interface IndicatorInput {
  key: string;
  label: string;
  labelId?: string;
  type: IndicatorInputType;
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string | number; label: string }[];
  description?: string;
  descriptionId?: string;
}

export interface IndicatorOutput {
  key: string;
  label: string;
  color?: string;
  plot?: 'line' | 'area' | 'histogram' | 'candle' | 'band' | 'cross' | 'fill' | 'level' | 'box';
  paneId?: 'overlay' | 'sub';
}

export interface IndicatorDef<P extends Record<string, unknown> = Record<string, unknown>> {
  code: string;
  name: string;
  nameId?: string;
  category: IndicatorCategory;
  subCategory?: string;
  description?: string;
  descriptionId?: string;
  formula?: string;
  inputs: IndicatorInput[];
  outputs: IndicatorOutput[];
  overlay?: boolean;
  needsVolume?: boolean;
  pineCompat?: boolean;
  source?: string;
  author?: string;
  tags?: string[];
  riskLevel?: 'low' | 'normal' | 'high';
  defaults?: P;
}

export interface IndicatorContext {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
  time: number[];
}

export interface IndicatorComputeResult {
  series: Record<string, (number | null)[]>;
  levels?: { key: string; value: number; label?: string; color?: string }[];
  boxes?: { from: number; to: number; top: number; bottom: number; color: string; label?: string }[];
  markers?: { time: number; price: number; type: 'buy' | 'sell' | 'note'; text?: string }[];
  meta?: Record<string, unknown>;
}

export type IndicatorFn<P extends Record<string, unknown> = Record<string, unknown>> = (
  ctx: IndicatorContext,
  params: P
) => IndicatorComputeResult;
