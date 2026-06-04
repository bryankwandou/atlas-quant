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
    // sub-minute: served from Neon (off-Vercel collector accumulates real 1s history)
    '1s': 20000, '5s': 6000, '10s': 3000, '15s': 2000, '30s': 1500, '45s': 1000,
    // minutes: ~3.5 days on 1m, ~14 days on 5m, ~21 days on 15m
    '1m': 2000, '2m': 2000, '3m': 2000, '5m': 2000,
    '10m': 2000, '15m': 2000, '30m': 2000, '45m': 2000,
    // hours: 5000 bars → ~208 days on 1h, ~833 days on 4h (~2017-now for 4h)
    '1h': 5000, '2h': 5000, '3h': 5000, '4h': 5000,
    '6h': 5000, '8h': 5000, '12h': 5000, '18h': 5000,
    // days/weeks: 5000 daily bars covers 2010-now
    '1d': 5000, '2d': 5000, '3d': 5000, '5d': 5000,
    '1w': 1000, '2w': 1000, '3w': 1000,
    '1M': 500, '3M': 200, '6M': 100, '12M': 50,
  };
  return map[tf] ?? 1000;
}

const SUB_MIN_TFS = ['1s', '5s', '10s', '15s', '30s', '45s'];

export function useMarketData(symbol: string, timeframe: string, limit?: number) {
  const superRefresh = useChartStore(s => s.superRefresh);
  const resolvedLimit = limit ?? getLimit(timeframe);
  const subMin = SUB_MIN_TFS.includes(timeframe);
  // For sub-minute we DON'T refetch the full (up to 20k-bar) history every second —
  // useLiveBars() handles per-second last-bar updates. History refreshes every 20s.
  const refreshInterval = subMin ? 20_000 : (superRefresh ? 1000 : getRefreshInterval(timeframe));
  const { data, error, isLoading, mutate } = useSWR(
    symbol
      ? `/api/market/ohlcv?symbol=${symbol}&timeframe=${timeframe}&limit=${resolvedLimit}`
      : null,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: false,
      keepPreviousData: true,            // no flicker / empty-array between polls
      dedupingInterval: subMin ? 10_000 : (superRefresh ? 500 : 5000),
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

/**
 * Lightweight live-tick hook (TradingView-style). Polls /api/market/last (just
 * the last ~3 bars) every second for sub-minute / super-refresh, so the chart
 * updates the latest candle via series.update() without refetching all history.
 */
export function useLiveBars(symbol: string, timeframe: string) {
  const superRefresh = useChartStore(s => s.superRefresh);
  const subMin = SUB_MIN_TFS.includes(timeframe);
  const active = subMin || superRefresh;
  const interval = subMin ? 1000 : (superRefresh ? 1000 : getRefreshInterval(timeframe));
  const { data } = useSWR(
    active && symbol ? `/api/market/last?symbol=${symbol}&timeframe=${timeframe}` : null,
    fetcher,
    { refreshInterval: interval, revalidateOnFocus: false, dedupingInterval: 500 },
  );
  return { liveBars: (data?.data as any[]) || [] };
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
