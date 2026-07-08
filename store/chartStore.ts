'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Default view = T1MO reference only. The T1MO core lines (Backbone, Magenta,
// TopBox, BtmBox) are ALWAYS drawn by ChartContainer, so the default top panel
// shows exactly the 3 T1MO indicators. EMA_9/EMA_21/VWAP removed (VWAP floats
// far from price on intraday — not part of the T1MO reference).
const DEFAULT_INDICATORS = ['RSI_7', 'ATR', 'VOLUME'];
const DEFAULT_INDICATORS_RESET = ['RSI_7', 'ATR', 'VOLUME'];

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

/** A user-drawn object on the main price chart (trendline / ray / horizontal /
 *  vertical / fib retracement). Anchors are stored in chart space (unix-seconds
 *  time + price) so they stay pinned to the data as the user pans/zooms. */
export interface Drawing {
  id: string;
  type: 'trendline' | 'ray' | 'hline' | 'vline' | 'fib' | 'rectangle' | 'long' | 'short'
      | 'rr' | 'channel' | 'pitchfork' | 'triangle' | 'ellipse'
      | 'text' | 'pricelabel' | 'anchornote' | 'brush' | 'highlighter';
  points: { time: number; price: number }[];
  color: string;
  /** Label content for text / anchornote drawings. */
  text?: string;
}

/** A saved Pine-lite script. `code` is interpreted by the in-app mini engine
 *  (subset of Pine: close/open/high/low/volume, sma/ema/rsi/atr, plot, hline). */
export interface PineScript {
  id: string;
  name: string;
  code: string;
  enabled: boolean;
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
  /** TradingView-style magnet: snap drawing anchors to the nearest bar's OHLC. */
  magnetSnap: boolean;
  rightPanelTab: string;
  /** Stacked oscillator panels (TradingView-style). Each id renders its own sub-chart,
   *  stacked top→bottom and individually removable. 'atlas' = the T1MO Pixel matrix. */
  subPanels: string[];
  showIndicatorModal: boolean;
  fibConfig: FibConfig;
  superRefresh: boolean;
  /** IANA timezone name ('UTC', 'Asia/Tokyo', …) or 'local' for browser zone. */
  timezone: string;
  /** Compare/overlay symbols drawn as normalized (% change) lines on the main chart. */
  compareSymbols: string[];
  /** Bar-replay mode — when active the chart is truncated to `replayIndex` bars. */
  replayActive: boolean;
  /** Index (bar count) the replay is paused at. -1 = full/live (no truncation). */
  replayIndex: number;
  replayPlaying: boolean;
  /** User drawings on the price chart. */
  drawings: Drawing[];
  /** Saved Pine-lite scripts (interpreted + overlaid when enabled). */
  pineScripts: PineScript[];

  setSymbol: (s: string) => void;
  setTimeframe: (tf: string) => void;
  toggleIndicator: (id: string) => void;
  addIndicator: (id: string) => void;
  removeIndicator: (id: string) => void;
  setActiveIndicators: (ids: string[]) => void;
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
  toggleMagnetSnap: () => void;
  setRightPanelTab: (tab: string) => void;
  /** Add an oscillator panel to the stack (no-op if already present). */
  addSubPanel: (p: string) => void;
  /** Remove an oscillator panel from the stack. */
  removeSubPanel: (p: string) => void;
  /** Add the panel if absent, remove it if present (used by the indicator modal). */
  toggleSubPanel: (p: string) => void;
  /** Replace the whole stack (e.g. reset to default). */
  setSubPanels: (p: string[]) => void;
  toggleIndicatorModal: () => void;
  openIndicatorModal: () => void;
  closeIndicatorModal: () => void;
  toggleSuperRefresh: () => void;
  setTimezone: (tz: string) => void;

  addCompareSymbol: (s: string) => void;
  removeCompareSymbol: (s: string) => void;
  clearCompareSymbols: () => void;

  setReplayActive: (on: boolean) => void;
  setReplayIndex: (i: number) => void;
  setReplayPlaying: (p: boolean) => void;

  addDrawing: (d: Drawing) => void;
  updateDrawing: (id: string, patch: Partial<Drawing>) => void;
  removeDrawing: (id: string) => void;
  clearDrawings: () => void;

