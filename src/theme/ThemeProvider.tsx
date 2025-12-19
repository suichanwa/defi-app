import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setResolved((prev) => {
        if (preference === 'system') {
          return colorScheme === 'dark' ? 'dark' : 'light';
        }
        return prev;
      });
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, [preference]);

  const setPreference = async (next: ThemePreference) => {
    setPref(next);
    const system = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
    setResolved(next === 'system' ? system : next);
    const settings = await loadProfileSettings();
    await saveProfileSettings({ ...settings, themePreference: next });
  };

  const colors = useMemo(() => (resolved === 'dark' ? darkPalette : lightPalette), [resolved]);

  const value: ThemeContextValue = {
    preference,
    resolved,
    colors,
    setPreference,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
