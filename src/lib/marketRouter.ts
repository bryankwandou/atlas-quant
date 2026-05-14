import { detectAssetClass } from '@/src/data/symbolCatalog';

const BINANCE_BASE   = process.env.BINANCE_BASE_URL || 'https://api.binance.com/api/v3';
const YAHOO_BASE     = 'https://query1.finance.yahoo.com';
const DEXSCREENER    = 'https://api.dexscreener.com/latest/dex';
const ALPHA_KEY      = process.env.ALPHA_VANTAGE_KEY || '';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// ─── Shared candle shape ──────────────────────────────────────────────────────
export interface OHLCVCandle {
  symbol: string;
  asset_class: string;
  timeframe: string;
  open_time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  close_time: number;
  quote_volume?: number;
  trades_count?: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  ts: number;
}

// ─── Interval mapping helpers ─────────────────────────────────────────────────

/** Maps internal timeframe strings to Binance kline intervals */
const BINANCE_INTERVAL_MAP: Record<string, string> = {
  '1s':  '1s',
  '15s': '1m',
  '30s': '1m',
  '1m':  '1m',
  '3m':  '3m',
  '5m':  '5m',
  '15m': '15m',
  '30m': '30m',
  '1h':  '1h',
  '2h':  '2h',
  '4h':  '4h',
  '1d':  '1d',
  '1w':  '1w',
};

/** Maps internal timeframe strings to Yahoo Finance intervals */
const YAHOO_INTERVAL_MAP: Record<string, string> = {
  '1s':  '1m',  // Yahoo doesn't support sub-minute; fall back to 1m
  '15s': '1m',
  '30s': '1m',
  '1m':  '1m',
  '3m':  '5m',  // no 3m on Yahoo
  '5m':  '5m',
  '15m': '15m',
  '30m': '30m',
  '1h':  '60m',
  '2h':  '1d',  // no 2h on Yahoo
  '4h':  '1d',  // no 4h on Yahoo
  '1d':  '1d',
  '1w':  '1wk',
};

/** Pick a Yahoo range string based on how many candles are needed */
function yahooRange(limit: number, interval: string): string {
  // Intra-day intervals need shorter ranges
  const intraday = ['1m', '5m', '15m', '30m', '60m'].includes(interval);
  if (intraday) {
    if (limit <= 100)  return '1d';
    if (limit <= 500)  return '5d';
    if (limit <= 1000) return '1mo';
    return '3mo';
  }
  // Daily / weekly
  if (limit <= 100)  return '1mo';
  if (limit <= 500)  return '1y';
  if (limit <= 1000) return '2y';
  return '5y';
}

// ─── Binance ──────────────────────────────────────────────────────────────────

export async function getBinanceOHLCV(
  pair: string,
  interval: string,
  limit: number
): Promise<OHLCVCandle[]> {
  try {
    const binanceInterval = BINANCE_INTERVAL_MAP[interval] || '15m';
    const url = `${BINANCE_BASE}/klines?symbol=${pair.toUpperCase()}&interval=${binanceInterval}&limit=${limit}`;
    const res = await fetch(url, { next: { revalidate: revalidateSeconds(interval) } });
    if (!res.ok) return [];
    const raw: any[][] = await res.json();
    return raw.map((k) => ({
      symbol:       pair.toUpperCase(),
      asset_class:  'crypto',
      timeframe:    interval,
      open_time:    k[0],
      open:         parseFloat(k[1]),
      high:         parseFloat(k[2]),
      low:          parseFloat(k[3]),
      close:        parseFloat(k[4]),
      volume:       parseFloat(k[5]),
      close_time:   k[6],
      quote_volume: parseFloat(k[7]),
      trades_count: Number(k[8]),
    }));
  } catch {
    return [];
  }
}

// ─── Yahoo Finance ────────────────────────────────────────────────────────────

export async function getYahooOHLCV(
  ticker: string,
  interval: string,
  limit: number
): Promise<OHLCVCandle[]> {
  try {
    const yahooInterval = YAHOO_INTERVAL_MAP[interval] || '1d';
    const range = yahooRange(limit, yahooInterval);
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${yahooInterval}&range=${range}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: revalidateSeconds(interval) },
    });
    if (!res.ok) return [];

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens:   number[] = quote.open   || [];
    const highs:   number[] = quote.high   || [];
    const lows:    number[] = quote.low    || [];
    const closes:  number[] = quote.close  || [];
    const volumes: number[] = quote.volume || [];

    const candles: OHLCVCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      // Skip any null/undefined bars that Yahoo sometimes returns
      if (
        opens[i]   == null ||
        highs[i]   == null ||
        lows[i]    == null ||
        closes[i]  == null
      ) continue;

      const openTimeMs  = timestamps[i] * 1000;
      candles.push({
        symbol:      ticker,
        asset_class: detectAssetClass(ticker).assetClass,
        timeframe:   interval,
        open_time:   openTimeMs,
        open:        opens[i],
        high:        highs[i],
        low:         lows[i],
        close:       closes[i],
        volume:      volumes[i] ?? 0,
        close_time:  openTimeMs + intervalMs(yahooInterval),
      });
    }

    // Respect the limit from the tail end (most recent data)
    return candles.slice(-limit);
  } catch {
    return [];
  }
}

// ─── DexScreener ─────────────────────────────────────────────────────────────

