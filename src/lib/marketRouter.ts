import { detectAssetClass } from '@/src/data/symbolCatalog';

// Binance endpoints. api*.binance.com are geo-blocked (HTTP 451) from Vercel/
// GitHub datacenters; data-api.binance.vision is Binance's PUBLIC market-data
// endpoint that is NOT geo-restricted — so it goes first and unblocks
// klines/ticker from any datacenter.
const BINANCE_BASES = [
  process.env.BINANCE_BASE_URL || '',
  'https://data-api.binance.vision/api/v3',
  'https://api4.binance.com/api/v3',
  'https://api3.binance.com/api/v3',
  'https://api2.binance.com/api/v3',
  'https://api1.binance.com/api/v3',
  'https://api.binance.com/api/v3',
].filter(Boolean);
const BINANCE_BASE   = BINANCE_BASES[0];
const YAHOO_BASE     = 'https://query1.finance.yahoo.com';
const DEXSCREENER    = 'https://api.dexscreener.com/latest/dex';
const ALPHA_KEY      = process.env.ALPHA_VANTAGE_KEY || '';
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
const CC_BASE        = 'https://min-api.cryptocompare.com/data/v2';

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
  '5s':  '1s',   // fetch 1s, client aggregates to 5s
  '10s': '1s',   // fetch 1s, client aggregates to 10s
  '15s': '1s',   // fetch 1s, client aggregates to 15s
  '30s': '1s',   // fetch 1s, aggregate to 30s
  '45s': '1s',   // fetch 1s, aggregate to 45s
  '1m':  '1m',
  '2m':  '1m',   // fetch 1m, aggregate to 2m
  '3m':  '3m',
  '5m':  '5m',
  '10m': '5m',   // fetch 5m, aggregate to 10m
  '15m': '15m',
  '30m': '30m',
  '45m': '30m',  // closest native Binance interval
  '1h':  '1h',
  '2h':  '2h',
  '3h':  '2h',   // closest native Binance interval
  '4h':  '4h',
  '6h':  '6h',
  '8h':  '8h',
  '12h': '12h',
  '18h': '12h',  // closest native Binance interval
  '1d':  '1d',
  '2d':  '3d',
  '3d':  '3d',
  '5d':  '3d',   // closest native Binance interval
  '1w':  '1w',
  '2w':  '1w',
  '3w':  '1w',
  '1M':  '1M',
  '3M':  '1M',
  '6M':  '1M',
  '12M': '1M',
};

/** Maps internal timeframe strings to Yahoo Finance intervals */
const YAHOO_INTERVAL_MAP: Record<string, string> = {
  '1s':  '1m',
  '15s': '1m',
  '30s': '1m',
  '1m':  '1m',
  '3m':  '5m',
  '5m':  '5m',
  '10m': '15m',
  '15m': '15m',
  '30m': '30m',
  '45m': '30m',
  '1h':  '60m',
  '2h':  '60m',
  '3h':  '60m',
  '4h':  '60m',
  '6h':  '1d',
  '8h':  '1d',
  '12h': '1d',
  '1d':  '1d',
  '2d':  '1d',
  '3d':  '1d',
  '1w':  '1wk',
  '2w':  '1wk',
  '1M':  '1mo',
  '3M':  '3mo',
  '6M':  '3mo',
  '12M': '3mo',
};

/** Pick a Yahoo range string based on how many candles are needed.
 *  Yahoo Finance hard limits: 1m → 7d max, 2m/5m/15m/30m/60m → 60d max, 90m → 60d max.
 */
function yahooRange(limit: number, interval: string): string {
  if (['1mo', '3mo'].includes(interval)) {
    if (limit <= 12)  return '1y';
    if (limit <= 36)  return '5y';
    return 'max';
  }
  if (interval === '1wk') {
    if (limit <= 52)  return '1y';
    if (limit <= 260) return '5y';
    return 'max';
  }
  // 1-minute: Yahoo max is 7 calendar days
  if (interval === '1m') {
    return limit <= 390 ? '1d' : '5d';
  }
  // 2m/5m/15m/30m: Yahoo max is 60 calendar days
  if (['2m', '5m', '15m', '30m'].includes(interval)) {
    if (limit <= 78)   return '1d';
    if (limit <= 390)  return '5d';
    return '60d';
  }
  // 60m/90m: Yahoo max is 730 calendar days
  if (['60m', '90m'].includes(interval)) {
    if (limit <= 24)   return '1d';
    if (limit <= 120)  return '5d';
    if (limit <= 720)  return '60d';
    return '730d';
  }
  // Daily — NEVER 'max': on range=max Yahoo silently coarsens old tickers to
  // WEEKLY granularity while we label it 1d (the "1d looks like 1w" bug on
  // BMRI.JK etc). 10y of daily ≈ 2520 bars is the safe ceiling.
  if (limit <= 30)   return '1mo';
  if (limit <= 252)  return '1y';
  if (limit <= 504)  return '2y';
  if (limit <= 1260) return '5y';
  return '10y';
}

