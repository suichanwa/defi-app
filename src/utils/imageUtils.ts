import { Platform } from 'react-native';

/**
 * Check if a URI is a local file path that won't work on web
 */
export function isLocalFileUri(uri?: string): boolean {
  if (!uri) return false;
  return uri.startsWith('file://') || uri.startsWith('/data/');
}

/**
 * Get a displayable URI - returns undefined for local files on web
 * This prevents the "Not allowed to load local resource" error
 */
export function getDisplayableUri(uri?: string): string | undefined {
  if (!uri) return undefined;
  
  // On web, local file:// URIs cannot be displayed
  if (Platform.OS === 'web' && isLocalFileUri(uri)) {
    return undefined;
  }
  
  return uri;
}

/**
 * Check if we should show a fallback avatar instead of custom image
 */
export function shouldUseFallbackAvatar(uri?: string): boolean {
  if (!uri) return true;
  if (Platform.OS === 'web' && isLocalFileUri(uri)) return true;
  return false;
}
