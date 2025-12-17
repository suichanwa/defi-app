import type { ProfileSettings } from '../types/profile';
import { supabase } from './supabaseClient';

type ProfileRow = {
  id: string;
  email: string | null;
  alias: string | null;
  avatar_type: string | null;
  avatar_seed: string | null;
  theme_preference: string | null;
  updated_at: string;
};

export async function fetchRemoteProfile(userId: string): Promise<ProfileSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_profiles')
    .select('alias, avatar_type, avatar_seed, theme_preference, updated_at')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();

  if (error || !data) return null;

  return {
    alias: data.alias ?? '',
    avatarType: (data.avatar_type as ProfileSettings['avatarType']) ?? 'identicon',
    avatarSeed: data.avatar_seed ?? undefined,
    themePreference: (data.theme_preference as ProfileSettings['themePreference']) ?? 'system',
    updatedAt: data.updated_at,
  };
}

export async function upsertRemoteProfile(userId: string, settings: ProfileSettings): Promise<void> {
  if (!supabase) return;
  const payload = {
    id: userId,
    alias: settings.alias,
    avatar_type: settings.avatarType,
    avatar_seed: settings.avatarSeed,
    theme_preference: settings.themePreference,
    updated_at: settings.updatedAt,
  };
  await supabase.from('user_profiles').upsert(payload);
}
