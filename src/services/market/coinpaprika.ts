/**
 * CoinPaprika public API — additional crypto market data (price, volume,
 * tickers across many exchanges). 25k requests/month free, no auth.
 * https://api.coinpaprika.com/
 */

const BASE = 'https://api.coinpaprika.com/v1';

export interface PaprikaTicker {
  id: string;
  name: string;
  symbol: string;
  rank: number;
  circulating_supply: number;
  total_supply: number;
  max_supply: number;
  price_usd: number;
  volume_24h_usd: number;
  market_cap_usd: number;
  percent_change_24h: number;
  percent_change_7d: number;
  percent_change_30d: number;
}

/** Search CoinPaprika tickers. */
export async function paprikaSearch(query: string, limit = 12): Promise<PaprikaTicker[]> {
  try {
    const res = await fetch(`${BASE}/search?q=${encodeURIComponent(query)}&c=currencies&limit=${limit}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const ids: string[] = (data?.currencies ?? []).map((c: any) => c.id).slice(0, limit);
    if (!ids.length) return [];
    const ticks = await Promise.all(ids.map((id) => paprikaTicker(id)));
    return ticks.filter(Boolean) as PaprikaTicker[];
  } catch {
    return [];
  }
}

/** Get a single ticker. */
export async function paprikaTicker(coinId: string): Promise<PaprikaTicker | null> {
  try {
    const res = await fetch(`${BASE}/tickers/${coinId}`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const usd = data?.quotes?.USD;
    if (!usd) return null;
    return {
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      rank: data.rank,
      circulating_supply: data.circulating_supply,
      total_supply: data.total_supply,
      max_supply: data.max_supply,
      price_usd: usd.price,
      volume_24h_usd: usd.volume_24h,
      market_cap_usd: usd.market_cap,
      percent_change_24h: usd.percent_change_24h,
      percent_change_7d: usd.percent_change_7d,
      percent_change_30d: usd.percent_change_30d,
    };
  } catch {
    return null;
  }
}

/** Get top N tickers globally. */
export async function paprikaTopTickers(limit = 50): Promise<PaprikaTicker[]> {
  try {
    const res = await fetch(`${BASE}/tickers?limit=${limit}`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data as any[]).map((d: any) => ({
      id: d.id,
      name: d.name,
      symbol: d.symbol,
      rank: d.rank,
      circulating_supply: d.circulating_supply,
      total_supply: d.total_supply,
      max_supply: d.max_supply,
      price_usd: d?.quotes?.USD?.price,
      volume_24h_usd: d?.quotes?.USD?.volume_24h,
      market_cap_usd: d?.quotes?.USD?.market_cap,
      percent_change_24h: d?.quotes?.USD?.percent_change_24h,
      percent_change_7d: d?.quotes?.USD?.percent_change_7d,
      percent_change_30d: d?.quotes?.USD?.percent_change_30d,
    }));
  } catch {
    return [];
  }
}
