'use client';
import useSWR from 'swr';
import { useChartStore } from '@/store/chartStore';
import type { AllMacroData } from '@/src/services/macroData';
import type { MacroEnhancedSignal } from '@/src/core/quant/macro-signal';

const fetcher = (url: string) => fetch(url).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
});

// ─────────────────────────────────────────────────────────────────────────────
// OHLCV / PRICE HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a limit appropriate for the timeframe — enough history without waste. */
function getLimit(tf: string): number {
  const map: Record<string, number> = {
    '1s': 500, '15s': 500, '30s': 500, '45s': 500,
    '1m': 1000, '3m': 1000, '5m': 1000,
    '10m': 1000, '15m': 1000, '30m': 1000, '45m': 1000,
    '1h': 1500, '2h': 1500, '3h': 1000, '4h': 2000,
    '6h': 1000, '8h': 1000, '12h': 1000,
    '1d': 3000, '2d': 1500, '3d': 1000,
    '1w': 1000, '2w': 500,
    '1M': 360, '3M': 120, '6M': 60, '12M': 30,
  };
  return map[tf] ?? 1000;
}

export function useMarketData(symbol: string, timeframe: string, limit?: number) {
  const superRefresh = useChartStore(s => s.superRefresh);
  const resolvedLimit = limit ?? getLimit(timeframe);
  const refreshInterval = superRefresh ? 1000 : getRefreshInterval(timeframe);
  const { data, error, isLoading, mutate } = useSWR(
    symbol
      ? `/api/market/ohlcv?symbol=${symbol}&timeframe=${timeframe}&limit=${resolvedLimit}`
      : null,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      dedupingInterval: superRefresh ? 500 : 5000,
    }
  );

  return {
    candles: data?.data || [],
    source: data?.source,
    count: data?.count || 0,
    marketClosed: data?.marketClosed || false,
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
    '1s':   1_000,
    '15s':  15_000,
    '30s':  30_000,
    '45s':  45_000,
    '1m':   60_000,
    '3m':   180_000,
    '5m':   300_000,
    '10m':  600_000,
    '15m':  900_000,
    '30m':  1_800_000,
    '45m':  2_700_000,
    '1h':   3_600_000,
    '2h':   7_200_000,
    '3h':   10_800_000,
    '4h':   14_400_000,
    '6h':   21_600_000,
    '8h':   28_800_000,
    '12h':  43_200_000,
    '1d':   86_400_000,
    '2d':   172_800_000,
    '3d':   259_200_000,
    '1w':   604_800_000,
    '2w':   1_209_600_000,
    '1M':   2_592_000_000,
    '3M':   7_776_000_000,
    '6M':   15_552_000_000,
    '12M':  31_104_000_000,
  };
  return map[tf] || 60_000;
}
