import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';

const ANON_KEY = 'identity.anonymousId.v1';

const fallbackId = () => `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export async function getAnonymousId(): Promise<string> {
  const stored = await AsyncStorage.getItem(ANON_KEY);
  if (stored) return stored;

  let nextId = '';
  try {
    const installationId = await Application.getInstallationIdAsync();
    if (installationId) {
      nextId = `install_${installationId}`;
    }
  } catch (error) {
    nextId = '';
  }

  if (!nextId) {
    nextId = fallbackId();
  }

  await AsyncStorage.setItem(ANON_KEY, nextId);
  return nextId;
}