// ─── CryptoCompare fallback (works from Vercel US datacenter) ────────────────

function ccEndpoint(interval: string): { endpoint: string; aggregate: number } {
  const m: Record<string, { endpoint: string; aggregate: number }> = {
    '1m':  { endpoint: 'histominute', aggregate: 1  },
    '3m':  { endpoint: 'histominute', aggregate: 3  },
    '5m':  { endpoint: 'histominute', aggregate: 5  },
    '15m': { endpoint: 'histominute', aggregate: 15 },
    '30m': { endpoint: 'histominute', aggregate: 30 },
    '45m': { endpoint: 'histominute', aggregate: 45 },
    '1h':  { endpoint: 'histohour',   aggregate: 1  },
    '2h':  { endpoint: 'histohour',   aggregate: 2  },
    '3h':  { endpoint: 'histohour',   aggregate: 3  },
    '4h':  { endpoint: 'histohour',   aggregate: 4  },
    '6h':  { endpoint: 'histohour',   aggregate: 6  },
    '8h':  { endpoint: 'histohour',   aggregate: 8  },
    '12h': { endpoint: 'histohour',   aggregate: 12 },
    '1d':  { endpoint: 'histoday',    aggregate: 1  },
    '3d':  { endpoint: 'histoday',    aggregate: 3  },
    '1w':  { endpoint: 'histoday',    aggregate: 7  },
    '2w':  { endpoint: 'histoday',    aggregate: 14 },
    '1M':  { endpoint: 'histoday',    aggregate: 30 },
  };
  return m[interval] ?? { endpoint: 'histominute', aggregate: 15 };
}

// Sub-minute intervals only exist on Binance. CryptoCompare/OKX have no
// sub-minute data and previously DEFAULTED to 15m — silently returning
// 15-minute candles mislabeled as 1s/5s/15s/30s/45s. Return empty instead.
const SUB_MINUTE = new Set(['1s', '5s', '10s', '15s', '30s', '45s']);

// Sub-minute aggregation factors (built from a 1s base). 1s itself is the base.
const SUBMIN_SECONDS: Record<string, number> = { '5s': 5, '10s': 10, '15s': 15, '30s': 30, '45s': 45 };

/** Aggregate 1s base candles into N-second OHLCV buckets. */
function aggregateSeconds(base: OHLCVCandle[], sec: number, interval: string): OHLCVCandle[] {
  const ms = sec * 1000;
  const m = new Map<number, OHLCVCandle>();
  for (const k of base) {
    const bt = Math.floor(k.open_time / ms) * ms;
    const e = m.get(bt);
    if (!e) {
      m.set(bt, { ...k, timeframe: interval, open_time: bt, close_time: bt + ms - 1 });
    } else {
      e.high = Math.max(e.high, k.high);
      e.low = Math.min(e.low, k.low);
      e.close = k.close;
      e.volume += k.volume;
    }
  }
  return [...m.values()].sort((a, b) => a.open_time - b.open_time);
}

