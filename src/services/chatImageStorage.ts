import * as FileSystem from 'expo-file-system';
import { CHAT_IMAGE_BUCKET, CHAT_IMAGE_SIGNED_URL_TTL_SECONDS } from '@constants/chatImages';
import { isSupabaseConfigured, supabase } from './supabaseClient';

type UploadChatImageArgs = {
  fileUri: string;
  chatId: string;
  authorId?: string;
};

const getExtension = (fileUri: string) => {
  const clean = fileUri.split('?')[0] ?? fileUri;
  const parts = clean.split('.');
  const ext = parts[parts.length - 1];
  return ext ? ext.toLowerCase() : 'jpg';
};

const getContentType = (extension: string) => {
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heic':
      return 'image/heic';
    case 'jpeg':
    case 'jpg':
    default:
      return 'image/jpeg';
  }
};

const base64ToBytes = (base64: string) => {
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  if (typeof Buffer !== 'undefined') {
    return Uint8Array.from(Buffer.from(base64, 'base64'));
  }
  throw new Error('Base64 decoding is not supported in this environment.');
};

const readFileAsBlob = async (fileUri: string) => {
  if (fileUri.startsWith('file:') || fileUri.startsWith('content:')) {
    const extension = getExtension(fileUri);
    const contentType = getContentType(extension);
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const bytes = base64ToBytes(base64);
    return { blob: new Blob([bytes], { type: contentType }), extension };
  }

  const response = await fetch(fileUri);
  const blob = await response.blob();
  const extension = blob.type?.split('/')[1] || getExtension(fileUri);
  return { blob, extension };
};

export async function uploadChatImage({ fileUri, chatId, authorId }: UploadChatImageArgs) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for chat image uploads.');
  }

  const { blob, extension } = await readFileAsBlob(fileUri);
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
