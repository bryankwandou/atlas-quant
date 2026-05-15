'use client';
import useSWR from 'swr';
import type { AllMacroData } from '@/src/services/macroData';
import type { MacroEnhancedSignal } from '@/src/core/quant/macro-signal';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

// ─────────────────────────────────────────────────────────────────────────────
// OHLCV / PRICE HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useMarketData(symbol: string, timeframe: string, limit = 500) {
  const { data, error, isLoading, mutate } = useSWR(
    symbol
      ? `/api/market/ohlcv?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`
      : null,
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
    symbol ? `/api/market/price?symbol=${symbol}` : null,
    fetcher,
    { refreshInterval: 5000, dedupingInterval: 3000 }
  );
  return { priceData: data, isLoading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// MACRO DATA HOOK — polls /api/macro/data every 5 minutes
// ─────────────────────────────────────────────────────────────────────────────

export interface UseMacroDataReturn {
  macroData: AllMacroData | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

export function useMacroData(): UseMacroDataReturn {
  const { data, error, isLoading, mutate } = useSWR<AllMacroData>(
    '/api/macro/data',
    fetcher,
    {
      refreshInterval: 300_000,       // 5 minutes
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      errorRetryCount: 3,
      errorRetryInterval: 30_000,
    }
  );

  return {
    macroData: data,
    isLoading,
    error,
    mutate,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// QUANT SIGNAL HOOK — polls /api/quant/signals every 60 seconds
// ─────────────────────────────────────────────────────────────────────────────

export interface QuantSignalResponse {
  signal: MacroEnhancedSignal;
  symbol: string;
  timeframe: string;
  savedId: string | null;
  source: 'generated' | 'db';
  macro: {
    score: number;
    bias: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    fearGreed: { value: number; label: string; timestamp: number };
    geopolitical: { score: number; trend: 'rising' | 'falling' | 'stable' };
  };
}

export function useQuantSignal(
  symbol: string,
  timeframe: string,
): {
  signalData: QuantSignalResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
} {
  const { data, error, isLoading, mutate } = useSWR<QuantSignalResponse>(
    symbol && timeframe
      ? `/api/quant/signals?symbol=${symbol}&timeframe=${timeframe}&fresh=true`
      : null,
    fetcher,
    {
      refreshInterval: 60_000,        // 1 minute
      revalidateOnFocus: false,
      dedupingInterval: 30_000,
      errorRetryCount: 2,
      errorRetryInterval: 15_000,
    }
  );

  return { signalData: data, isLoading, error, mutate };
}

// ─────────────────────────────────────────────────────────────────────────────
// REGIME HOOK — polls /api/quant/regime every 2 minutes
// ─────────────────────────────────────────────────────────────────────────────

export interface RegimeResponse {
  symbol: string;
  timeframe: string;
  regime: 'TRENDING' | 'RANGING' | 'VOLATILE' | 'BREAKOUT';
  adx: number;
  rsi: number;
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  macroScore: number;
  macroSignal: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';
  marketBias: 'RISK_ON' | 'RISK_OFF' | 'NEUTRAL';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  finalSignal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
  confidence: number;
  accuracy: number;
  riskFlags: string[];
  macro: {
    fearGreed: number;
    fearGreedLabel: string;
    vix: number | null;
    fedFundsRate: number;
    yieldCurve: number;
    cpi: number;
    geopolitical: number;
    geopoliticalTrend: 'rising' | 'falling' | 'stable';
    hasHighImpactEvent: boolean;
    upcomingCBEvents: Array<{ bank: string; date: string; event: string }>;
  };
  price: number;
  tp1: number; tp2: number; tp3: number;
  sl: number;
  rrRatio: number;
  votes: Array<{ name: string; signal: 'BUY' | 'SELL' | 'NEUTRAL'; weight: number; reason: string }>;
  timestamp: number;
}

export function useRegime(
  symbol: string,
  timeframe: string,
): {
  regimeData: RegimeResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
} {
  const { data, error, isLoading, mutate } = useSWR<RegimeResponse>(
    symbol && timeframe
      ? `/api/quant/regime?symbol=${symbol}&timeframe=${timeframe}`
      : null,
    fetcher,
    {
      refreshInterval: 120_000,       // 2 minutes
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
      errorRetryCount: 2,
    }
  );

  return { regimeData: data, isLoading, error, mutate };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getRefreshInterval(tf: string): number {
  const map: Record<string, number> = {
    '1s':  2_000,
    '15s': 15_000,
    '30s': 30_000,
    '1m':  60_000,
    '3m':  180_000,
    '5m':  300_000,
    '15m': 900_000,
    '30m': 1_800_000,
    '1h':  3_600_000,
    '4h':  14_400_000,
    '1d':  86_400_000,
  };
  return map[tf] || 60_000;
}
