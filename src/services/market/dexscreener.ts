/**
 * DexScreener public API — DEX pair data with volume / liquidity / price impact.
 * https://docs.dexscreener.com/
 *
 * No auth, no key.  60 req/min; cache aggressively.
 */

const BASE = 'https://api.dexscreener.com/latest/dex';

export interface DexPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: { address: string; name: string; symbol: string };
  quoteToken: { address: string; name: string; symbol: string };
  priceNative: string;
  priceUsd: string;
  txns: {
    h24: { buys: number; sells: number };
    h6:  { buys: number; sells: number };
    h1:  { buys: number; sells: number };
    m5:  { buys: number; sells: number };
  };
  volume: { h24: number; h6: number; h1: number; m5: number };
  priceChange: { h24: number; h6: number; h1: number; m5: number };
  liquidity?: { usd?: number; base?: number; quote?: number };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

interface PairListResponse {
  schemaVersion: string;
  pairs: DexPair[] | null;
}

/** Look up the top trading pair for a given base token symbol. */
export async function getDexPairBySymbol(symbol: string, chain?: string): Promise<DexPair | null> {
  try {
    const res = await fetch(`${BASE}/search?q=${encodeURIComponent(symbol)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as PairListResponse;
    if (!data.pairs?.length) return null;

    const filtered = chain
      ? data.pairs.filter((p) => p.chainId.toLowerCase() === chain.toLowerCase())
      : data.pairs;

    // Pick highest 24h volume USD with sufficient liquidity
    return filtered
      .filter((p) => (p.liquidity?.usd ?? 0) > 10_000)
      .sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0))[0] ?? null;
  } catch {
    return null;
  }
}

/** Fetch metadata for a specific token contract on a chain. */
export async function getDexPairsForToken(chain: string, address: string): Promise<DexPair[]> {
  try {
    const res = await fetch(`${BASE}/tokens/${address}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = (await res.json()) as PairListResponse;
    return (data.pairs ?? []).filter((p) => p.chainId.toLowerCase() === chain.toLowerCase());
  } catch {
    return [];
  }
}

/** Convert a DexPair into an OHLCV approximation using volume + price change. */
export function dexPairToSnapshot(pair: DexPair) {
  return {
    chain: pair.chainId,
    dex: pair.dexId,
    base: pair.baseToken.symbol,
    quote: pair.quoteToken.symbol,
    priceUsd: parseFloat(pair.priceUsd ?? '0'),
    liquidityUsd: pair.liquidity?.usd ?? 0,
    fdv: pair.fdv ?? 0,
    marketCap: pair.marketCap ?? 0,
    volume24h: pair.volume?.h24 ?? 0,
    volume1h: pair.volume?.h1 ?? 0,
    txns24h: (pair.txns?.h24?.buys ?? 0) + (pair.txns?.h24?.sells ?? 0),
    buyPressure24h: pair.txns?.h24
      ? (pair.txns.h24.buys - pair.txns.h24.sells) / Math.max(1, pair.txns.h24.buys + pair.txns.h24.sells)
      : 0,
    pct24h: pair.priceChange?.h24 ?? 0,
    pct1h: pair.priceChange?.h1 ?? 0,
    pairUrl: pair.url,
    pairAddress: pair.pairAddress,
    createdAt: pair.pairCreatedAt ?? null,
  };
}
