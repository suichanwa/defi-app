import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const ANON_KEY = 'identity.anonymousId.v1';

const fallbackId = () => `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

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
