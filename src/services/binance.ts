const BINANCE_BASE = process.env.BINANCE_BASE_URL || 'https://api.binance.com/api/v3';

export async function fetchKlines(
  symbol: string, interval: string, limit = 500
): Promise<any[]> {
  const res = await fetch(
    `${BINANCE_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    { next: { revalidate: getRevalidate(interval) } }
  );
  if (!res.ok) throw new Error(`Binance klines error: ${res.status}`);
  const raw = await res.json();
  return raw.map((k: any[]) => ({
    open_time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
    low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
    close_time: k[6], quote_volume: parseFloat(k[7]), trades_count: k[8],
  }));
}

export async function fetchTicker(symbol: string) {
  const res = await fetch(`${BINANCE_BASE}/ticker/24hr?symbol=${symbol}`, {
    next: { revalidate: 10 },
  });
  if (!res.ok) throw new Error(`Binance ticker error: ${res.status}`);
  return res.json();
}

export async function fetchPrice(symbol: string): Promise<number> {
  const res = await fetch(`${BINANCE_BASE}/ticker/price?symbol=${symbol}`, {
    next: { revalidate: 5 },
  });
  if (!res.ok) throw new Error(`Binance price error: ${res.status}`);
  const data = await res.json();
  return parseFloat(data.price);
}

export async function fetchAllTickers(): Promise<any[]> {
  const res = await fetch(`${BINANCE_BASE}/ticker/24hr`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Binance all tickers error: ${res.status}`);
  return res.json();
}

export async function fetchExchangeInfo(): Promise<any> {
  const res = await fetch(`${BINANCE_BASE}/exchangeInfo`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Binance exchangeInfo error: ${res.status}`);
  return res.json();
}

function getRevalidate(interval: string): number {
  const map: Record<string, number> = {
    '1s': 1, '1m': 60, '3m': 180, '5m': 300, '15m': 900,
    '30m': 1800, '1h': 3600, '2h': 7200, '4h': 14400, '1d': 86400,
  };
  return map[interval] || 60;
}
