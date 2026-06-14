import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
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

export function ThemeProvider({ children }: PropsWithChildren) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const themeEngine = useThemeEngine(theme);

  useEffect(() => {
    const stored = localStorage.getItem('miyomi-theme-mode') as ThemeMode | null;
    if (stored === 'dark' || stored === 'light' || stored === 'auto') {
      setThemeMode(stored);
    } else {
      // Migrate from old miyomi-theme if exists
      const oldTheme = localStorage.getItem('miyomi-theme');
      if (oldTheme === 'dark' || oldTheme === 'light') {
        setThemeMode(oldTheme);
      } else {
        setThemeMode('auto');
      }
    }
    setMounted(true);
  }, []);

  // Update theme based on themeMode and system preferences
  useEffect(() => {
    if (!mounted) return;

    const determineTheme = (): Theme => {
      if (themeMode === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return themeMode;
    };

    const activeTheme = determineTheme();
    setTheme(activeTheme);

    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    
    // Force a reflow to ensure the transition class is applied before theme change
    void root.offsetHeight;
    
    root.classList.remove('light', 'dark');
    root.classList.add(activeTheme);
    localStorage.setItem('miyomi-theme-mode', themeMode);
    
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [themeMode, mounted]);

  // Listen to system theme changes if mode is 'auto'
  useEffect(() => {
    if (!mounted || themeMode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const activeTheme = mediaQuery.matches ? 'dark' : 'light';
      setTheme(activeTheme);
      const root = document.documentElement;
      root.classList.add('theme-transitioning');
      
      // Force a reflow
      void root.offsetHeight;
      
      root.classList.remove('light', 'dark');
      root.classList.add(activeTheme);
      
      setTimeout(() => {
        root.classList.remove('theme-transitioning');
      }, 300);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [themeMode, mounted]);

  const toggleTheme = () => {
    setThemeMode(prev => {
      if (prev === 'auto') {
        // Toggle to explicit state opposite to active system theme
        return theme === 'light' ? 'dark' : 'light';
      }
      return prev === 'light' ? 'dark' : 'light';
    });
  };

  return (
    <ThemeContext.Provider value={{ themeMode, theme, setThemeMode, toggleTheme }}>
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
