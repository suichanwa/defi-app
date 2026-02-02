import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_PASSWORD_KEY = 'wallet.biometric.password';

/**
 * Store password for biometric authentication
 */
export async function saveBiometricPassword(password: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, password);
  } catch (error) {
    console.error('Failed to save biometric password:', error);
    throw error;
  }
}

/**
 * Retrieve stored password for biometric authentication
 */
export async function getBiometricPassword(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);
  } catch (error) {
    console.error('Failed to get biometric password:', error);
    return null;
  }
}

/**
 * Clear stored biometric password
 */
export async function clearBiometricPassword(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY);
  } catch (error) {
    console.error('Failed to clear biometric password:', error);
  }
}

/**
 * Check if biometric authentication is available
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    // expo-secure-store is always available on supported platforms
    // You could add additional checks here if needed
    return true;
  } catch (error) {
    console.error('Failed to check biometric availability:', error);
    return false;
  }
}