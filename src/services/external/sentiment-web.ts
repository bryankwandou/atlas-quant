/**
 * Web-sentiment proxies (no-auth).
 *   - Crypto Fear & Greed:  https://api.alternative.me/fng/
 *   - Reddit /r/CryptoCurrency hot post counts (Reddit JSON API, no auth)
 *   - CoinGecko trending searches
 */

export interface FearGreedReading {
  value: number;          // 0-100
  classification: string; // "Extreme Fear" ... "Extreme Greed"
  timestamp: number;
}

export async function getFearGreed(): Promise<FearGreedReading | null> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1&format=json', { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const d = data?.data?.[0];
    if (!d) return null;
    return {
      value: parseInt(d.value, 10),
      classification: d.value_classification,
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
}

export interface RedditPulse {
  cryptoHotCount: number;
  stocksHotCount: number;
  /** 0-100 retail attention proxy */
  attentionScore: number;
}

async function fetchSubHot(sub: string): Promise<number> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=50`, {
      headers: { 'User-Agent': 'AtlasQuant/2.0 (sentiment)' },
      next: { revalidate: 1200 },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return (data?.data?.children ?? []).length;
  } catch {
    return 0;
  }
}

export async function getRedditPulse(): Promise<RedditPulse | null> {
  try {
    const [crypto, stocks, wsb] = await Promise.all([
      fetchSubHot('CryptoCurrency'),
      fetchSubHot('stocks'),
      fetchSubHot('wallstreetbets'),
    ]);
    const total = crypto + stocks + wsb;
    return {
      cryptoHotCount: crypto,
      stocksHotCount: stocks,
      attentionScore: Math.min(100, Math.round((total / 150) * 100)),
    };
  } catch {
    return null;
  }
}

export interface TrendingCoin {
  id: string;
  symbol: string;
  name: string;
  marketCapRank: number;
  score: number;
}

export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/search/trending', { next: { revalidate: 900 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.coins ?? []).map((c: any) => ({
      id: c?.item?.id,
      symbol: c?.item?.symbol,
      name: c?.item?.name,
      marketCapRank: c?.item?.market_cap_rank,
      score: c?.item?.score,
    }));
  } catch {
    return [];
  }
}

export function scoreWebSentiment(fng: FearGreedReading | null, reddit: RedditPulse | null): { multiplier: number; note: string } {
  if (!fng && !reddit) return { multiplier: 1.0, note: '' };
  let mult = 1.0;
  const notes: string[] = [];
  if (fng) {
    if (fng.value < 20) { mult *= 1.10; notes.push(`F&G ${fng.value} extreme fear → contrarian bullish`); }
    else if (fng.value > 80) { mult *= 0.92; notes.push(`F&G ${fng.value} extreme greed → caution`); }
  }
  if (reddit && reddit.attentionScore > 80) {
    mult *= 0.97;
    notes.push(`Retail attention high (${reddit.attentionScore}) — fade extremes`);
  }
  return { multiplier: parseFloat(mult.toFixed(3)), note: notes.join(' · ') };
}
