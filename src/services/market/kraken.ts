/**
 * Kraken public REST — alternative CEX OHLC + ticker for cross-validation
 * against Binance. No auth required.
 * https://docs.kraken.com/rest/
 */

const BASE = 'https://api.kraken.com/0/public';

const INTERVAL_MAP: Record<string, number> = {
  '1m': 1, '5m': 5, '15m': 15, '30m': 30, '1h': 60, '4h': 240, '1d': 1440, '1w': 10080,
};

/** Map common symbols (BTCUSDT) to Kraken's pair codes (XBTUSDT or XXBTZUSD). */
function toKrakenPair(sym: string): string {
  const s = sym.toUpperCase();
  const base = s.replace(/(USDT|USDC|USD|EUR|GBP|JPY)$/, '');
  const quoteMatch = s.match(/(USDT|USDC|USD|EUR|GBP|JPY)$/);
  const quote = quoteMatch?.[0] ?? 'USDT';
  const baseMapped = base === 'BTC' ? 'XBT' : base;
  return `${baseMapped}${quote}`;
}

export async function getKrakenOHLC(symbol: string, timeframe: string, limit = 200): Promise<Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>> {
  const pair = toKrakenPair(symbol);
  const interval = INTERVAL_MAP[timeframe] ?? 60;
  try {
    const res = await fetch(`${BASE}/OHLC?pair=${pair}&interval=${interval}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    const errors = data?.error ?? [];
    if (errors.length > 0) return [];
    const result = data?.result ?? {};
    const key = Object.keys(result).find((k) => Array.isArray(result[k])) ?? '';
    const ohlc = result[key] as Array<[number, string, string, string, string, string, string, number]>;
    if (!Array.isArray(ohlc)) return [];
    return ohlc.slice(-limit).map((r) => ({
      time: r[0],
      open: parseFloat(r[1]),
      high: parseFloat(r[2]),
      low: parseFloat(r[3]),
      close: parseFloat(r[4]),
      volume: parseFloat(r[6]),
    }));
  } catch {
    return [];
  }
}

export async function getKrakenTicker(symbol: string): Promise<{ price: number; volume24h: number; high24h: number; low24h: number } | null> {
  const pair = toKrakenPair(symbol);
  try {
    const res = await fetch(`${BASE}/Ticker?pair=${pair}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.result ?? {};
    const key = Object.keys(result)[0];
    if (!key) return null;
    const t = result[key];
    return {
      price: parseFloat(t?.c?.[0] ?? '0'),
      volume24h: parseFloat(t?.v?.[1] ?? '0'),
      high24h: parseFloat(t?.h?.[1] ?? '0'),
      low24h: parseFloat(t?.l?.[1] ?? '0'),
    };
  } catch {
    return null;
  }
}
