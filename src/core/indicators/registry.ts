/**
 * Indicator REGISTRY — gabungan semua famili indikator, beserta
 * lookup map by code dan helper untuk eksekusi.
 *
 * Setiap entry punya `def` (skema parameter) dan `compute` (fungsi murni).
 * Logic UI: render form param dari `def.inputs`, panggil `compute(ctx, params)`,
 * lalu plot `series` / `levels` / `boxes` / `markers`.
 */
import type {
  IndicatorContext,
  IndicatorComputeResult,
  IndicatorDef,
  IndicatorFn,
} from '@/domain/indicator';
import { TREND_INDICATORS } from './trend';
import { MOMENTUM_INDICATORS } from './momentum';
import { VOLATILITY_INDICATORS } from './volatility';
import { VOLUME_INDICATORS } from './volume';
import { FIBONACCI_INDICATORS } from './fibonacci';
import { SMC_INDICATORS } from './smc';
import { RENAISSANCE_INDICATORS } from './renaissance';
import { T1MO_INDICATORS } from './t1mo';
import { GENERATED_INDICATORS } from './generated-pack';

export interface RegisteredIndicator {
  def: IndicatorDef;
  compute: IndicatorFn;
}

export const INDICATOR_REGISTRY: RegisteredIndicator[] = [
  ...TREND_INDICATORS,
  ...MOMENTUM_INDICATORS,
  ...VOLATILITY_INDICATORS,
  ...VOLUME_INDICATORS,
  ...FIBONACCI_INDICATORS,
  ...SMC_INDICATORS,
  ...RENAISSANCE_INDICATORS,
  ...T1MO_INDICATORS,
  ...GENERATED_INDICATORS,
] as RegisteredIndicator[];

export const INDICATOR_BY_CODE: Record<string, RegisteredIndicator> = Object.fromEntries(
  INDICATOR_REGISTRY.map((i) => [i.def.code, i])
);

export interface IndicatorCategoryGroup {
  category: string;
  count: number;
  indicators: IndicatorDef[];
}

export function groupByCategory(): IndicatorCategoryGroup[] {
  const groups: Record<string, IndicatorDef[]> = {};
  for (const { def } of INDICATOR_REGISTRY) {
    if (!groups[def.category]) groups[def.category] = [];
    groups[def.category].push(def);
  }
  return Object.entries(groups).map(([category, indicators]) => ({
    category,
    count: indicators.length,
    indicators,
  }));
}

export function runIndicator(
  code: string,
  ctx: IndicatorContext,
  params: Record<string, unknown> = {}
): IndicatorComputeResult | null {
  const entry = INDICATOR_BY_CODE[code];
  if (!entry) return null;
  // Auto-fill defaults from def.inputs
  const fullParams: Record<string, unknown> = {};
  for (const input of entry.def.inputs) {
    fullParams[input.key] = params[input.key] !== undefined ? params[input.key] : input.default;
  }
  return entry.compute(ctx, fullParams);
}

/**
 * Stats summary for UI: total indicators per category + total.
 */
export function indicatorStats(): { total: number; byCategory: Record<string, number> } {
  const byCategory: Record<string, number> = {};
  for (const { def } of INDICATOR_REGISTRY) {
    byCategory[def.category] = (byCategory[def.category] || 0) + 1;
  }
  return { total: INDICATOR_REGISTRY.length, byCategory };
}
