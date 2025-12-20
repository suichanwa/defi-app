import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const ANON_KEY = 'identity.anonymousId.v1';
const ANON_PROFILE_PREFIX = 'anon_';

const fallbackId = () => `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const fnv1a32 = (input: string, seed = 0x811c9dc5) => {
  let hash = seed;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash >>> 0;
};

const hashToHex = (input: string) => {
  const parts = [
    fnv1a32(input, 0x811c9dc5),
    fnv1a32(`chat:${input}`, 0x01000193),
    fnv1a32(`${input}:profile`, 0x9e3779b9),
    fnv1a32(`seed:${input}`, 0x85ebca6b),
  ];
  return parts.map((part) => part.toString(16).padStart(8, '0')).join('');
};

export function toAnonymousProfileId(anonId: string): string {
  const trimmed = anonId.trim();
  if (!trimmed) return `${ANON_PROFILE_PREFIX}unknown`;
  return `${ANON_PROFILE_PREFIX}${hashToHex(trimmed)}`;
}

const getDeviceScopedId = async (): Promise<string> => {
  try {
    if (Platform.OS === 'android') {
      const androidId = Application.getAndroidId();
      if (androidId) return `android_${androidId}`;
      const referrer = await Application.getInstallReferrerAsync();
      if (referrer) return `ref_${referrer}`;
    } else if (Platform.OS === 'ios') {
      const vendorId = await Application.getIosIdForVendorAsync();
      if (vendorId) return `ios_${vendorId}`;
    }
  } catch {
    // fall through to fallbackId
  }
  return '';
};

export async function getAnonymousId(): Promise<string> {
  const stored = await AsyncStorage.getItem(ANON_KEY);
  if (stored) return stored;

  let nextId = '';
  try {
    nextId = await getDeviceScopedId();
  } catch (error) {
    nextId = '';
  }

  if (!nextId) {
    nextId = fallbackId();
  }

  await AsyncStorage.setItem(ANON_KEY, nextId);
  return nextId;
}
