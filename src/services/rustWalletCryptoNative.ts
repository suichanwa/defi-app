import { NativeModules, Platform } from 'react-native';

type RustWalletCryptoModule = {
  isAvailable: () => Promise<boolean>;
  encryptWalletKey: (privateKey: string, password: string) => Promise<string>;
  decryptWalletKey: (encryptedJson: string, password: string) => Promise<string>;
  hashPasscode: (passcode: string) => Promise<string>;
  verifyPasscode: (passcode: string, hash: string) => Promise<boolean>;
  loadWalletRecords: (walletType: string) => Promise<string>;
  getActiveWalletId: (walletType: string) => Promise<string>;
  setActiveWalletId: (walletType: string, walletId: string) => Promise<boolean>;
  loadEncryptedWalletKeyById: (walletType: string, walletId: string) => Promise<string>;
  loadEncryptedWalletKey: (walletType: string) => Promise<string>;
  saveEncryptedWalletKey: (walletType: string, recordJson: string) => Promise<boolean>;
  markBackupCompleted: (walletType: string) => Promise<boolean>;
  clearWallet: (walletType: string) => Promise<boolean>;
  removeWalletRecord: (walletType: string, walletId: string) => Promise<boolean>;
  updateWalletRecordMeta: (walletType: string, walletId: string, updatesJson: string) => Promise<string>;
};

const moduleRef = NativeModules.RustWalletCrypto as RustWalletCryptoModule | undefined;

const isNativePlatform = Platform.OS === 'android' || Platform.OS === 'ios';

if (__DEV__ && isNativePlatform && !moduleRef) {
  // Every tryRust* helper below swallows failures and returns null, which makes the
  // app fall back to the much slower JS crypto path with no visible error.
  console.warn('[rust-wallet] NativeModules.RustWalletCrypto is missing - using slow JS fallback.');
}

export async function isRustWalletCryptoAvailable(): Promise<boolean> {
  if (!isNativePlatform || !moduleRef?.isAvailable) return false;
  try {
    return await moduleRef.isAvailable();
  } catch (error) {
    if (__DEV__) {
      console.warn('[rust-wallet] isAvailable() threw - using slow JS fallback:', error);
    }
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

export async function tryRustHashPasscode(passcode: string): Promise<string | null> {
  if (!isNativePlatform || !moduleRef?.hashPasscode) return null;
  try {
    return await moduleRef.hashPasscode(passcode);
  } catch {
    return null;
  }
}

export async function tryRustVerifyPasscode(passcode: string, hash: string): Promise<boolean | null> {
  if (!isNativePlatform || !moduleRef?.verifyPasscode) return null;
  try {
    return await moduleRef.verifyPasscode(passcode, hash);
  } catch {
    return null;
  }
}

export async function isRustWalletStoreAvailable(): Promise<boolean> {
  return isRustWalletCryptoAvailable();
}

export async function tryRustLoadWalletRecords(walletType: string): Promise<unknown[] | null> {
  if (!isNativePlatform || !moduleRef?.loadWalletRecords) return null;
  try {
    const result = await moduleRef.loadWalletRecords(walletType);
    return JSON.parse(result) as unknown[];
  } catch {
    return null;
  }
}

export async function tryRustGetActiveWalletId(walletType: string): Promise<string | null> {
  if (!isNativePlatform || !moduleRef?.getActiveWalletId) return null;
  try {
    const result = await moduleRef.getActiveWalletId(walletType);
    return result?.trim() ? result : null;
  } catch {
    return null;
  }
}

export async function tryRustSetActiveWalletId(walletType: string, walletId: string): Promise<boolean> {
  if (!isNativePlatform || !moduleRef?.setActiveWalletId) return false;
  try {
    return await moduleRef.setActiveWalletId(walletType, walletId);
  } catch {
    return false;
  }
}

export async function tryRustLoadEncryptedWalletKeyById(walletType: string, walletId: string): Promise<string | null> {
  if (!isNativePlatform || !moduleRef?.loadEncryptedWalletKeyById) return null;
  try {
    const result = await moduleRef.loadEncryptedWalletKeyById(walletType, walletId);
    return result || null;
  } catch {
    return null;
  }
}

export async function tryRustLoadEncryptedWalletKey(walletType: string): Promise<string | null> {
  if (!isNativePlatform || !moduleRef?.loadEncryptedWalletKey) return null;
  try {
    const result = await moduleRef.loadEncryptedWalletKey(walletType);
    return result || null;
  } catch {
    return null;
  }
}

export async function tryRustSaveEncryptedWalletKey(walletType: string, recordJson: string): Promise<boolean> {
  if (!isNativePlatform || !moduleRef?.saveEncryptedWalletKey) return false;
  try {
    return await moduleRef.saveEncryptedWalletKey(walletType, recordJson);
  } catch {
    return false;
  }
}

export async function tryRustMarkBackupCompleted(walletType: string): Promise<boolean> {
  if (!isNativePlatform || !moduleRef?.markBackupCompleted) return false;
  try {
    return await moduleRef.markBackupCompleted(walletType);
  } catch {
    return false;
  }
}

export async function tryRustClearWallet(walletType: string): Promise<boolean> {
  if (!isNativePlatform || !moduleRef?.clearWallet) return false;
  try {
    return await moduleRef.clearWallet(walletType);
  } catch {
    return false;
  }
}

export async function tryRustRemoveWalletRecord(walletType: string, walletId: string): Promise<boolean> {
  if (!isNativePlatform || !moduleRef?.removeWalletRecord) return false;
  try {
    return await moduleRef.removeWalletRecord(walletType, walletId);
  } catch {
    return false;
  }
}

export async function tryRustUpdateWalletRecordMeta(walletType: string, walletId: string, updatesJson: string): Promise<unknown[] | null> {
  if (!isNativePlatform || !moduleRef?.updateWalletRecordMeta) return null;
  try {
    const result = await moduleRef.updateWalletRecordMeta(walletType, walletId, updatesJson);
    return JSON.parse(result) as unknown[];
  } catch {
    return null;
  }
}

