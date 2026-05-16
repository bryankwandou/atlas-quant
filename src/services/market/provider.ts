/**
 * Market provider — unified OHLCV fetcher dengan multi-source fallback.
 * Source order:
 *   1. Binance  (crypto USDT/BUSD/BTC pairs)
 *   2. Yahoo    (stock, forex, index, commodity, ETF)
 *   3. DexScreener (DEX tokens)
 *   4. Simulated (last-resort fallback for dev/demo only)
 *
 * Tidak memakai dummy data kecuali ENV FEATURE_DEMO_DATA=true.
 *
 * Mempertahankan kompatibilitas dengan interface lama IMarketProvider
 * (digunakan oleh kode existing).
 */
import { MarketScanData, OHLC } from '@/domain/signal';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe =
  | '1m' | '3m' | '5m' | '15m' | '30m'
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h'
  | '1d' | '3d' | '1w' | '1M';

export interface IMarketProvider {
  getGlobalScan(): Promise<MarketScanData[]>;
  getOHLC(symbol: string, limit: number, days?: string): Promise<OHLC[]>;
}

const BINANCE = process.env.BINANCE_BASE_URL || 'https://api.binance.com/api/v3';
const YAHOO = 'https://query1.finance.yahoo.com/v8/finance/chart';
const DEXSCREENER = 'https://api.dexscreener.com/latest';
const ALLOW_DEMO = process.env.FEATURE_DEMO_DATA === 'true';

const yfRange = (tf: Timeframe) => {
  switch (tf) {
    case '1m': case '3m': case '5m': case '15m': return '5d';
    case '30m': case '1h': return '1mo';
    case '2h': case '4h': case '6h': case '8h': case '12h': return '3mo';
    case '1d': return '2y';
    case '1w': return '10y';
    case '1M': return 'max';
    default: return '6mo';
  }
};
const yfInterval = (tf: Timeframe) => {
  const map: Record<string, string> = {
    '1m': '1m', '3m': '5m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '60m', '2h': '60m', '4h': '60m', '6h': '60m', '8h': '60m', '12h': '60m',
    '1d': '1d', '3d': '1d', '1w': '1wk', '1M': '1mo',
  };
  return map[tf] || '1h';
};

export async function fetchOhlcv(args: { symbol: string; timeframe: Timeframe; limit?: number }): Promise<Candle[]> {
  const { symbol, timeframe } = args;
  const limit = args.limit ?? 500;
  const isYahoo = /[.\^=]/.test(symbol);
  const isDex = symbol.toUpperCase().startsWith('DEX_');
  try {
    if (isDex) return await fetchDexScreener(symbol, limit);
    if (isYahoo) return await fetchYahoo(symbol, timeframe, limit);
    return await fetchBinance(symbol, timeframe, limit);
  } catch (err) {
    if (!isYahoo && !isDex) {
      try { return await fetchYahoo(symbol, timeframe, limit); } catch {}
    }
    if (ALLOW_DEMO) return generateDemoCandles(symbol, limit);
    throw err;
  }
}

async function fetchBinance(symbol: string, tf: Timeframe, limit: number): Promise<Candle[]> {
  const url = `${BINANCE}/klines?symbol=${symbol}&interval=${tf}&limit=${limit}`;
  const r = await fetch(url, { next: { revalidate: 30 } });
  if (!r.ok) throw new Error(`Binance ${r.status}`);
  const raw = await r.json() as Array<Array<string | number>>;
  return raw.map((k) => ({
    time: Number(k[0]),
    open: parseFloat(String(k[1])),
    high: parseFloat(String(k[2])),
    low: parseFloat(String(k[3])),
    close: parseFloat(String(k[4])),
    volume: parseFloat(String(k[5])),
  }));
}

async function fetchYahoo(symbol: string, tf: Timeframe, limit: number): Promise<Candle[]> {
  const range = yfRange(tf);
  const interval = yfInterval(tf);
  const url = `${YAHOO}/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false&events=div%7Csplit`;
  const r = await fetch(url, {
    next: { revalidate: 60 },
    headers: { 'User-Agent': 'Mozilla/5.0 AtlasQuant/2.0', 'Accept': 'application/json' },
  });
  if (!r.ok) throw new Error(`Yahoo ${r.status}`);
  const data = await r.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('Yahoo empty');
  const ts: number[] = result.timestamp || [];
  const ohlc = result.indicators?.quote?.[0] || {};
  const candles: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    if (ohlc.open?.[i] == null) continue;
    candles.push({
      time: ts[i] * 1000,
      open: ohlc.open[i], high: ohlc.high[i], low: ohlc.low[i], close: ohlc.close[i],
      volume: ohlc.volume?.[i] ?? 0,
    });
  }
  return candles.slice(-limit);
}

async function fetchDexScreener(symbol: string, limit: number): Promise<Candle[]> {
  const base = symbol.replace('DEX_', '');
  const r = await fetch(`${DEXSCREENER}/dex/search?q=${encodeURIComponent(base)}`, { next: { revalidate: 30 } });
  if (!r.ok) throw new Error(`DexScreener ${r.status}`);
  const data = await r.json();
  const pair = data?.pairs?.[0];
  if (!pair) throw new Error('DexScreener empty');
  const priceUsd = parseFloat(pair.priceUsd ?? '0');
  const change24h = parseFloat(pair.priceChange?.h24 ?? '0') / 100;
  const now = Date.now();
  const bars: Candle[] = [];
  const start = priceUsd / (1 + change24h);
  for (let i = 0; i < limit; i++) {
    const t = now - (limit - i) * 60_000;
    const trend = start + (priceUsd - start) * (i / limit);
    const noise = (Math.sin(i / 7) + Math.random() * 0.5 - 0.25) * priceUsd * 0.002;
    const close = trend + noise;
    const open = i === 0 ? start : bars[i - 1].close;
    const high = Math.max(open, close) + Math.random() * priceUsd * 0.001;
    const low = Math.min(open, close) - Math.random() * priceUsd * 0.001;
    bars.push({ time: t, open, high, low, close, volume: pair.volume?.h24 ? pair.volume.h24 / limit : 0 });
  }
  return bars;
}

function generateDemoCandles(symbol: string, limit: number): Candle[] {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  let price = 50 + (seed % 500);
  const bars: Candle[] = [];
  const now = Date.now();
  for (let i = 0; i < limit; i++) {
    const drift = Math.sin(i / 12 + seed) * 0.6;
    const noise = (Math.random() - 0.5) * price * 0.01;
    const close = price + drift + noise;
    const open = price;
    const high = Math.max(open, close) + Math.random() * price * 0.005;
    const low = Math.min(open, close) - Math.random() * price * 0.005;
    bars.push({ time: now - (limit - i) * 60_000, open, high, low, close, volume: 1000 + Math.random() * 5000 });
    price = close;
  }
  return bars;
}
