'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle(): React.JSX.Element {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = resolvedTheme === 'dark';
  return (
    <button
      type="button"
      className="grid size-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={mounted && isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={mounted && isDark ? 'Light theme' : 'Dark theme'}
    >
      {mounted && (isDark ? <Sun className="size-5" fill="currentColor" fillOpacity={0.2} /> : <Moon className="size-5" fill="currentColor" fillOpacity={0.2} />)}
    </button>
  );
}
