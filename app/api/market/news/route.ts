import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/market/news?symbol=BTCUSDT
 *
 * Aggregates many FREE, key-less, non-geo-blocked crypto RSS feeds and merges them
 * by recency. When `symbol` is supplied, items are filtered to that coin (per-pair
 * news); general market news is appended so every pair always shows a full feed.
 *
 * Design goals (per spec):
 *   - As many open-source / free news sources as possible (no API key, no ads — RSS
 *     is plain text rendered inside Atlas Quant).
 *   - ≥100 items total available (no symbol) — items are NOT capped low.
 *   - Bodies are NOT truncated — full description text is returned.
 */
export const revalidate = 180;

const FEEDS: Array<{ url: string; source: string }> = [
  { url: 'https://cointelegraph.com/rss',                         source: 'Cointelegraph' },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',       source: 'CoinDesk' },
  { url: 'https://cryptopotato.com/feed/',                        source: 'CryptoPotato' },
  { url: 'https://decrypt.co/feed',                               source: 'Decrypt' },
  { url: 'https://bitcoinmagazine.com/feed',                      source: 'Bitcoin Magazine' },
  { url: 'https://cryptoslate.com/feed/',                         source: 'CryptoSlate' },
  { url: 'https://beincrypto.com/feed/',                          source: 'BeInCrypto' },
  { url: 'https://www.newsbtc.com/feed/',                         source: 'NewsBTC' },
  { url: 'https://coinjournal.net/news/feed/',                    source: 'CoinJournal' },
  { url: 'https://cryptobriefing.com/feed/',                      source: 'Crypto Briefing' },
  { url: 'https://ambcrypto.com/feed/',                           source: 'AMBCrypto' },
  { url: 'https://u.today/rss',                                   source: 'U.Today' },
  { url: 'https://coingape.com/feed/',                            source: 'CoinGape' },
  { url: 'https://bitcoinist.com/feed/',                          source: 'Bitcoinist' },
  { url: 'https://thedefiant.io/feed/',                           source: 'The Defiant' },
  { url: 'https://coinpedia.org/feed/',                           source: 'Coinpedia' },
  { url: 'https://crypto.news/feed/',                             source: 'Crypto.News' },
  { url: 'https://dailyhodl.com/feed/',                           source: 'The Daily Hodl' },
];

// Base-ticker → search terms (name variants) for per-pair filtering. Short tickers
// are matched with word boundaries to avoid false hits (e.g. "SOL" in "solution").
const COIN_TERMS: Record<string, string[]> = {
  BTC: ['Bitcoin', 'BTC'], ETH: ['Ethereum', 'Ether', 'ETH'], SOL: ['Solana', 'SOL'],
  BNB: ['BNB', 'Binance Coin'], XRP: ['XRP', 'Ripple'], ADA: ['Cardano', 'ADA'],
  DOGE: ['Dogecoin', 'DOGE'], MATIC: ['Polygon', 'MATIC'], POL: ['Polygon', 'POL'],
  AVAX: ['Avalanche', 'AVAX'], DOT: ['Polkadot', 'DOT'], LINK: ['Chainlink', 'LINK'],
  TRX: ['Tron', 'TRX'], LTC: ['Litecoin', 'LTC'], BCH: ['Bitcoin Cash', 'BCH'],
  SHIB: ['Shiba Inu', 'SHIB'], PEPE: ['Pepe', 'PEPE'], NEAR: ['NEAR Protocol', 'NEAR'],
  UNI: ['Uniswap', 'UNI'], ATOM: ['Cosmos', 'ATOM'], XLM: ['Stellar', 'XLM'],
  APT: ['Aptos', 'APT'], ARB: ['Arbitrum', 'ARB'], OP: ['Optimism'], FIL: ['Filecoin', 'FIL'],
  INJ: ['Injective', 'INJ'], SUI: ['Sui'], SEI: ['Sei Network', 'SEI'], TIA: ['Celestia', 'TIA'],
  RNDR: ['Render', 'RNDR'], IMX: ['Immutable', 'IMX'], HBAR: ['Hedera', 'HBAR'],
  ZEC: ['Zcash', 'ZEC'], XMR: ['Monero', 'XMR'], AAVE: ['Aave'], MKR: ['Maker', 'MakerDAO'],
  WLD: ['Worldcoin', 'WLD'], TAO: ['Bittensor', 'TAO'], ETC: ['Ethereum Classic', 'ETC'],
  USDT: ['Tether', 'USDT'], USDC: ['USD Coin', 'Circle', 'USDC'],
};
const QUOTES = ['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'USD', 'BTC', 'ETH', 'BNB', 'EUR', 'PERP'];

function deriveTerms(symbolRaw: string): { base: string; terms: string[] } | null {
  if (!symbolRaw) return null;
  let s = symbolRaw.toUpperCase().replace(/^[A-Z]+[:\s]/, '').replace(/[-_/]/g, '');
  // Non-crypto (stocks/forex/futures: ANTM.JK, ^GSPC, GC=F, EURUSD=X) — no reliable
  // crypto-RSS match; signal "general only" by returning null.
  if (/[.^=]/.test(symbolRaw)) return null;
  let base = s;
  for (const q of QUOTES) { if (s.length > q.length && s.endsWith(q)) { base = s.slice(0, -q.length); break; } }
  const terms = COIN_TERMS[base] ?? [base];
  return { base, terms };
}

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
}

interface NewsItem { id: string; title: string; url: string; source: string; body: string; publishedAt: number; }

