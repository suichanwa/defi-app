import type { ProfileSettings } from '../types/profile';
import { supabase } from './supabaseClient';

type ProfileRow = {
  id: string;
  email: string | null;
  alias: string | null;
  avatar_type: string | null;
  avatar_url: string | null;
  avatar_seed: string | null;
  theme_preference: string | null;
  language: string | null;
  updated_at: string;
};

export async function fetchRemoteProfile(userId: string): Promise<ProfileSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('alias, avatar_type, avatar_url, avatar_seed, theme_preference, language, updated_at')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error || !data) return null;

  return {
    alias: data.alias ?? '',
    avatarType: (data.avatar_type as ProfileSettings['avatarType']) ?? 'identicon',
    avatarUri: data.avatar_url ?? undefined,
    avatarSeed: data.avatar_seed ?? undefined,
    themePreference: (data.theme_preference as ProfileSettings['themePreference']) ?? 'system',
    language: (data.language as ProfileSettings['language']) ?? 'en',
    updatedAt: data.updated_at,
  };
}

export async function upsertRemoteProfile(userId: string, settings: ProfileSettings): Promise<void> {
  if (!supabase) return;
  const payload = {
    id: userId,
    alias: settings.alias,
    avatar_type: settings.avatarType,
    avatar_url: settings.avatarUri ?? null,
    avatar_seed: settings.avatarSeed,
    theme_preference: settings.themePreference,
    language: settings.language,
    updated_at: settings.updatedAt,
  };
  await supabase.from('user_profiles').upsert(payload);
}
