import type { ProfileSettings } from '../types/profile';
import { supabase, isSupabaseConfigured } from './supabaseClient';

type ProfileRow = {
  id: string;
  email: string | null;
  alias: string | null;
  bio: string | null;
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
  return lower.includes('network request failed') || lower.includes('fetch failed') || lower.includes('failed to fetch');
};

export async function fetchRemoteProfile(userId: string): Promise<ProfileSettings | null> {
  return null;
}

export async function upsertRemoteProfile(userId: string, settings: ProfileSettings): Promise<void> {
  return;
}
