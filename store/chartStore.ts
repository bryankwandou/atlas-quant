'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_INDICATORS = ['EMA_9', 'EMA_21', 'VWAP', 'RSI_7', 'ATR', 'VOLUME'];
const DEFAULT_INDICATORS_RESET = ['EMA_9', 'EMA_21', 'VWAP', 'RSI_7', 'ATR', 'VOLUME'];

interface ChartStore {
  symbol: string;
  timeframe: string;
  activeIndicators: string[];
  showSignals: boolean;
  chartType: string;
  drawingTool: string;
  rightPanelTab: string;
  subPanel: string;
  showIndicatorModal: boolean;

  setSymbol: (s: string) => void;
  setTimeframe: (tf: string) => void;
  toggleIndicator: (id: string) => void;
  addIndicator: (id: string) => void;
  removeIndicator: (id: string) => void;
  resetIndicators: () => void;
  toggleSignals: () => void;
  setChartType: (t: string) => void;
  setDrawingTool: (t: string) => void;
  setRightPanelTab: (tab: string) => void;
  setSubPanel: (p: string) => void;
  toggleIndicatorModal: () => void;
  openIndicatorModal: () => void;
  closeIndicatorModal: () => void;
}

export const useChartStore = create<ChartStore>()(
  persist(
    (set) => ({
      symbol: process.env.NEXT_PUBLIC_DEFAULT_SYMBOL || 'BTCUSDT',
      timeframe: '15m',
      activeIndicators: [...DEFAULT_INDICATORS],
      showSignals: true,
      chartType: 'candlestick',
      drawingTool: 'cursor',
      rightPanelTab: 'signal',
      subPanel: 'atlas',
      showIndicatorModal: false,

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

      toggleSignals: () => set(s => ({ showSignals: !s.showSignals })),
      setChartType:  (chartType)   => set({ chartType }),
      setDrawingTool: (drawingTool) => set({ drawingTool }),
      setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
      setSubPanel: (subPanel) => set({ subPanel }),

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
        showSignals: s.showSignals,
        chartType: s.chartType,
        rightPanelTab: s.rightPanelTab,
        subPanel: s.subPanel,
      }),
    }
  )
);