  addPineScript: (p: PineScript) => void;
  updatePineScript: (id: string, patch: Partial<PineScript>) => void;
  removePineScript: (id: string) => void;
  togglePineScript: (id: string) => void;
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
      magnetSnap: false,
      rightPanelTab: 'signal',
      subPanels: ['atlas'],
      showIndicatorModal: false,
      fibConfig: DEFAULT_FIB_CONFIG,
      superRefresh: false,
      timezone: 'UTC',
      compareSymbols: [],
      replayActive: false,
      replayIndex: -1,
      replayPlaying: false,
      drawings: [],
      pineScripts: [],

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
      setActiveIndicators: (ids) => set({ activeIndicators: [...ids] }),
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
      toggleMagnetSnap: () => set(s => ({ magnetSnap: !s.magnetSnap })),
      setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
      addSubPanel: (p) => set(s => ({
        subPanels: s.subPanels.includes(p) ? s.subPanels : [...s.subPanels, p],
      })),
      removeSubPanel: (p) => set(s => ({
        subPanels: s.subPanels.filter(x => x !== p),
      })),
      toggleSubPanel: (p) => set(s => ({
        subPanels: s.subPanels.includes(p)
          ? s.subPanels.filter(x => x !== p)
          : [...s.subPanels, p],
      })),
      setSubPanels: (subPanels) => set({ subPanels }),
      toggleSuperRefresh: () => set(s => ({ superRefresh: !s.superRefresh })),
      setTimezone: (timezone) => set({ timezone }),

      addCompareSymbol: (s) => set(st => ({
        compareSymbols: st.compareSymbols.includes(s) ? st.compareSymbols : [...st.compareSymbols, s].slice(0, 4),
      })),
      removeCompareSymbol: (s) => set(st => ({ compareSymbols: st.compareSymbols.filter(x => x !== s) })),
      clearCompareSymbols: () => set({ compareSymbols: [] }),

      setReplayActive: (replayActive) => set(replayActive
        ? { replayActive }
        : { replayActive, replayIndex: -1, replayPlaying: false }),
      setReplayIndex: (replayIndex) => set({ replayIndex }),
      setReplayPlaying: (replayPlaying) => set({ replayPlaying }),

      addDrawing: (d) => set(s => ({ drawings: [...s.drawings, d] })),
      updateDrawing: (id, patch) => set(s => ({
        drawings: s.drawings.map(d => (d.id === id ? { ...d, ...patch } : d)),
      })),
      removeDrawing: (id) => set(s => ({ drawings: s.drawings.filter(d => d.id !== id) })),
      clearDrawings: () => set({ drawings: [] }),

      addPineScript: (p) => set(s => ({ pineScripts: [...s.pineScripts, p] })),
      updatePineScript: (id, patch) => set(s => ({
        pineScripts: s.pineScripts.map(p => (p.id === id ? { ...p, ...patch } : p)),
      })),
      removePineScript: (id) => set(s => ({ pineScripts: s.pineScripts.filter(p => p.id !== id) })),
      togglePineScript: (id) => set(s => ({
        pineScripts: s.pineScripts.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
      })),

      toggleIndicatorModal: () => set(s => ({ showIndicatorModal: !s.showIndicatorModal })),
      openIndicatorModal:   () => set({ showIndicatorModal: true }),
      closeIndicatorModal:  () => set({ showIndicatorModal: false }),
    }),
    {
      name: 'atlas-chart-v5',
      partialize: (s) => ({
        symbol: s.symbol,
        timeframe: s.timeframe,
        activeIndicators: s.activeIndicators,
        indicatorParams: s.indicatorParams,
        showSignals: s.showSignals,
        chartType: s.chartType,
        rightPanelTab: s.rightPanelTab,
        subPanels: s.subPanels,
        fibConfig: s.fibConfig,
        timezone: s.timezone,
        compareSymbols: s.compareSymbols,
        drawings: s.drawings,
        pineScripts: s.pineScripts,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ChartStore>;
        const merged = { ...current, ...p } as ChartStore;
        const STRIP = ['EMA_9', 'EMA_21', 'VWAP', 'SMC_OB', 'SMC_FVG'];
        if (Array.isArray(merged.activeIndicators)) {
          merged.activeIndicators = merged.activeIndicators.filter(id => !STRIP.includes(id));
        }
        // Migrate the old singular `subPanel: string` → `subPanels: string[]`.
        // (Pre-multi-window builds persisted a single panel id.)
        const legacySub = (p as any).subPanel;
        if (!Array.isArray(merged.subPanels)) {
          merged.subPanels = typeof legacySub === 'string' && legacySub ? [legacySub] : ['atlas'];
        }
        // Drop any empty/invalid ids; never leave the stack in a broken state.
        merged.subPanels = merged.subPanels.filter(id => typeof id === 'string' && id);
        // New persisted collections — guard against undefined from older snapshots.
        if (!Array.isArray(merged.compareSymbols)) merged.compareSymbols = [];
        if (!Array.isArray(merged.drawings))       merged.drawings = [];
        if (!Array.isArray(merged.pineScripts))    merged.pineScripts = [];
        // Replay is always a fresh session state (never restored as active).
        merged.replayActive = false; merged.replayIndex = -1; merged.replayPlaying = false;
        // Migrate legacy short timezone tokens → IANA names (settings now uses IANA)
        const tzMap: Record<string, string> = { utc: 'UTC', 'gmt+7': 'Asia/Jakarta' };
        if (typeof merged.timezone === 'string' && tzMap[merged.timezone]) {
          merged.timezone = tzMap[merged.timezone];
        }
        return merged;
      },
    }
  )
);
