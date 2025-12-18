import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY = 'wallet.biometric.password';

export const canUseBiometrics = async (): Promise<boolean> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
};

export const promptBiometric = async (reason = 'Unlock wallet') => {
  return LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    cancelLabel: 'Cancel',
    fallbackLabel: 'Use password',
  });
};

export const saveBiometricPassword = async (password: string) => {
  try {
    await SecureStore.setItemAsync(KEY, password, { requireAuthentication: true });
  } catch {
    // Ignore failures to avoid blocking UX.
  }
};

export const getBiometricPassword = async (): Promise<string | null> => {
  try {
    const value = await SecureStore.getItemAsync(KEY, { requireAuthentication: true });
    return value ?? null;
  } catch {
    return null;
  }
};

export const clearBiometricPassword = async () => {
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Ignore.
  }
};
