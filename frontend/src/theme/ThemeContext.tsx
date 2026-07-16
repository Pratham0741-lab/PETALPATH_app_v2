import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';
import { storage } from '../utils/storage';
import { lightTheme, darkTheme } from './index';
import type { Theme } from './index';
import type { ThemeMode } from '../types/theme';

const STORAGE_KEY = 'petalpath_theme_mode';

type ThemeContextValue = {
  theme: Theme;
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  reducedMotionEnabled: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [reducedMotionEnabled, setReducedMotionEnabled] = useState(false);
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    storage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotionEnabled);
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotionEnabled,
    );
    return () => listener.remove();
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    storage.setItem(STORAGE_KEY, newMode);
  }, []);

  const resolvedMode = useMemo<'light' | 'dark'>(() => {
    if (mode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
  }, [mode, systemScheme]);

  const isDark = resolvedMode === 'dark';

  const value = useMemo<ThemeContextValue>(() => ({
    theme: isDark ? darkTheme : lightTheme,
    mode,
    resolvedMode,
    setMode,
    isDark,
    reducedMotionEnabled,
  }), [isDark, mode, resolvedMode, setMode, reducedMotionEnabled]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>');
  }
  return ctx;
}
