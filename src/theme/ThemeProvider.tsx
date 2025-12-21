import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import type { ThemePreference } from '../types/profile';
import { loadProfileSettings, saveProfileSettings } from '../services/profileStore';

type Palette = {
  background: string;
  card: string;
  muted: string;
  text: string;
  nav: string;
  accent: string;
  accentText: string;
  border: string;
  success: string;
  successText: string;
  successBackground: string;
  successBorder: string;
  successCardBackground: string;
  warning: string;
  warningText: string;
  warningBackground: string;
  warningBorder: string;
};

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: 'light' | 'dark';
  colors: Palette;
  setPreference: (next: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const lightPalette: Palette = {
  background: '#ffffff',
  card: '#f8fafc',
  muted: '#475569',
  text: '#0f172a',
  nav: '#e5e7eb',
  accent: '#4f46e5',
  accentText: '#ffffff',
  border: '#cbd5e1',
  success: '#16a34a',
  successText: '#166534',
  successBackground: '#dcfce7',
  successBorder: '#bbf7d0',
  successCardBackground: '#f0fdf4',
  warning: '#d97706',
  warningText: '#b45309',
  warningBackground: '#fffbeb',
  warningBorder: '#fcd34d',
};

const darkPalette: Palette = {
  background: '#0b1220',
  card: '#111827',
  muted: '#94a3b8',
  text: '#e5e7eb',
  nav: '#111827',
  accent: '#8b7bff',
  accentText: '#0b1220',
  border: '#1f2937',
  success: '#22c55e',
  successText: '#86efac',
  successBackground: '#13251a',
  successBorder: '#166534',
  successCardBackground: '#0f1e16',
  warning: '#f59e0b',
  warningText: '#fcd34d',
  warningBackground: '#2b1e0a',
  warningBorder: '#92400e',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPref] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const settings = await loadProfileSettings();
      if (!mounted) return;
      const pref = settings.themePreference ?? 'system';
      setPref(pref);
      const system = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
      setResolved(pref === 'system' ? system : pref);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (preference !== 'system') return;
      setResolved(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => {
      sub.remove();
    };
  }, [preference]);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPref(next);
    const system = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
    setResolved(next === 'system' ? system : next);
    const settings = await loadProfileSettings();
    await saveProfileSettings({ ...settings, themePreference: next });
  }, []);

  const colors = useMemo(() => (resolved === 'dark' ? darkPalette : lightPalette), [resolved]);
  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      colors,
      setPreference,
    }),
    [preference, resolved, colors, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
