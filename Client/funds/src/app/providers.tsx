"use client";
import { useEffect } from 'react';

export function ThemeProviderInit() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const theme = stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);
  return null;
}
