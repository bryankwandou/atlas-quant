'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserStore {
  pubkey: string | null;
  token: string | null;
  riskPerTrade: number;
  maxDailyLoss: number;
  maxTradesDay: number;
  cooldownAfterLoss: number;
  leverageDefault: number;
  setUser: (pubkey: string, token: string) => void;
  logout: () => void;
  updateRisk: (config: Partial<Pick<UserStore, 'riskPerTrade' | 'maxDailyLoss' | 'maxTradesDay' | 'cooldownAfterLoss' | 'leverageDefault'>>) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      pubkey: null,
      token: null,
      riskPerTrade: 1,
      maxDailyLoss: 5,
      maxTradesDay: 10,
      cooldownAfterLoss: 30,
      leverageDefault: 1,
      setUser: (pubkey, token) => set({ pubkey, token }),
      logout: () => set({ pubkey: null, token: null }),
      updateRisk: (config) => set(s => ({ ...s, ...config })),
    }),
    { name: 'atlas-user' }
  )
);
