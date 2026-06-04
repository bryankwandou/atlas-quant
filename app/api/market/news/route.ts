import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/market/news?categories=BTC,ETH
 * Live crypto news feed via CryptoCompare (free, no key, not geo-blocked).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categories = searchParams.get('categories') || '';
  try {
    const url = `https://min-api.cryptocompare.com/data/v2/news/?lang=EN${categories ? `&categories=${encodeURIComponent(categories)}` : ''}`;
    const res = await fetch(url, { next: { revalidate: 120 } });
    if (!res.ok) throw new Error('news fetch failed');
    const json = await res.json() as { Data?: any[] };
    const items = (json.Data || []).slice(0, 40).map((n) => ({
      id: n.id,
      title: n.title,
      url: n.url,
      source: n.source_info?.name || n.source || 'Crypto',
      body: (n.body || '').slice(0, 180),
      imageurl: n.imageurl,
      categories: n.categories,
      publishedAt: (n.published_on || 0) * 1000,
    }));
    return NextResponse.json({ count: items.length, items, ts: Date.now() });
  } catch {
    return NextResponse.json({ count: 0, items: [], ts: Date.now() });
  }
}
