/**
 * KuCoin public REST — additional CEX OHLCV / ticker. No auth required.
 * https://docs.kucoin.com/
 */

const BASE = 'https://api.kucoin.com/api/v1';

const INTERVAL_MAP: Record<string, string> = {
  '1m': '1min', '3m': '3min', '5m': '5min', '15m': '15min', '30m': '30min',
  '1h': '1hour', '2h': '2hour', '4h': '4hour', '6h': '6hour', '8h': '8hour',
  '12h': '12hour', '1d': '1day', '1w': '1week',
};

function toKuPair(sym: string): string {
  const s = sym.toUpperCase();
  if (s.endsWith('USDT')) return `${s.slice(0, -4)}-USDT`;
  if (s.endsWith('USDC')) return `${s.slice(0, -4)}-USDC`;
  if (s.endsWith('BTC'))  return `${s.slice(0, -3)}-BTC`;
  return s;
}

export async function getKuCoinOHLC(symbol: string, timeframe: string, limit = 200): Promise<Array<{ time: number; open: number; high: number; low: number; close: number; volume: number }>> {
  const pair = toKuPair(symbol);
  const interval = INTERVAL_MAP[timeframe] ?? '1hour';
  try {
    const res = await fetch(`${BASE}/market/candles?type=${interval}&symbol=${pair}`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.code !== '200000') return [];
    const list = (data?.data ?? []) as Array<string[]>;
    return list
      .slice(0, limit)
      .reverse()
      .map((r) => ({
        time: parseInt(r[0], 10),
        open: parseFloat(r[1]),
        close: parseFloat(r[2]),
        high: parseFloat(r[3]),
        low: parseFloat(r[4]),
        volume: parseFloat(r[5]),
      }));
  } catch {
    return [];
  }
}

export async function getKuCoinTicker(symbol: string): Promise<{ price: number; volume24h: number; pct24h: number } | null> {
  const pair = toKuPair(symbol);
  try {
    const res = await fetch(`${BASE}/market/stats?symbol=${pair}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== '200000') return null;
    const d = data?.data;
    return {
      price: parseFloat(d?.last ?? '0'),
      volume24h: parseFloat(d?.volValue ?? '0'),
      pct24h: parseFloat(d?.changeRate ?? '0') * 100,
    };
  } catch {
    return null;
  }
}
