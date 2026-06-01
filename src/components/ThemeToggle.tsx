import React, { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme, type ThemeMode } from './ThemeProvider';

export function ThemeToggle() {
  const { themeMode, theme, setThemeMode, toggleTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<number | null>(null);
  const isLongPress = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDropdown]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const startPress = () => {
    isLongPress.current = false;
    timerRef.current = window.setTimeout(() => {
      isLongPress.current = true;
      setShowDropdown(true);
    }, 500); // 500ms hold time
  };

  const endPress = (e: React.MouseEvent | React.TouchEvent) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // If it wasn't a long press (i.e. was a short click), toggle theme
    if (!isLongPress.current) {
      toggleTheme();
    }
    isLongPress.current = false;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    startPress();
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    endPress(e);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startPress();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Prevent default mouse clicks on touch devices
    e.preventDefault();
    endPress(e);
  };

  const selectMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand)] hover:scale-105 active:scale-95 transition-all select-none rounded-full hover:bg-[var(--chip-bg)] cursor-pointer"
        aria-label="Toggle theme (hold for options)"
        title="Toggle theme (hold for options)"
      >
        {theme === 'light' ? (
          <Sun className="w-5 h-5 transition-transform duration-300 rotate-0" />
        ) : (
          <Moon className="w-5 h-5 transition-transform duration-300 -rotate-12" />
        )}
      </button>

      {showDropdown && (
        <div
          className="absolute right-0 top-full mt-2 w-40 bg-[var(--bg-surface)]/95 backdrop-blur-xl border border-[var(--divider)]/50 rounded-2xl shadow-xl z-50 py-1.5 animate-fade-in"
          style={{ boxShadow: '0 10px 30px -10px rgba(0,0,0,0.15)' }}
        >
          <div className="px-3 py-1 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            Theme Mode
          </div>
          
          <button
            onClick={() => selectMode('light')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--chip-bg)] ${
              themeMode === 'light' ? 'text-[var(--brand)] font-semibold' : 'text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sun className="w-4 h-4" />
              Light
            </span>
            {themeMode === 'light' && <Check className="w-3.5 h-3.5" />}
          </button>
          
          <button
            onClick={() => selectMode('dark')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--chip-bg)] ${
              themeMode === 'dark' ? 'text-[var(--brand)] font-semibold' : 'text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Dark
            </span>
            {themeMode === 'dark' && <Check className="w-3.5 h-3.5" />}
          </button>
          
          <button
            onClick={() => selectMode('auto')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors hover:bg-[var(--chip-bg)] ${
              themeMode === 'auto' ? 'text-[var(--brand)] font-semibold' : 'text-[var(--text-primary)]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Monitor className="w-4 h-4" />
              System (Auto)
            </span>
            {themeMode === 'auto' && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
