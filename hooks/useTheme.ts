'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: (process.env.NEXT_PUBLIC_DEFAULT_THEME as Theme) || 'dark',
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      },
      toggle: () => set(s => {
        const next = s.theme === 'light' ? 'dark' : 'light';
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', next);
        }
        return { theme: next };
      }),
    }),
    { name: 'atlas-theme-v3' }  // bumped: forces dark default for all users
  )
);
