'use client';
import { create } from 'zustand';

interface MarketStore {
  livePrice: Record<string, number>;
  liveChange: Record<string, number>;
  setPrice: (symbol: string, price: number) => void;
  setChange: (symbol: string, change: number) => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  livePrice: {},
  liveChange: {},
  setPrice:  (symbol, price)  => set(s => ({ livePrice:  { ...s.livePrice,  [symbol]: price  } })),
  setChange: (symbol, change) => set(s => ({ liveChange: { ...s.liveChange, [symbol]: change } })),
}));
