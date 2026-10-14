'use client';

import { useEffect, useState } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = saved ? saved === 'dark' : prefersDark;

    setIsDark(shouldBeDark);
    document.documentElement.className = shouldBeDark ? 'dark' : 'light';
  }, []);

  const toggle = () => {
    if (!mounted) return;
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
    document.documentElement.className = newDark ? 'dark' : 'light';
  };

  return { isDark, toggle, mounted };
}