async function getCryptoCompareOHLCV(pair: string, interval: string, limit: number): Promise<OHLCVCandle[]> {
  if (SUB_MINUTE.has(interval)) return [];
  try {
    const fsym = pair.replace(/USDT$|BUSD$|USD$|BTC$|ETH$|BNB$/, '').toUpperCase() || 'BTC';
    const tsym = pair.endsWith('USDT') || pair.endsWith('BUSD') || pair.endsWith('USD') ? 'USDT' : 'BTC';
    const { endpoint, aggregate } = ccEndpoint(interval);
    const intervalMs = aggregate * ({ histominute: 60, histohour: 3600, histoday: 86400 }[endpoint] ?? 900) * 1000;
    const batchSize = endpoint === 'histominute' ? 2000 : 2000;
    const allCandles: OHLCVCandle[] = [];
    let toTs: number | undefined;
    let remaining = Math.min(limit, endpoint === 'histoday' ? 5000 : 2000);

    // Paginate backwards in time until we have enough candles
    while (remaining > 0 && allCandles.length < limit) {
      const batchLimit = Math.min(remaining, batchSize);
      let url = `${CC_BASE}/${endpoint}?fsym=${fsym}&tsym=${tsym}&limit=${batchLimit}&aggregate=${aggregate}`;
      if (toTs) url += `&toTs=${toTs}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) break;
      const json = await res.json() as { Response?: string; Data?: { Data?: any[] } };
      if (json.Response !== 'Success' || !json.Data?.Data?.length) break;
      const batch = json.Data.Data.filter((c: any) => c.open > 0).map((c: any) => ({
        symbol: pair.toUpperCase(), asset_class: 'crypto', timeframe: interval,
        open_time: c.time * 1000, open: c.open, high: c.high, low: c.low, close: c.close,
        volume: c.volumeto, close_time: c.time * 1000 + intervalMs,
      }));
      if (batch.length === 0) break;
      allCandles.unshift(...batch);
      toTs = Math.floor(batch[0].open_time / 1000) - 1;
      remaining -= batch.length;
      // Only paginate for daily/weekly timeframes (not minute/hour — too many requests)
      if (!['histoday'].includes(endpoint)) break;
    }
    return allCandles.slice(-limit);
  } catch {
    return [];
  }
}

// ─── OKX fallback (no geo-block, free, reliable from Vercel) ─────────────────

const OKX_BAR_MAP: Record<string, string> = {
  '1m':'1m','3m':'3m','5m':'5m','15m':'15m','30m':'30m','1h':'1H',
  '2h':'2H','4h':'4H','6h':'6H','12h':'12H','1d':'1D','1w':'1W','1M':'1M',
};

async function getOKXOHLCV(pair: string, interval: string, limit: number): Promise<OHLCVCandle[]> {
  if (SUB_MINUTE.has(interval)) return []; // OKX has no sub-minute candles
  try {
    const instId = pair.replace(/USDT$/i, '-USDT').replace(/BTC$/i, '-BTC');
    const bar = OKX_BAR_MAP[interval] || '15m';
    const url = `https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=${bar}&limit=${Math.min(limit, 300)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const json = await res.json() as { code: string; data: string[][] };
    if (json.code !== '0' || !json.data?.length) return [];
    const intervalMs = intervalMsMap[interval] || 900_000;
    return json.data
      .map((k: string[]) => ({
        symbol: pair.toUpperCase(), asset_class: 'crypto', timeframe: interval,
        open_time: Number(k[0]), close_time: Number(k[0]) + intervalMs,
        open: parseFloat(k[1]), high: parseFloat(k[2]),
        low: parseFloat(k[3]), close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }))
      .filter(c => c.close > 0)
      .reverse();
  } catch { return []; }
}

const intervalMsMap: Record<string, number> = {
  '1m':60000,'3m':180000,'5m':300000,'15m':900000,'30m':1800000,
  '1h':3600000,'2h':7200000,'4h':14400000,'6h':21600000,'12h':43200000,
  '1d':86400000,'1w':604800000,'1M':2592000000,
};

// ─── Binance single-page fetch (internal helper) ─────────────────────────────

async function fetchBinancePage(
  pair: string,
  binanceInterval: string,
  pageLimit: number,
  endTime?: number
): Promise<any[][]> {
  let urlSuffix = `klines?symbol=${pair.toUpperCase()}&interval=${binanceInterval}&limit=${pageLimit}`;
  if (endTime) urlSuffix += `&endTime=${endTime}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const raw = await Promise.any(
      BINANCE_BASES.map(async base => {
        const res = await fetch(`${base}/${urlSuffix}`, { cache: 'no-store', signal: ctrl.signal });
        if (!res.ok) throw new Error('not ok');
        const data: any[][] = await res.json();
        if (!Array.isArray(data) || data.length === 0) throw new Error('empty');
        return data;
      })
    );
    clearTimeout(timer);
    return raw;
  } catch {
    clearTimeout(timer);
    return [];
  }
}

function rawToCandle(k: any[], pair: string, interval: string): OHLCVCandle {
  return {
    symbol: pair.toUpperCase(), asset_class: 'crypto', timeframe: interval,
    open_time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
    close_time: k[6], quote_volume: parseFloat(k[7]), trades_count: Number(k[8]),
  };
}

// ─── Binance (with multi-endpoint fallback → CryptoCompare → OKX) ─────────────

export async function getBinanceOHLCV(
  pair: string,
  interval: string,
  limit: number
): Promise<OHLCVCandle[]> {
  const binanceInterval = BINANCE_INTERVAL_MAP[interval] || '15m';
  const BINANCE_MAX = 1000; // Binance hard limit per call
  const MAX_PAGES   = 5;    // cap at 5 pages = 5000 bars to avoid Vercel timeouts

  const aggSec = SUBMIN_SECONDS[interval]; // 5/10/15/30/45 → aggregate from 1s base
  // For aggregated sub-minute, fetch enough 1s base to yield ~limit bars.
  const baseNeeded = aggSec
    ? Math.min(limit * aggSec, MAX_PAGES * BINANCE_MAX)
    : Math.min(limit, interval === '1s' ? MAX_PAGES * BINANCE_MAX : MAX_PAGES * BINANCE_MAX);

  let base: OHLCVCandle[] = [];
  if (baseNeeded <= BINANCE_MAX) {
    const raw = await fetchBinancePage(pair, binanceInterval, baseNeeded);
    if (raw.length > 0) base = raw.map(k => rawToCandle(k, pair, interval));
  } else {
    // Multi-page paginated fetch — pages backward from now to build full history
    let endTime: number | undefined;
    let remaining = baseNeeded;
    while (remaining > 0 && base.length < baseNeeded) {
      const pageSize = Math.min(remaining, BINANCE_MAX);
      const raw = await fetchBinancePage(pair, binanceInterval, pageSize, endTime);
      if (raw.length === 0) break;
      base.unshift(...raw.map(k => rawToCandle(k, pair, interval)));
      endTime = raw[0][0] - 1;
      remaining -= raw.length;
      if (raw.length < pageSize) break;
    }
  }

  if (base.length > 0) {
    if (aggSec) return aggregateSeconds(base, aggSec, interval).slice(-limit);
    return base.slice(-limit);
  }

  // All Binance endpoints failed → CryptoCompare (unlimited history) → OKX (300 max)
  const cc = await getCryptoCompareOHLCV(pair, interval, limit);
  if (cc.length > 0) return cc;
  return getOKXOHLCV(pair, interval, limit);
}

// ─── Yahoo Finance ────────────────────────────────────────────────────────────

// ─── Stooq fallback (free, no key, reliable from Vercel) ─────────────────────

function toStooqSymbol(ticker: string): string {
  if (ticker.startsWith('^')) return ticker.toLowerCase();            // ^GSPC → ^spx (no, ^gspc)
  if (ticker.endsWith('=X')) return ticker.replace('=X', '').toLowerCase();  // EURUSD=X → eurusd
  if (ticker.endsWith('=F')) return ticker.replace('=F', '').toLowerCase() + '.f'; // GC=F → gc.f
  if (ticker.includes('.')) return ticker.toLowerCase();              // BBCA.JK → bbca.jk
  return ticker.toLowerCase() + '.us';                                // AAPL → aapl.us
}

async function getStooqOHLCV(ticker: string, limit: number): Promise<OHLCVCandle[]> {
  try {
    const sym = toStooqSymbol(ticker);
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(sym)}&i=d`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const assetClass = detectAssetClass(ticker).assetClass;
    const candles: OHLCVCandle[] = [];
    for (let i = 1; i < lines.length; i++) {
      const [date, open, high, low, close, volume] = lines[i].split(',');
      if (!date || !close) continue;
      const ts = new Date(date.trim()).getTime();
      if (!ts || isNaN(ts)) continue;
      candles.push({
        symbol: ticker, asset_class: assetClass, timeframe: '1d',
        open_time: ts, close_time: ts + 86400000,
        open: parseFloat(open), high: parseFloat(high),
        low: parseFloat(low), close: parseFloat(close),
        volume: parseFloat(volume || '0') || 0,
      });
    }
    return candles.slice(-limit).filter(c => c.close > 0);
  } catch { return []; }
}

export async function getYahooOHLCV(
  ticker: string,
  interval: string,
  limit: number
): Promise<OHLCVCandle[]> {
  try {
    const yahooInterval = YAHOO_INTERVAL_MAP[interval] || '1d';
    const range = yahooRange(limit, yahooInterval);
    const url = `${YAHOO_BASE}/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${yahooInterval}&range=${range}`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'application/json' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return [];

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return [];

    // GRANULARITY GUARD — Yahoo can silently substitute a coarser interval
    // (e.g. weekly bars for interval=1d on long ranges). If the response's
    // actual granularity differs from what we asked for, REJECT it so the
    // caller falls back to Stooq (true daily CSV) instead of mislabeling
    // weekly candles as 1d — that lie corrupts T1MO and every indicator.
    const gran = String(result?.meta?.dataGranularity ?? '');
    if (gran && gran !== yahooInterval) return [];

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
  const sym = pair.toUpperCase();

  // Race all Binance endpoints simultaneously — 2s global timeout
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);

  try {
    const winner = await Promise.any(
      BINANCE_BASES.map(async base => {
        const [pr, tr] = await Promise.all([
          fetch(`${base}/ticker/price?symbol=${sym}`, { cache: 'no-store', signal: ctrl.signal }),
          fetch(`${base}/ticker/24hr?symbol=${sym}`,  { cache: 'no-store', signal: ctrl.signal }),
        ]);
        if (!pr.ok) throw new Error('not ok');
        const pj = await pr.json();
        if (!pj.price) throw new Error('no price');
        const tj = tr.ok ? await tr.json() : {};
        return {
          symbol: sym, price: parseFloat(pj.price),
          change24h: parseFloat(tj.priceChangePercent || '0'),
          high24h: parseFloat(tj.highPrice || '0'),
          low24h: parseFloat(tj.lowPrice || '0'),
          volume24h: parseFloat(tj.volume || '0'),
          ts: Date.now(),
        } as PriceData;
      })
    );
    clearTimeout(timer);
    return winner;
  } catch { clearTimeout(timer); }

  // Fallback: CryptoCompare (works from Vercel US)
  try {
    const fsym = sym.replace(/USDT$|BUSD$|USD$/, '') || 'BTC';
    const res = await fetch(`https://min-api.cryptocompare.com/data/price?fsym=${fsym}&tsyms=USD,USDT`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json() as Record<string, number>;
    const price = json.USDT ?? json.USD ?? 0;
    if (!price) return null;
    return { symbol: sym, price, change24h: 0, high24h: 0, low24h: 0, volume24h: 0, ts: Date.now() };
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
      let data = await getYahooOHLCV(ticker, timeframe, limit);
      // Market closed / intraday empty — fall back to daily
      if (data.length === 0 && !['1d','2d','3d','1w','2w','1M','3M','6M','12M'].includes(timeframe)) {
        data = await getYahooOHLCV(ticker, '1d', Math.max(limit, 365));
      }
      // Yahoo still empty — try Stooq (reliable from Vercel)
      if (data.length === 0) {
        data = await getStooqOHLCV(ticker, Math.max(limit, 365));
      }
      return data;
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
    '1s':  1,   '15s': 15,   '30s': 30,
    '1m':  60,  '3m':  180,  '5m':  300,
    '10m': 600, '15m': 900,  '30m': 1800,
    '45m': 2700,'1h':  3600, '2h':  7200,
    '3h':  10800,'4h': 14400,'6h':  21600,
    '8h':  28800,'12h':43200,'1d':  86400,
    '2d':  172800,'3d':259200,'1w': 604800,
    '2w':  1209600,'1M':2592000,'3M':7776000,
    '6M':  15552000,'12M':31104000,
  };
  return map[tf] ?? 60;
}

function intervalMs(yahooInterval: string): number {
  const map: Record<string, number> = {
    '1m':   60_000,
    '2m':   120_000,
    '5m':   300_000,
    '15m':  900_000,
    '30m':  1_800_000,
    '60m':  3_600_000,
    '90m':  5_400_000,
    '1d':   86_400_000,
    '5d':   432_000_000,
    '1wk':  604_800_000,
    '1mo':  2_592_000_000,
    '3mo':  7_776_000_000,
  };
  return map[yahooInterval] ?? 86_400_000;
}
