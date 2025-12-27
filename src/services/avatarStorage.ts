import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase, isSupabaseConfigured } from './supabaseClient';

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

type UploadPayload = {
  body: Uint8Array;
  contentType: string;
  extension: string;
};

const readAvatarPayload = async (fileUri: string): Promise<UploadPayload> => {
  const isLocalUri = fileUri.startsWith('file:') || fileUri.startsWith('content:');

  if (isLocalUri && Platform.OS !== 'web') {
    const extension = fileUri.split('?')[0]?.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = getContentType(extension);
    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: 'base64' });
    if (!base64) {
      throw new Error('Unable to read avatar image data.');
    }
    return { body: base64ToBytes(base64), contentType, extension };
  }

  if (fileUri.startsWith('data:')) {
    const parsed = parseDataUrl(fileUri);
    if (!parsed) {
      throw new Error('Unsupported data URL format.');
    }
    const extension = parsed.mimeType.split('/')[1] || 'jpg';
    return { body: base64ToBytes(parsed.base64), contentType: parsed.mimeType, extension };
  }

  const response = await fetch(fileUri);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const extension = contentType.split('/')[1] || 'jpg';
  const buffer = await response.arrayBuffer();
  return { body: new Uint8Array(buffer), contentType, extension };
};

const AVATAR_BUCKET = 'avatars';

export async function uploadAvatar(userId: string, fileUri: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase is not configured for avatar uploads.');
  }

  const { body, contentType, extension } = await readAvatarPayload(fileUri);
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, body, {
    cacheControl: '3600',
    upsert: true,
    contentType,
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