export async function getDexScreenerOHLCV(
  address: string,
  interval: string
): Promise<OHLCVCandle[]> {
  try {
    const url = `${DEXSCREENER}/pairs/${address}`;
    const res = await fetch(url, { next: { revalidate: 30 } });
    if (!res.ok) return [];

    const json = await res.json();
    const pair = json?.pair;
    if (!pair) return [];

    // DexScreener doesn't provide OHLCV historically, only current price data
    // Return a single synthetic candle from current snapshot
    const price  = parseFloat(pair.priceUsd || '0');
    const now    = Date.now();

    return [
      {
        symbol:      address,
        asset_class: 'dex',
        timeframe:   interval,
        open_time:   now - 60_000,
        open:        price,
        high:        price,
        low:         price,
        close:       price,
        volume:      parseFloat(pair.volume?.h24 || '0'),
        close_time:  now,
      },
    ];
  } catch {
    return [];
  }
}

// ─── Price fetchers ───────────────────────────────────────────────────────────

export async function getBinancePrice(pair: string): Promise<PriceData | null> {
  try {
    const sym = pair.toUpperCase();
    const [priceRes, tickerRes] = await Promise.all([
      fetch(`${BINANCE_BASE}/ticker/price?symbol=${sym}`, { next: { revalidate: 5 } }),
      fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${sym}`,  { next: { revalidate: 10 } }),
    ]);
    if (!priceRes.ok) return null;

    const priceJson  = await priceRes.json();
    const tickerJson = tickerRes.ok ? await tickerRes.json() : {};

    return {
      symbol:    sym,
      price:     parseFloat(priceJson.price),
      change24h: parseFloat(tickerJson.priceChangePercent || '0'),
      high24h:   parseFloat(tickerJson.highPrice          || '0'),
      low24h:    parseFloat(tickerJson.lowPrice           || '0'),
      volume24h: parseFloat(tickerJson.volume             || '0'),
      ts:        Date.now(),
    };
  } catch {
    return null;
  }
}

export async function getYahooPrice(ticker: string): Promise<PriceData | null> {
  try {
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=5d`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;

    const json   = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta     = result.meta || {};
    const price    = meta.regularMarketPrice     ?? 0;
    const prevClose = meta.previousClose          ?? meta.chartPreviousClose ?? price;
    const high24h  = meta.regularMarketDayHigh    ?? 0;
    const low24h   = meta.regularMarketDayLow     ?? 0;
    const volume   = meta.regularMarketVolume     ?? 0;
    const change24h = prevClose !== 0 ? ((price - prevClose) / prevClose) * 100 : 0;

    return {
      symbol:    ticker,
      price,
      change24h,
      high24h,
      low24h,
      volume24h: volume,
      ts:        Date.now(),
    };
  } catch {
    return null;
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

/**
 * Route an OHLCV request to the correct data source based on symbol type.
 */
export async function routeOHLCV(
  symbol: string,
  timeframe: string,
  limit: number
): Promise<OHLCVCandle[]> {
  const { assetClass, yahooTicker, binancePair, dexAddress } =
    detectAssetClassExtended(symbol);

  switch (assetClass) {
    case 'crypto':
    case 'memecoin':
      if (binancePair) return getBinanceOHLCV(binancePair, timeframe, limit);
      return [];

    case 'dex':
      if (dexAddress) return getDexScreenerOHLCV(dexAddress, timeframe);
      return [];

    case 'stock_us':
    case 'stock_cn':
    case 'stock_id':
    case 'stock_eu':
    case 'stock_sa':
    case 'index':
    case 'commodity':
    case 'futures':
    case 'forex': {
      const ticker = yahooTicker || symbol;
      return getYahooOHLCV(ticker, timeframe, limit);
    }

    default:
      // Best-effort: try Binance then Yahoo
      if (/USDT$/i.test(symbol)) {
        return getBinanceOHLCV(symbol.toUpperCase(), timeframe, limit);
      }
      return getYahooOHLCV(symbol, timeframe, limit);
  }
}

/**
 * Route a price request to the correct data source.
 */
export async function routePrice(symbol: string): Promise<PriceData | null> {
  const { assetClass, yahooTicker, binancePair } = detectAssetClassExtended(symbol);

  switch (assetClass) {
    case 'crypto':
    case 'memecoin':
      if (binancePair) return getBinancePrice(binancePair);
      return null;

    case 'stock_us':
    case 'stock_cn':
    case 'stock_id':
    case 'stock_eu':
    case 'stock_sa':
    case 'index':
    case 'commodity':
    case 'futures':
    case 'forex': {
      const ticker = yahooTicker || symbol;
      return getYahooPrice(ticker);
    }

    default:
      if (/USDT$/i.test(symbol)) return getBinancePrice(symbol.toUpperCase());
      return getYahooPrice(symbol);
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function detectAssetClassExtended(symbol: string) {
  const detected = detectAssetClass(symbol);
  // If the original symbol has a dexAddress (would need to come from catalog)
  // we expose it here; for now we re-export the same shape
  return { ...detected, dexAddress: undefined as string | undefined };
}

function revalidateSeconds(tf: string): number {
  const map: Record<string, number> = {
    '1s':  1,   '15s': 15,  '30s': 30,
    '1m':  60,  '3m':  180, '5m':  300,
    '15m': 900, '30m': 1800,'1h':  3600,
    '2h':  7200,'4h':  14400,'1d': 86400,
    '1w':  604800,
  };
  return map[tf] ?? 60;
}

function intervalMs(yahooInterval: string): number {
  const map: Record<string, number> = {
    '1m':  60_000,
    '5m':  300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '60m': 3_600_000,
    '1d':  86_400_000,
    '1wk': 604_800_000,
  };
  return map[yahooInterval] ?? 86_400_000;
}
