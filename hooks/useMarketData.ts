'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useMarketData(symbol: string, timeframe: string, limit = 500) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/market/ohlcv?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`,
    fetcher,
    {
      refreshInterval: getRefreshInterval(timeframe),
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    candles: data?.data || [],
    source: data?.source,
    count: data?.count || 0,
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useMarketPrice(symbol: string) {
  const { data, error, isLoading } = useSWR(
    `/api/market/price?symbol=${symbol}`,
    fetcher,
    { refreshInterval: 5000, dedupingInterval: 3000 }
  );
  return { priceData: data, isLoading, error };
}

function getRefreshInterval(tf: string): number {
  const map: Record<string, number> = {
    '1s': 2000, '15s': 15000, '30s': 30000,
    '1m': 60000, '3m': 180000, '5m': 300000,
    '15m': 900000, '30m': 1800000,
    '1h': 3600000, '4h': 14400000, '1d': 86400000,
  };
  return map[tf] || 60000;
}
