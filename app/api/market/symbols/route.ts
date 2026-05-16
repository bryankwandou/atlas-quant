/**
 * GET /api/market/symbols
 * Returns the full asset universe (paginated) + counts. Used by symbol picker.
 *
 * Query params:
 *   q           → filter substring
 *   class       → asset class (crypto, dex, stock, etf, forex, index, commodity, bond)
 *   limit       → 1..2000 (default 200)
 *   offset      → pagination offset
 *   topByVolume → "true" → sort by volume_24h desc
 */
import { NextResponse } from 'next/server';
import { STATIC_ASSET_UNIVERSE } from '@/data/assets';
import { AssetSearchEngine } from '@/services/search/smart-search';
import { fetchExpandedUniverse, getCachedUniverse } from '@/services/market/universe-loader';
import type { Asset } from '@/domain/asset';

let cachedEngine: AssetSearchEngine | null = null;
let cachedUniverse: Asset[] = STATIC_ASSET_UNIVERSE;

function buildEngine(universe: Asset[]): AssetSearchEngine {
  cachedUniverse = universe;
  cachedEngine = new AssetSearchEngine(universe);
  return cachedEngine;
}

function countsByClass(universe: Asset[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of universe) counts[a.assetClass] = (counts[a.assetClass] || 0) + 1;
  counts.total = universe.length;
  return counts;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = u.searchParams.get('q') || '';
  const assetClass = u.searchParams.get('class') || undefined;
  const limit = Math.min(Number(u.searchParams.get('limit') ?? 200), 5000);
  const offset = Number(u.searchParams.get('offset') ?? 0);
  const expand = u.searchParams.get('expand') !== 'false';

  let universe: Asset[] = cachedUniverse;
  if (expand) {
    // Trigger background expansion (returns immediately from cache if warm)
    try {
      universe = await fetchExpandedUniverse();
    } catch {
      universe = getCachedUniverse();
    }
  }
  const engine = cachedEngine && cachedUniverse.length === universe.length ? cachedEngine : buildEngine(universe);
  const counts = countsByClass(universe);

  let results = q
    ? engine.search({ query: q, limit: limit + offset, assetClasses: assetClass ? [assetClass] : undefined })
    : universe
        .filter((a) => (assetClass ? a.assetClass === assetClass : true))
        .sort((a, b) => (b.volume24h ?? 0) - (a.volume24h ?? 0))
        .map((a) => ({ ...a, score: a.volume24h ?? 0, matches: [] }));

  const total = results.length;
  results = results.slice(offset, offset + limit);

  return NextResponse.json({
    total,
    universeSize: universe.length,
    counts,
    limit,
    offset,
    results,
  });
}
