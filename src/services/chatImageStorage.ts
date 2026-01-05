import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { CHAT_IMAGE_BUCKET, CHAT_IMAGE_SIGNED_URL_TTL_SECONDS } from '@constants/chatImages.constants';
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

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
};

type UploadPayload = {
  body: Uint8Array;
  contentType: string;
  extension: string;
};

const readFileAsUploadPayload = async (fileUri: string): Promise<UploadPayload> => {
  const isLocalUri = fileUri.startsWith('file:') || fileUri.startsWith('content:');

  if (isLocalUri && Platform.OS !== 'web') {
    const extension = getExtension(fileUri);
    const contentType = getContentType(extension);
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: 'base64',
    });
    if (!base64) {
      throw new Error('Unable to read image data.');
    }
    const bytes = base64ToBytes(base64);
    return { body: bytes, contentType, extension };
  }

  if (fileUri.startsWith('data:')) {
    const parsed = parseDataUrl(fileUri);
    if (!parsed) {
      throw new Error('Unsupported data URL format.');
    }
    const extension = parsed.mimeType.split('/')[1] || 'jpg';
    const bytes = base64ToBytes(parsed.base64);
    return { body: bytes, contentType: parsed.mimeType, extension };
  }

  const response = await fetch(fileUri);
  const contentType = response.headers.get('content-type') || getContentType(getExtension(fileUri));
  const extension = contentType.split('/')[1] || getExtension(fileUri);
  const buffer = await response.arrayBuffer();
  return { body: new Uint8Array(buffer), contentType, extension };
};

export async function uploadChatImage({ fileUri, chatId, authorId }: UploadChatImageArgs) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for chat image uploads.');
  }

  const { body, contentType, extension } = await readFileAsUploadPayload(fileUri);
  const owner = authorId ? authorId.replace(/[^a-zA-Z0-9-_]/g, '-') : 'anonymous';
  const path = `${chatId}/${owner}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(CHAT_IMAGE_BUCKET).upload(path, body, {
    cacheControl: '3600',
    upsert: false,
    contentType,
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
