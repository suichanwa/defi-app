import { supabase, isSupabaseConfigured } from './supabaseClient';

const AVATAR_BUCKET = 'avatars';

export async function uploadAvatar(userId: string, fileUri: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for avatar uploads.');
  }

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const extension = blob.type?.split('/')[1] || 'jpg';
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, blob, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Unable to retrieve avatar URL.');
  }
  return data.publicUrl;
}
