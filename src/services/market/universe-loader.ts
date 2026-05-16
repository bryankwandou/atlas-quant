/**
 * UNIVERSE LOADER — Runtime expander untuk universe aset.
 *
 * Gabung sumber:
 *   1. STATIC_ASSET_UNIVERSE (700+ kurasi internal)
 *   2. Binance exchangeInfo  (semua trading pair USDT/USDC/BUSD, ~2000)
 *   3. DexScreener trending  (top DEX pools, ~200)
 *   4. CoinGecko top markets  (top 250 koin by market cap)
 *
 * Cached 10 menit lewat in-memory map. Aman untuk serverless.
 */
import type { Asset } from '@/domain/asset';
import { STATIC_ASSET_UNIVERSE } from '@/data/assets';

interface CacheEntry {
  assets: Asset[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit
const cache: Map<string, CacheEntry> = new Map();

const fetchSafe = async <T>(url: string, parse: (data: unknown) => T, timeoutMs = 8000): Promise<T | null> => {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'AtlasQuant/2.0' } });
    clearTimeout(t);
    if (!r.ok) return null;
    const data = await r.json();
    return parse(data);
  } catch {
    return null;
  }
};

/**
 * Fetch Binance exchange info → semua spot trading pair.
 */
export async function fetchBinanceSpotUniverse(): Promise<Asset[]> {
  const data = await fetchSafe(
    'https://api.binance.com/api/v3/exchangeInfo',
    (raw: unknown) => raw as { symbols: Array<{ symbol: string; baseAsset: string; quoteAsset: string; status: string; isSpotTradingAllowed: boolean }> },
  );
  if (!data?.symbols) return [];
  return data.symbols
    .filter((s) => s.status === 'TRADING' && s.isSpotTradingAllowed && ['USDT', 'USDC', 'BUSD', 'BTC'].includes(s.quoteAsset))
    .map<Asset>((s) => ({
      symbol: s.symbol,
      base: s.baseAsset,
      quote: s.quoteAsset,
      assetClass: 'crypto',
      exchange: 'binance',
      name: `${s.baseAsset}/${s.quoteAsset}`,
      description: `${s.baseAsset} spot pair on Binance`,
      currency: s.quoteAsset,
      decimals: 8,
      isTradable: true,
      isListed: true,
      tags: ['binance', 'spot', s.quoteAsset.toLowerCase()],
      aliases: [s.baseAsset, `${s.baseAsset}/${s.quoteAsset}`, `${s.baseAsset}-${s.quoteAsset}`],
    }));
}

/**
 * Fetch Binance 24h ticker → enrich symbols dengan volume + price.
 */
export async function enrichWithVolume(assets: Asset[]): Promise<Asset[]> {
  const data = await fetchSafe(
    'https://api.binance.com/api/v3/ticker/24hr',
    (raw: unknown) => raw as Array<{ symbol: string; lastPrice: string; volume: string; quoteVolume: string; priceChangePercent: string }>,
  );
  if (!data?.length) return assets;
  const map = new Map(data.map((t) => [t.symbol, t]));
  return assets.map((a) => {
    const tick = map.get(a.symbol);
    if (!tick) return a;
    return {
      ...a,
      priceUsd: parseFloat(tick.lastPrice),
      volume24h: parseFloat(tick.volume),
      liquidityUsd: parseFloat(tick.quoteVolume),
      metadata: { ...(a.metadata ?? {}), changePct24h: parseFloat(tick.priceChangePercent) },
    };
  });
}

/**
 * DexScreener trending — top pairs on Solana, Ethereum, Base, BSC.
 */
export async function fetchDexScreenerTrending(): Promise<Asset[]> {
  const chains = ['solana', 'ethereum', 'base', 'bsc', 'arbitrum'];
  const allPools: Asset[] = [];
  for (const chain of chains) {
    const data = await fetchSafe(
      `https://api.dexscreener.com/latest/dex/search?q=${chain}`,
      (raw: unknown) => raw as { pairs: Array<{
        chainId: string;
        dexId: string;
        baseToken: { address: string; name: string; symbol: string };
        quoteToken: { symbol: string };
        priceUsd?: string;
        volume?: { h24: number };
        liquidity?: { usd: number };
        marketCap?: number;
      }> },
    );
    if (!data?.pairs) continue;
    for (const p of data.pairs.slice(0, 50)) {
      if (!p.baseToken || !p.priceUsd) continue;
      allPools.push({
        symbol: `DEX_${p.baseToken.symbol.toUpperCase()}_${p.chainId.toUpperCase()}`,
        base: p.baseToken.symbol,
        quote: p.quoteToken.symbol || 'USD',
        assetClass: 'dex',
        exchange: p.dexId,
        name: p.baseToken.name,
        currency: 'USD',
        priceUsd: parseFloat(p.priceUsd),
        volume24h: p.volume?.h24,
        liquidityUsd: p.liquidity?.usd,
        marketCapUsd: p.marketCap,
        isTradable: true,
        isListed: true,
        tags: ['dex', p.chainId, p.dexId],
        aliases: [p.baseToken.symbol, p.baseToken.name],
        metadata: { chain: p.chainId, contract: p.baseToken.address },
      });
    }
  }
  return allPools;
}

/**
 * CoinGecko top 250 markets.
 */
export async function fetchCoinGeckoTop(): Promise<Asset[]> {
  const data = await fetchSafe(
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false',
    (raw: unknown) => raw as Array<{ id: string; symbol: string; name: string; current_price: number; market_cap: number; total_volume: number; price_change_percentage_24h: number }>,
  );
  if (!data?.length) return [];
  return data.map<Asset>((c) => ({
    symbol: `${c.symbol.toUpperCase()}USDT`,
    base: c.symbol.toUpperCase(),
    quote: 'USDT',
    assetClass: 'crypto',
    exchange: 'cg',
    name: c.name,
    currency: 'USDT',
    decimals: 8,
    priceUsd: c.current_price,
    marketCapUsd: c.market_cap,
    volume24h: c.total_volume,
    liquidityUsd: c.total_volume,
    isTradable: true,
    isListed: true,
    tags: ['cg', 'top250'],
    aliases: [c.symbol.toUpperCase(), c.name, c.id],
    metadata: { changePct24h: c.price_change_percentage_24h },
  }));
}

/**
 * Combine all sources + dedupe by `symbol`.
 */
export async function fetchExpandedUniverse(): Promise<Asset[]> {
  const cached = cache.get('expanded');
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.assets;
  }
  const [bin, dex, cg] = await Promise.all([
    fetchBinanceSpotUniverse(),
    fetchDexScreenerTrending(),
    fetchCoinGeckoTop(),
  ]);
  const binEnriched = await enrichWithVolume(bin);

  const seen = new Set<string>();
  const merged: Asset[] = [];
  for (const a of [...STATIC_ASSET_UNIVERSE, ...binEnriched, ...dex, ...cg]) {
    const key = `${a.symbol}|${a.exchange ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(a);
  }
  cache.set('expanded', { assets: merged, fetchedAt: Date.now() });
  return merged;
}

export function getCachedUniverse(): Asset[] {
  return cache.get('expanded')?.assets ?? STATIC_ASSET_UNIVERSE;
}

/**
 * Background prewarm — dipanggil dari serverless route saat cold start.
 */
export async function prewarmUniverse(): Promise<{ ok: boolean; count: number; durationMs: number }> {
  const t0 = Date.now();
  try {
    const u = await fetchExpandedUniverse();
    return { ok: true, count: u.length, durationMs: Date.now() - t0 };
  } catch {
    return { ok: false, count: 0, durationMs: Date.now() - t0 };
  }
}
