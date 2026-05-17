/**
 * Browse + search indicator registry. Mendukung pencarian fuzzy.
 */
import { NextResponse } from 'next/server';
import { INDICATOR_REGISTRY, groupByCategory, indicatorStats } from '@/core/indicators/registry';
import { IndicatorSearchEngine } from '@/services/search/smart-search';

const engine = new IndicatorSearchEngine(INDICATOR_REGISTRY.map((r) => r.def));

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const cat = url.searchParams.get('category') ?? undefined;
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 500);
  const groupView = url.searchParams.get('groups') === 'true';

  if (groupView) {
    return NextResponse.json({
      stats: indicatorStats(),
      groups: groupByCategory(),
    });
  }

  if (q || cat) {
    const results = engine.search(q, limit, cat);
    return NextResponse.json({
      query: q,
      category: cat,
      count: results.length,
      stats: indicatorStats(),
      results,
    });
  }

  const all = INDICATOR_REGISTRY.map((r) => r.def);
  return NextResponse.json({
    stats: indicatorStats(),
    indicators: all.slice(0, limit),
    all: all.slice(0, limit),
    total: all.length,
  });
}
