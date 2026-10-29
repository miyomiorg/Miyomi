import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { useThemeEngine, ThemeEngineContext } from '@/hooks/useThemeEngine';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type Theme = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Same key/values /theme-init.js reads before first paint.
const MODE_KEY = 'miyomi-theme-mode';

function readStoredMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'auto') return stored;
    const legacy = localStorage.getItem('miyomi-theme');
    if (legacy === 'dark' || legacy === 'light') return legacy;
  } catch {
    // Storage unavailable — fall through to auto.
  }
  return 'auto';
}

const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const resolveTheme = (mode: ThemeMode): Theme => (mode === 'auto' ? systemTheme() : mode);

/** Swap the html class; animate only for user-initiated changes. */
function applyTheme(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (root.classList.contains(theme) && !root.classList.contains(theme === 'dark' ? 'light' : 'dark')) return;
  if (animate) {
    root.classList.add('theme-transitioning');
    window.setTimeout(() => root.classList.remove('theme-transitioning'), 300);
  }
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

export function ThemeProvider({ children }: PropsWithChildren) {
  // Initialised synchronously from storage so the first render already
  // matches what /theme-init.js painted (no light→dark flash).
  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredMode);
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readStoredMode()));
  const themeEngine = useThemeEngine(theme);
  const isFirstApply = useRef(true);

  useEffect(() => {
    const active = resolveTheme(themeMode);
    setTheme(active);
    applyTheme(active, !isFirstApply.current);
    isFirstApply.current = false;
    try { localStorage.setItem(MODE_KEY, themeMode); } catch { /* optional */ }
  }, [themeMode]);

  // Follow the OS setting while in auto mode.
  useEffect(() => {
    if (themeMode !== 'auto') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const active: Theme = mediaQuery.matches ? 'dark' : 'light';
      setTheme(active);
      applyTheme(active, true);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode]);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const current = resolveTheme(prev);
      return current === 'light' ? 'dark' : 'light';
    });
  }, []);

  const value = useMemo(() => ({ themeMode, theme, setThemeMode, toggleTheme }), [themeMode, theme, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <ThemeEngineContext.Provider value={themeEngine}>
        {children}
      </ThemeEngineContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
