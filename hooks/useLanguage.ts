'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import id from '@/src/i18n/id.json';
import en from '@/src/i18n/en.json';

type Lang = 'id' | 'en';
const translations: Record<Lang, any> = { id, en };

interface LanguageStore {
  lang: Lang;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

export const useLanguage = create<LanguageStore>()(
  persist(
    (set, get) => ({
      lang: (process.env.NEXT_PUBLIC_DEFAULT_LANG as Lang) || 'id',
      t: (key: string) => {
        const lang = get().lang;
        const keys = key.split('.');
        let obj: any = translations[lang];
        for (const k of keys) obj = obj?.[k];
        return typeof obj === 'string' ? obj : key;
      },
      setLang: (lang) => set({ lang }),
      toggle: () => set(s => ({ lang: s.lang === 'id' ? 'en' : 'id' })),
    }),
    { name: 'atlas-lang' }
  )
);
