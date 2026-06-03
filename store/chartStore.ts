'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_INDICATORS = ['EMA_9', 'EMA_21', 'VWAP', 'RSI_7', 'ATR', 'VOLUME'];
const DEFAULT_INDICATORS_RESET = ['EMA_9', 'EMA_21', 'VWAP', 'RSI_7', 'ATR', 'VOLUME'];

/** Custom Fibonacci level definition — used by the Fib R:R tool. */
export interface FibLevel {
  ratio: number;
  enabled: boolean;
  color: string;
  label?: string;
}

export interface FibConfig {
  anchorLow?: { time: number; price: number } | null;
  anchorHigh?: { time: number; price: number } | null;
  levels: FibLevel[];
  trendLineColor: string;
  trendLineDashed: boolean;
  levelsLineColor: string;
  extend: 'none' | 'right' | 'both';
  direction: 'long' | 'short';
}

export const DEFAULT_FIB_RR_LEVELS: FibLevel[] = [
  { ratio: -0.5, enabled: true,  color: '#f23645', label: 'SL' },
  { ratio:  0,   enabled: true,  color: '#f23645', label: 'Entry Low' },
  { ratio:  0.5, enabled: true,  color: '#f23645', label: '0.5R' },
  { ratio:  1,   enabled: true,  color: '#22c55e', label: '1R · Entry High' },
  { ratio:  1.5, enabled: true,  color: '#22c55e', label: '1.5R' },
  { ratio:  2,   enabled: true,  color: '#22c55e', label: '2R' },
  { ratio:  2.5, enabled: true,  color: '#22c55e', label: '2.5R' },
  { ratio:  3,   enabled: true,  color: '#22c55e', label: '3R' },
  { ratio:  3.5, enabled: true,  color: '#22c55e', label: '3.5R · TP' },
  { ratio:  4,   enabled: false, color: '#22c55e', label: '4R' },
];

const DEFAULT_FIB_CONFIG: FibConfig = {
  anchorLow: null,
  anchorHigh: null,
  levels: DEFAULT_FIB_RR_LEVELS,
  trendLineColor: '#2a2e39',
  trendLineDashed: true,
  levelsLineColor: '#1d4ed8',
  extend: 'right',
  direction: 'long',
};

interface ChartStore {
  symbol: string;
  timeframe: string;
  activeIndicators: string[];
  indicatorParams: Record<string, Record<string, number | string | boolean>>;
  showSignals: boolean;
  chartType: string;
  drawingTool: string;
  rightPanelTab: string;
  subPanel: string;
  showIndicatorModal: boolean;
  fibConfig: FibConfig;
  superRefresh: boolean;
  timezone: 'local' | 'utc' | 'gmt+7';

  setSymbol: (s: string) => void;
  setTimeframe: (tf: string) => void;
  toggleIndicator: (id: string) => void;
  addIndicator: (id: string) => void;
  removeIndicator: (id: string) => void;
  resetIndicators: () => void;
  setIndicatorParam: (id: string, key: string, value: number | string | boolean) => void;
  setIndicatorParams: (id: string, params: Record<string, number | string | boolean>) => void;
  clearIndicatorParams: (id: string) => void;
  setFibConfig: (cfg: Partial<FibConfig>) => void;
  setFibAnchor: (which: 'low' | 'high', anchor: { time: number; price: number } | null) => void;
  setFibLevel: (ratio: number, patch: Partial<FibLevel>) => void;
  resetFibLevels: () => void;
  toggleSignals: () => void;
  setChartType: (t: string) => void;
  setDrawingTool: (t: string) => void;
  setRightPanelTab: (tab: string) => void;
  setSubPanel: (p: string) => void;
  toggleIndicatorModal: () => void;
  openIndicatorModal: () => void;
  closeIndicatorModal: () => void;
  toggleSuperRefresh: () => void;
  setTimezone: (tz: 'local' | 'utc' | 'gmt+7') => void;
}

export const useChartStore = create<ChartStore>()(
  persist(
    (set) => ({
      symbol: process.env.NEXT_PUBLIC_DEFAULT_SYMBOL || 'BTCUSDT',
      timeframe: '15m',
      activeIndicators: [...DEFAULT_INDICATORS],
      indicatorParams: {},
      showSignals: true,
      chartType: 'candlestick',
      drawingTool: 'cursor',
      rightPanelTab: 'signal',
      subPanel: 'atlas',
      showIndicatorModal: false,
      fibConfig: DEFAULT_FIB_CONFIG,
      superRefresh: false,
      timezone: 'utc',

      setSymbol:    (symbol)    => set({ symbol }),
      setTimeframe: (timeframe) => set({ timeframe }),

      toggleIndicator: (id) => set(s => ({
        activeIndicators: s.activeIndicators.includes(id)
          ? s.activeIndicators.filter(i => i !== id)
          : [...s.activeIndicators, id],
      })),
      addIndicator: (id) => set(s => ({
        activeIndicators: s.activeIndicators.includes(id)
          ? s.activeIndicators
          : [...s.activeIndicators, id],
      })),
      removeIndicator: (id) => set(s => ({
        activeIndicators: s.activeIndicators.filter(i => i !== id),
      })),
      resetIndicators: () => set({ activeIndicators: [...DEFAULT_INDICATORS_RESET] }),

      setIndicatorParam: (id, key, value) => set(s => ({
        indicatorParams: {
          ...s.indicatorParams,
          [id]: { ...(s.indicatorParams[id] ?? {}), [key]: value },
        },
      })),
      setIndicatorParams: (id, params) => set(s => ({
        indicatorParams: { ...s.indicatorParams, [id]: { ...params } },
      })),
      clearIndicatorParams: (id) => set(s => {
        const next = { ...s.indicatorParams };
        delete next[id];
        return { indicatorParams: next };
      }),

      setFibConfig: (cfg) => set(s => ({ fibConfig: { ...s.fibConfig, ...cfg } })),
      setFibAnchor: (which, anchor) => set(s => ({
        fibConfig: { ...s.fibConfig, [which === 'low' ? 'anchorLow' : 'anchorHigh']: anchor },
      })),
      setFibLevel: (ratio, patch) => set(s => ({
        fibConfig: {
          ...s.fibConfig,
          levels: s.fibConfig.levels.map(l => (l.ratio === ratio ? { ...l, ...patch } : l)),
        },
      })),
      resetFibLevels: () => set(s => ({ fibConfig: { ...s.fibConfig, levels: DEFAULT_FIB_RR_LEVELS } })),

      toggleSignals: () => set(s => ({ showSignals: !s.showSignals })),
      setChartType:  (chartType)   => set({ chartType }),
      setDrawingTool: (drawingTool) => set({ drawingTool }),
      setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
      setSubPanel: (subPanel) => set({ subPanel }),
      toggleSuperRefresh: () => set(s => ({ superRefresh: !s.superRefresh })),
      setTimezone: (timezone) => set({ timezone }),

      toggleIndicatorModal: () => set(s => ({ showIndicatorModal: !s.showIndicatorModal })),
      openIndicatorModal:   () => set({ showIndicatorModal: true }),
      closeIndicatorModal:  () => set({ showIndicatorModal: false }),
    }),
    {
      name: 'atlas-chart-v2',
      partialize: (s) => ({
        symbol: s.symbol,
        timeframe: s.timeframe,
        activeIndicators: s.activeIndicators,
        indicatorParams: s.indicatorParams,
        showSignals: s.showSignals,
        chartType: s.chartType,
        rightPanelTab: s.rightPanelTab,
        subPanel: s.subPanel,
        fibConfig: s.fibConfig,
      }),
    }
  )
);
