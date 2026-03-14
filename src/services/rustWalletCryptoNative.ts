import { NativeModules, Platform } from 'react-native';

type RustWalletCryptoModule = {
  isAvailable: () => Promise<boolean>;
  encryptWalletKey: (privateKey: string, password: string) => Promise<string>;
  decryptWalletKey: (encryptedJson: string, password: string) => Promise<string>;
};

const moduleRef = NativeModules.RustWalletCrypto as RustWalletCryptoModule | undefined;

const isNativePlatform = Platform.OS === 'android' || Platform.OS === 'ios';

export async function isRustWalletCryptoAvailable(): Promise<boolean> {
  if (!isNativePlatform || !moduleRef?.isAvailable) return false;
  try {
    return await moduleRef.isAvailable();
  } catch {
    return false;
  }
}

export async function tryRustEncryptWalletKey(privateKey: string, password: string): Promise<string | null> {
  if (!isNativePlatform || !moduleRef?.encryptWalletKey) return null;
  try {
    return await moduleRef.encryptWalletKey(privateKey, password);
  } catch {
    return null;
  }
}

export async function tryRustDecryptWalletKey(encryptedJson: string, password: string): Promise<string | null> {
  if (!isNativePlatform || !moduleRef?.decryptWalletKey) return null;
  try {
    return await moduleRef.decryptWalletKey(encryptedJson, password);
  } catch {
    return null;
  }
}

