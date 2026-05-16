/**
 * GeckoTerminal public API — comprehensive DEX OHLCV with volume per network.
 * https://www.geckoterminal.com/dex-api
 *
 * 30 req/min, no auth.
 */

const BASE = 'https://api.geckoterminal.com/api/v2';

export type GTNetwork =
  | 'eth' | 'bsc' | 'polygon_pos' | 'arbitrum' | 'optimism' | 'base' | 'avax'
  | 'fantom' | 'solana' | 'sui-network' | 'aptos' | 'tron' | 'ton';

interface GTOhlcvBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** OHLCV for a specific pool, where pool = `{network}_{pool_address}`. */
export async function getGeckoTerminalOHLCV(
  network: GTNetwork,
  poolAddress: string,
  timeframe: 'minute' | 'hour' | 'day' = 'hour',
  aggregate = 1,
  limit = 200,
): Promise<GTOhlcvBar[]> {
  try {
    const res = await fetch(
      `${BASE}/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}`,
      { next: { revalidate: 90 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const list: number[][] = data?.data?.attributes?.ohlcv_list ?? [];
    return list.map(([t, o, h, l, c, v]) => ({
      timestamp: t,
      open: o,
      high: h,
      low: l,
      close: c,
      volume: v,
    }));
  } catch {
    return [];
  }
}

export async function getGeckoTerminalTrendingPools(network: GTNetwork): Promise<any[]> {
  try {
    const res = await fetch(`${BASE}/networks/${network}/trending_pools`, { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data ?? [];
  } catch {
    return [];
  }
}

export async function getGeckoTerminalNewPools(network: GTNetwork): Promise<any[]> {
  try {
    const res = await fetch(`${BASE}/networks/${network}/new_pools`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data ?? [];
  } catch {
    return [];
  }
}