async function parseFeed(url: string, source: string): Promise<NewsItem[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000); // never hang the whole request
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AtlasQuant/1.0)' },
      next: { revalidate: 180 }, signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.split(/<item[ >]/).slice(1);
    return blocks.slice(0, 40).map((b) => {
      const title = tag(b, 'title');
      const link = tag(b, 'link') || (b.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] || '').trim();
      const pub = tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated');
      const ts = pub ? new Date(pub).getTime() : 0;
      // Full body — NOT truncated (spec: berita full load tanpa terpotong).
      const body = tag(b, 'description') || tag(b, 'content:encoded') || tag(b, 'summary');
      return { id: link || title, title, url: link, source, body, publishedAt: ts || Date.now() };
    }).filter((n) => n.title && n.url);
  } catch {
    return [];
  }
}

function matches(item: NewsItem, terms: string[]): boolean {
  const hay = `${item.title} ${item.body}`;
  return terms.some((t) => {
    if (t.length <= 4) return new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(hay);
    return hay.toLowerCase().includes(t.toLowerCase());
  });
}

// ── GDELT (free, no key) for NON-crypto pairs (stocks/forex/index) so every pair
// gets its own news. GDELT ArtList returns title + url + domain + date (no body).
const ASSET_NAMES: Record<string, string> = {
  'ANTM.JK': 'Aneka Tambang', 'BBCA.JK': 'Bank Central Asia', 'BBRI.JK': 'Bank Rakyat Indonesia',
  'BMRI.JK': 'Bank Mandiri', 'TLKM.JK': 'Telkom Indonesia', 'ASII.JK': 'Astra International',
  'GOTO.JK': 'GoTo Gojek Tokopedia', 'UNVR.JK': 'Unilever Indonesia', 'ADRO.JK': 'Adaro Energy',
  'PGAS.JK': 'Perusahaan Gas Negara', 'INCO.JK': 'Vale Indonesia',
  'AAPL': 'Apple', 'TSLA': 'Tesla', 'NVDA': 'Nvidia', 'MSFT': 'Microsoft', 'AMZN': 'Amazon',
  'GOOGL': 'Google', 'META': 'Meta', 'AMD': 'AMD',
  '^GSPC': 'S&P 500', '^IXIC': 'Nasdaq', '^DJI': 'Dow Jones', 'GC=F': 'Gold price', 'CL=F': 'Crude oil',
};
function gdeltQueryFor(symbol: string): string {
  const up = symbol.toUpperCase();
  if (ASSET_NAMES[up]) return ASSET_NAMES[up];
  if (symbol.endsWith('=X')) { const p = symbol.replace('=X', ''); return `${p.slice(0, 3)} ${p.slice(3, 6)}`.trim(); }
  return symbol.replace(/\.[A-Z]+$/, '').replace(/[\^=]/g, '').trim() || symbol;
}
async function getGdeltArticles(query: string, max = 75): Promise<NewsItem[]> {
  try {
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=${max}&sort=DateDesc`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(url, { next: { revalidate: 300 }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    const arts = (data?.articles ?? []) as any[];
    return arts.map((a) => {
      const sd = String(a.seendate || ''); // e.g. 20260620T173800Z
      const ts = sd.length >= 15
        ? Date.UTC(+sd.slice(0, 4), +sd.slice(4, 6) - 1, +sd.slice(6, 8), +sd.slice(9, 11), +sd.slice(11, 13), +sd.slice(13, 15))
        : Date.now();
      return { id: a.url, title: decode(a.title || ''), url: a.url, source: a.domain || 'GDELT', body: '', publishedAt: ts || Date.now() };
    }).filter((n) => n.title && n.url);
  } catch {
    return [];
  }
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol') || '';
  try {
    const all = (await Promise.all(FEEDS.map((f) => parseFeed(f.url, f.source)))).flat();

    // De-dupe by URL/title, then sort newest first.
    const seen = new Set<string>();
    const merged: NewsItem[] = [];
    for (const n of all) {
      const key = (n.url || n.title).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key); merged.push(n);
    }
    merged.sort((a, b) => b.publishedAt - a.publishedAt);

    const derived = deriveTerms(symbol);
    if (derived) {
      const pair = merged.filter((n) => matches(n, derived.terms)).map((n) => ({ ...n, pair: true }));
      // Fill with the freshest general market news so the pair always has a full feed.
      const fill = merged.filter((n) => !pair.some((p) => p.id === n.id)).slice(0, 80).map((n) => ({ ...n, pair: false }));
      const items = [...pair, ...fill];
      return NextResponse.json({ symbol, base: derived.base, pairCount: pair.length, count: items.length, items, ts: Date.now() });
    }

    // Non-crypto (stock/forex/index): crypto RSS has no coverage → use GDELT per-pair.
    if (symbol && /[.^=]/.test(symbol)) {
      const q = gdeltQueryFor(symbol);
      const gd = await getGdeltArticles(q, 75);
      const gseen = new Set(gd.map((g) => (g.url || g.title).toLowerCase()));
      const pair = gd.map((n) => ({ ...n, pair: true }));
      const fill = merged.filter((n) => !gseen.has((n.url || n.title).toLowerCase())).slice(0, 60).map((n) => ({ ...n, pair: false }));
      const items = [...pair, ...fill];
      return NextResponse.json({ symbol, base: q, pairCount: pair.length, count: items.length, items, ts: Date.now() });
    }

    return NextResponse.json({ symbol, base: null, pairCount: 0, count: merged.length, items: merged, ts: Date.now() });
  } catch {
    return NextResponse.json({ symbol, count: 0, items: [], ts: Date.now() });
  }
}
