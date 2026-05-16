/**
 * Smart search untuk asset (crypto, stock, forex, index, etc).
 * Param:
 *   - q           (string)   keyword
 *   - limit       (number)   default 20
 *   - class       (csv)      filter by asset class (crypto,stock,...)
 *   - exchanges   (csv)
 *   - tags        (csv)
 *   - country     (csv)
 *   - quote       (string)
 *   - boost       (string)   beri boost ke kelas tertentu
 */
import { NextResponse } from 'next/server';
import { AssetSearchEngine } from '@/services/search/smart-search';
import { STATIC_ASSET_UNIVERSE, countByAssetClass } from '@/data/assets';

const engine = new AssetSearchEngine(STATIC_ASSET_UNIVERSE);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
  const csv = (k: string) => url.searchParams.get(k)?.split(',').map((s) => s.trim()).filter(Boolean);
  const results = engine.search({
    query: q,
    limit,
    assetClasses: csv('class'),
    exchanges: csv('exchanges'),
    tags: csv('tags'),
    country: csv('country'),
    quote: url.searchParams.get('quote') ?? undefined,
    boostClass: url.searchParams.get('boost') ?? undefined,
  });
  return NextResponse.json({
    query: q,
    total: STATIC_ASSET_UNIVERSE.length,
    stats: countByAssetClass(),
    count: results.length,
    results,
  });
}
