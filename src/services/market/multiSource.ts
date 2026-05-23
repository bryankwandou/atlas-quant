/**
 * Atlas Quant · Multi-source market data aggregator
 * -----------------------------------------------------------------
 * Returns OHLCV + ticker by trying providers in order until one
 * responds. Providers are picked by asset class:
 *
 *   crypto      → Binance → KuCoin → Kraken → CoinPaprika
 *   stock/etf   → Yahoo
 *   forex/idx   → Yahoo
 *   commodity   → Yahoo
 *   dex         → DexScreener → GeckoTerminal
 */

import { detectAssetClass } from '@/src/data/symbolCatalog';
import { getKuCoinOHLC, getKuCoinTicker } from './kucoin';
import { getKrakenOHLC, getKrakenTicker } from './kraken';
import { paprikaTicker, paprikaSearch } from './coinpaprika';
import { getDexPairBySymbol, dexPairToSnapshot } from './dexscreener';
import { getGeckoTerminalOHLCV, type GTNetwork } from './geckoterminal';

export interface MultiSourceCandle {
  time: number; open: number; high: number; low: number; close: number; volume: number;
}

export interface MultiSourceResult {
  source: string;
  symbol: string;
  candles: MultiSourceCandle[];
  ticker: { price: number; volume24h: number; pct24h?: number; high24h?: number; low24h?: number; liquidityUsd?: number; marketCap?: number } | null;
  notes: string[];
}

const BINANCE_BASE = process.env.BINANCE_BASE_URL || 'https://api.binance.com/api/v3';

async function fetchBinance(symbol: string, interval: string, limit: number): Promise<MultiSourceCandle[]> {
  try {
    const res = await fetch(`${BINANCE_BASE}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`, { next: { revalidate: 30 } });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<Array<number | string>>;
    return data.map((r) => ({
      time: Math.floor(Number(r[0]) / 1000),
      open: parseFloat(r[1] as string),
      high: parseFloat(r[2] as string),
      low: parseFloat(r[3] as string),
      close: parseFloat(r[4] as string),
      volume: parseFloat(r[5] as string),
    }));
  } catch {
    return [];
  }
}

async function fetchBinanceTicker(symbol: string) {
  try {
    const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${symbol.toUpperCase()}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const t: any = await res.json();
    return {
      price: parseFloat(t.lastPrice),
      volume24h: parseFloat(t.quoteVolume),
      pct24h: parseFloat(t.priceChangePercent),
      high24h: parseFloat(t.highPrice),
      low24h: parseFloat(t.lowPrice),
    };
  } catch { return null; }
}

const BINANCE_INTERVAL_FIX: Record<string, string> = {
  '15s': '1m', '30s': '1m',
};

export async function getMultiSource(symbol: string, timeframe = '1h', limit = 200): Promise<MultiSourceResult> {
  const out: MultiSourceResult = { source: 'none', symbol, candles: [], ticker: null, notes: [] };
  const meta = detectAssetClass(symbol);
  const tfBinance = BINANCE_INTERVAL_FIX[timeframe] ?? timeframe;

  // Crypto cascade
  if (meta.assetClass === 'crypto' || meta.assetClass === 'memecoin') {
    out.candles = await fetchBinance(symbol, tfBinance, limit);
    out.ticker  = await fetchBinanceTicker(symbol);
    if (out.candles.length) { out.source = 'binance'; return out; }
    out.notes.push('Binance returned nothing; trying KuCoin');

    out.candles = await getKuCoinOHLC(symbol, timeframe, limit);
    out.ticker  = await getKuCoinTicker(symbol);
    if (out.candles.length) { out.source = 'kucoin'; return out; }
    out.notes.push('KuCoin returned nothing; trying Kraken');

    out.candles = await getKrakenOHLC(symbol, timeframe, limit);
    if (!out.ticker) {
      const kt = await getKrakenTicker(symbol);
      if (kt) out.ticker = { price: kt.price, volume24h: kt.volume24h, high24h: kt.high24h, low24h: kt.low24h };
    }
    if (out.candles.length) { out.source = 'kraken'; return out; }
    out.notes.push('Kraken returned nothing; trying CoinPaprika (price-only)');

    const tk = await paprikaSearch(symbol.replace(/USDT$|USDC$|BTC$/, ''));
    if (tk[0]) {
      out.ticker = {
        price: tk[0].price_usd,
        volume24h: tk[0].volume_24h_usd,
        pct24h: tk[0].percent_change_24h,
        marketCap: tk[0].market_cap_usd,
      };
      out.source = 'coinpaprika';
    }
    return out;
  }

  // DEX cascade
  if (meta.assetClass === 'dex') {
    const pair = await getDexPairBySymbol(symbol.replace(/-.*$/, ''));
    if (pair) {
      const snap = dexPairToSnapshot(pair);
      out.ticker = {
        price: snap.priceUsd,
        volume24h: snap.volume24h,
        pct24h: snap.pct24h,
        liquidityUsd: snap.liquidityUsd,
        marketCap: snap.marketCap,
      };
      // Try GeckoTerminal for OHLCV
      const networkMap: Record<string, GTNetwork> = {
        ethereum: 'eth', bsc: 'bsc', polygon: 'polygon_pos', arbitrum: 'arbitrum',
        optimism: 'optimism', base: 'base', avalanche: 'avax', solana: 'solana',
        sui: 'sui-network', aptos: 'aptos', tron: 'tron', ton: 'ton',
      };
      const net = networkMap[pair.chainId.toLowerCase()];
      if (net) {
        const tf = timeframe.endsWith('m') ? 'minute' : timeframe.endsWith('h') ? 'hour' : 'day';
        const agg = parseInt(timeframe.replace(/\D/g, ''), 10) || 1;
        const bars = await getGeckoTerminalOHLCV(net, pair.pairAddress, tf as any, agg, limit);
        out.candles = bars.map((b) => ({ time: b.timestamp, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }));
      }
      out.source = 'dexscreener+geckoterminal';
      return out;
    }
    return out;
  }

  // Stock / forex / index / commodity → Yahoo proxy via existing router
  try {
    const { routeOHLCV } = await import('@/src/lib/marketRouter');
    const candles = await routeOHLCV(symbol, timeframe, limit);
    if (candles?.length) {
      out.candles = candles.map((c: any) => ({
        time: c.time ?? Math.floor((c.open_time ?? 0) / 1000),
        open: Number(c.open), high: Number(c.high), low: Number(c.low),
        close: Number(c.close), volume: Number(c.volume ?? 0),
      }));
      out.source = 'yahoo';
    }
  } catch { /* ignore */ }

  return out;
}
