import type { ProfileSettings } from '../types/profile';
import { supabase, isSupabaseConfigured } from './supabaseClient';

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

const isTransientNetworkError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();
  return lower.includes('network request failed') || lower.includes('fetch failed');
};

export async function fetchRemoteProfile(userId: string): Promise<ProfileSettings | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('alias, avatar_type, avatar_url, avatar_seed, theme_preference, language, updated_at')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();

    if (error) {
      if (isTransientNetworkError(error.message)) {
        return null;
      }
      console.warn('Error fetching remote profile:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      alias: data.alias ?? '',
      avatarType: (data.avatar_type as ProfileSettings['avatarType']) ?? 'identicon',
      avatarUri: data.avatar_url ?? undefined,
      avatarSeed: data.avatar_seed ?? undefined,
      themePreference: (data.theme_preference as ProfileSettings['themePreference']) ?? 'system',
      language: (data.language as ProfileSettings['language']) ?? 'en',
      updatedAt: data.updated_at,
    };
  } catch (error) {
    if (isTransientNetworkError(error)) {
      return null;
    }
    console.warn('Exception fetching remote profile:', error);
    return null;
  }
}

export async function upsertRemoteProfile(userId: string, settings: ProfileSettings): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    console.warn('Supabase not configured, skipping remote profile save');
    return;
  }

  const payload = {
    id: userId,
    alias: settings.alias || null,
    avatar_type: settings.avatarType || 'identicon',
    avatar_url: settings.avatarUri ?? null,
    avatar_seed: settings.avatarSeed ?? null,
    theme_preference: settings.themePreference || 'system',
    language: settings.language || 'en',
    updated_at: settings.updatedAt || new Date().toISOString(),
  };

  const { error } = await supabase.from('user_profiles').upsert(payload, {
    onConflict: 'id',
  });

  if (error) {
    console.error('Error upserting remote profile:', error.message);
    throw new Error(`Failed to save profile: ${error.message}`);
  }
}
