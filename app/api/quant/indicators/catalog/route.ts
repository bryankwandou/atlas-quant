import { NextRequest, NextResponse } from 'next/server';
import {
  INDICATOR_REGISTRY,
  indicatorCount,
  listIndicatorCategories,
  type IndicatorPreset,
} from '@/src/core/indicators/registry';

/**
 * GET /api/quant/indicators/catalog
 *   ?q=<query>              smart keyword search
 *   ?category=<name>        filter by category
 *   ?limit=<n>              default 100
 *
 * Returns the indicator registry preset list. Used by the search panel.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').toLowerCase().trim();
  const cat = searchParams.get('category') || '';
  const limit = Math.max(1, Math.min(500, parseInt(searchParams.get('limit') || '100', 10)));

  let pool: IndicatorPreset[] = INDICATOR_REGISTRY;
  if (cat) pool = pool.filter((p) => p.category.toLowerCase() === cat.toLowerCase());

  if (!q) {
    return NextResponse.json({
      total: indicatorCount(),
      categories: listIndicatorCategories(),
      results: pool.slice(0, limit),
    });
  }

  const scored = pool
    .map((p) => ({ p, score: scoreOne(p, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({ ...x.p, _score: x.score }));

  return NextResponse.json({
    total: indicatorCount(),
    categories: listIndicatorCategories(),
    results: scored,
  });
}

function scoreOne(p: IndicatorPreset, q: string): number {
  let s = 0;
  const id = p.id.toLowerCase();
  const name = p.name.toLowerCase();
  const short = p.short.toLowerCase();
  const author = p.author.toLowerCase();
  const cat = p.category.toLowerCase();
  if (id === q) s += 1000;
  if (short === q) s += 900;
  if (name === q) s += 800;
  if (id.startsWith(q)) s += 500;
  if (short.startsWith(q)) s += 400;
  if (name.startsWith(q)) s += 350;
  if (id.includes(q)) s += 200;
  if (short.includes(q)) s += 180;
  if (name.includes(q)) s += 150;
  if (cat.includes(q)) s += 80;
  if (author.includes(q)) s += 60;
  if (p.keywords.some((k) => k.toLowerCase() === q)) s += 150;
  if (p.keywords.some((k) => k.toLowerCase().includes(q))) s += 60;
  return s;
}
