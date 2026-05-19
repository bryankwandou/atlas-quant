'use client';
import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

export default function ThemeInitializer() {
  const { theme } = useTheme();
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  return null;
}
