import { NextRequest, NextResponse } from 'next/server';
import { searchSymbols, groupHitsByAssetClass } from '@/src/core/search/symbolSearch';
import type { AssetClass } from '@/src/data/symbolCatalog';

const BINANCE_BASE = process.env.BINANCE_BASE_URL || 'https://api.binance.com/api/v3';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get('q') || '').trim();
  const ac = (searchParams.get('class') || 'all') as AssetClass | 'all';
  const limit = Math.max(1, Math.min(50, parseInt(searchParams.get('limit') || '25', 10)));
  const grouped = searchParams.get('grouped') === '1';

  const baseHits = searchSymbols(raw, { limit, assetClass: ac });

  let liveAugmented = baseHits;
  if (raw && baseHits.length < 8 && /^[A-Z0-9]{2,12}(USDT|BTC|ETH|BNB|USDC|FDUSD)?$/i.test(raw)) {
    try {
      const res = await fetch(`${BINANCE_BASE}/ticker/24hr`, { next: { revalidate: 120 } });
      if (res.ok) {
        const tickers = (await res.json()) as any[];
        const qu = raw.toUpperCase();
        const liveResults = tickers
          .filter((t) =>
            t.symbol.includes(qu) &&
            (t.symbol.endsWith('USDT') || t.symbol.endsWith('USDC')) &&
            !baseHits.some((c) => c.symbol === t.symbol),
          )
          .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
          .slice(0, Math.max(0, 8 - baseHits.length))
          .map((t) => ({
            symbol: t.symbol,
            name: t.symbol.replace(/USDT$|USDC$/, ''),
            exchange: 'BINANCE',
            assetClass: 'crypto' as AssetClass,
            category: 'Spot',
            score: 300,
            highlight: t.symbol,
            price: parseFloat(t.lastPrice),
            change24h: parseFloat(t.priceChangePercent),
            volume24h: parseFloat(t.quoteVolume),
          }));
        liveAugmented = [...baseHits, ...liveResults];
      }
    } catch { /* fall through */ }
  }

  if (grouped) {
    return NextResponse.json({
      query: raw,
      assetClass: ac,
      total: liveAugmented.length,
      grouped: groupHitsByAssetClass(liveAugmented),
    });
  }

  return NextResponse.json({
    query: raw,
    assetClass: ac,
    total: liveAugmented.length,
    results: liveAugmented,
  });
}
