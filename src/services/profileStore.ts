import type { LanguageCode, ProfileSettings, ThemePreference } from '../types/profile';
import { getJson, removeKey, setJson } from './storage';

const PROFILE_KEY = 'profile.settings.v1';

const defaultSettings = (): ProfileSettings => ({
  alias: '',
  avatarType: 'identicon',
  themePreference: 'system',
  language: 'en',
  updatedAt: new Date().toISOString(),
});

export async function loadProfileSettings(): Promise<ProfileSettings> {
  const stored = await getJson<ProfileSettings>(PROFILE_KEY);
  if (!stored) {
    const defaults = defaultSettings();
    await setJson(PROFILE_KEY, defaults);
    return defaults;
  }
  return stored;
}

export async function saveProfileSettings(
  next: Omit<ProfileSettings, 'updatedAt'> & { updatedAt?: string },
): Promise<ProfileSettings> {
  const saved: ProfileSettings = {
    ...next,
    updatedAt: next.updatedAt ?? new Date().toISOString(),
  };
  await setJson(PROFILE_KEY, saved);
  return saved;
}

export async function clearProfileSettings(): Promise<void> {
  await removeKey(PROFILE_KEY);
}

export function normalizeThemePreference(value?: string): ThemePreference {
  if (value === 'light' || value === 'dark') return value;
  return 'system';
}

export function normalizeLanguage(value?: string): LanguageCode {
  if (value === 'ru' || value === 'ro') return value;
  return 'en';
}
