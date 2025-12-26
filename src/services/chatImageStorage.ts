import { CHAT_IMAGE_BUCKET, CHAT_IMAGE_SIGNED_URL_TTL_SECONDS } from '@constants/chatImages';
import { isSupabaseConfigured, supabase } from './supabaseClient';

type UploadChatImageArgs = {
  fileUri: string;
  chatId: string;
  authorId?: string;
};

export async function uploadChatImage({ fileUri, chatId, authorId }: UploadChatImageArgs) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for chat image uploads.');
  }

  const response = await fetch(fileUri);
  const blob = await response.blob();

  const extension = blob.type?.split('/')[1] || 'jpg';
  const owner = authorId ? authorId.replace(/[^a-zA-Z0-9-_]/g, '-') : 'anonymous';
  const path = `${chatId}/${owner}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(CHAT_IMAGE_BUCKET).upload(path, blob, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const signedUrl = await createSignedChatImageUrl(path);
  return { path, signedUrl };
}

export async function createSignedChatImageUrl(path: string, ttlSeconds = CHAT_IMAGE_SIGNED_URL_TTL_SECONDS) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for chat image access.');
  }

  const { data, error } = await supabase.storage.from(CHAT_IMAGE_BUCKET).createSignedUrl(path, ttlSeconds);
  if (error || !data?.signedUrl) {
    throw error ?? new Error('Unable to create a signed chat image URL.');
  }
  return data.signedUrl;
}
