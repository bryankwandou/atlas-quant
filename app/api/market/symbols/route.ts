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
import { STATIC_ASSET_UNIVERSE, countByAssetClass } from '@/data/assets';
import { AssetSearchEngine } from '@/services/search/smart-search';

const engine = new AssetSearchEngine(STATIC_ASSET_UNIVERSE);

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = u.searchParams.get('q') || '';
  const assetClass = u.searchParams.get('class') || undefined;
  const limit = Math.min(Number(u.searchParams.get('limit') ?? 200), 2000);
  const offset = Number(u.searchParams.get('offset') ?? 0);
  const counts = countByAssetClass();

  let results = q
    ? engine.search({ query: q, limit: limit + offset, assetClasses: assetClass ? [assetClass] : undefined })
    : STATIC_ASSET_UNIVERSE
        .filter((a) => (assetClass ? a.assetClass === assetClass : true))
        .map((a) => ({ ...a, score: a.volume24h ?? 0, matches: [] }));

  const total = results.length;
  results = results.slice(offset, offset + limit);

  return NextResponse.json({
    total,
    counts,
    limit,
    offset,
    results,
  });
}
