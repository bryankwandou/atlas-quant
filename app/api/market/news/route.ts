import { NextResponse } from 'next/server';

/**
 * GET /api/market/news
 * Live crypto news feed aggregated from free RSS sources (no API key, not
 * geo-blocked). CryptoCompare's free news endpoint was deprecated, so we parse
 * RSS from Cointelegraph / CoinDesk / CryptoPotato and merge by recency.
 */
const FEEDS = [
  { url: 'https://cointelegraph.com/rss', source: 'Cointelegraph' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', source: 'CoinDesk' },
  { url: 'https://cryptopotato.com/feed/', source: 'CryptoPotato' },
];

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  if (!m) return '';
  return m[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .trim();
}

async function parseFeed(url: string, source: string) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 AtlasQuant' }, next: { revalidate: 180 } });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.split(/<item[ >]/).slice(1);
    return blocks.slice(0, 20).map((b) => {
      const title = tag(b, 'title');
      const link = tag(b, 'link') || (b.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
      const pub = tag(b, 'pubDate');
      const ts = pub ? new Date(pub).getTime() : 0;
      return { id: link || title, title, url: link, source, body: tag(b, 'description').slice(0, 160), publishedAt: ts || Date.now() };
    }).filter((n) => n.title && n.url);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const all = (await Promise.all(FEEDS.map((f) => parseFeed(f.url, f.source)))).flat();
    all.sort((a, b) => b.publishedAt - a.publishedAt);
    return NextResponse.json({ count: all.length, items: all.slice(0, 45), ts: Date.now() });
  } catch {
    return NextResponse.json({ count: 0, items: [], ts: Date.now() });
  }
}
