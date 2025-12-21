import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const WEB_PREFIX = 'securestore.web.';
const FALLBACK_PREFIX = 'securestore.fallback.';

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(`${WEB_PREFIX}${key}`, value);
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    await AsyncStorage.removeItem(`${FALLBACK_PREFIX}${key}`);
  } catch (error) {
    console.warn('SecureStore unavailable; falling back to AsyncStorage.', error);
    await AsyncStorage.setItem(`${FALLBACK_PREFIX}${key}`, value);
  }
}

export async function getSecureItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(`${WEB_PREFIX}${key}`);
  }
  try {
    const value = await SecureStore.getItemAsync(key);
    if (value) return value;
  } catch (error) {
    console.warn('SecureStore unavailable; reading fallback from AsyncStorage.', error);
  }
  return AsyncStorage.getItem(`${FALLBACK_PREFIX}${key}`);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(`${WEB_PREFIX}${key}`);
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (error) {
    console.warn('SecureStore unavailable; removing fallback from AsyncStorage.', error);
  }
  await AsyncStorage.removeItem(`${FALLBACK_PREFIX}${key}`);
}
