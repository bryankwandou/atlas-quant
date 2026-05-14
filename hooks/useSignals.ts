'use client';
import useSWR from 'swr';
import { useState } from 'react';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useSignals(symbol?: string, limit = 20) {
  const url = symbol
    ? `/api/quant/signals?symbol=${symbol}&limit=${limit}`
    : `/api/quant/signals?limit=${limit}`;

  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: false,
  });

  return {
    signals: data?.signals || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useGenerateSignal() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (symbol: string, timeframe: string, strategies?: string[], userPubkey?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quant/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, timeframe, strategies, userPubkey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signal generation failed');
      setResult(data);
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { generate, loading, result, error };
}
