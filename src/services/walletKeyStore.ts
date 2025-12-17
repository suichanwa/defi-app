import { Wallet } from 'ethers';
import type { EncryptedWalletKey } from '../types/wallet';
import { getJson, removeKey, setJson } from './storage';
import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStore';

const METADATA_KEY = 'wallet.metadata.v1';
const SECURE_KEY = 'wallet.encrypted.v1';
const LEGACY_KEY = 'wallet.encryptedKey.v1';

export class WalletKeyNotFoundError extends Error {
  constructor() {
    super('Wallet key not found.');
    this.name = 'WalletKeyNotFoundError';
  }
}

export class WalletPasswordError extends Error {
  constructor() {
    super('Current password is incorrect.');
    this.name = 'WalletPasswordError';
  }
}

export class WalletReencryptError extends Error {
  constructor() {
    super('Unable to verify updated wallet password.');
    this.name = 'WalletReencryptError';
  }
}

export async function loadEncryptedWalletKey(): Promise<EncryptedWalletKey | null> {
  const [meta, secureJson, legacy] = await Promise.all([
    getJson<Omit<EncryptedWalletKey, 'encryptedJson'> | null>(METADATA_KEY),
    getSecureItem(SECURE_KEY),
    getJson<EncryptedWalletKey | null>(LEGACY_KEY),
  ]);

  if (legacy && !secureJson) {
    await setSecureItem(SECURE_KEY, legacy.encryptedJson);
    await setJson(METADATA_KEY, {
      id: legacy.id,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
      backupCompleted: legacy.backupCompleted,
    });
    await removeKey(LEGACY_KEY);
    return legacy;
  }

  if (!meta || !secureJson) return null;
  return { ...meta, encryptedJson: secureJson };
}

export async function saveEncryptedWalletKey(record: EncryptedWalletKey): Promise<void> {
  const { encryptedJson, ...meta } = record;
  await Promise.all([setJson(METADATA_KEY, meta), setSecureItem(SECURE_KEY, encryptedJson)]);
}

export async function encryptWalletKey(privateKey: string, password: string): Promise<EncryptedWalletKey> {
  const wallet = new Wallet(privateKey);
  const encryptedJson = await wallet.encrypt(password);
  const timestamp = new Date().toISOString();
  return {
    id: wallet.address,
    encryptedJson,
    createdAt: timestamp,
    updatedAt: timestamp,
    backupCompleted: false,
  };
}

export async function decryptWalletKey(encryptedJson: string, password: string): Promise<string> {
  const wallet = await Wallet.fromEncryptedJson(encryptedJson, password);
  return wallet.privateKey;
}

export async function createInitialWalletKey(password: string): Promise<EncryptedWalletKey> {
  const wallet = Wallet.createRandom();
  const encryptedJson = await wallet.encrypt(password);
  const timestamp = new Date().toISOString();
  const record: EncryptedWalletKey = {
    id: wallet.address,
    encryptedJson,
    createdAt: timestamp,
    updatedAt: timestamp,
    backupCompleted: false,
  };
  await saveEncryptedWalletKey(record);
  return record;
}

export async function changeWalletPassword(currentPassword: string, newPassword: string): Promise<EncryptedWalletKey> {
  const existing = await loadEncryptedWalletKey();
  if (!existing) {
    throw new WalletKeyNotFoundError();
  }

  let privateKey: string;
  try {
    privateKey = await decryptWalletKey(existing.encryptedJson, currentPassword);
  } catch (error) {
    throw new WalletPasswordError();
  }

  const updated = await encryptWalletKey(privateKey, newPassword);
  const next: EncryptedWalletKey = {
    ...updated,
    id: existing.id ?? updated.id,
    createdAt: existing.createdAt ?? updated.createdAt,
    updatedAt: new Date().toISOString(),
    backupCompleted: existing.backupCompleted,
  };

  await saveEncryptedWalletKey(next);

  try {
    await decryptWalletKey(next.encryptedJson, newPassword);
  } catch (error) {
    throw new WalletReencryptError();
  }

  return next;
}

export async function markBackupCompleted(): Promise<void> {
  const existing = await loadEncryptedWalletKey();
  if (!existing) return;
  const next = { ...existing, backupCompleted: true, updatedAt: new Date().toISOString() };
  await saveEncryptedWalletKey(next);
}

export async function clearWallet(): Promise<void> {
  await Promise.all([removeKey(METADATA_KEY), removeKey(LEGACY_KEY), deleteSecureItem(SECURE_KEY)]);
}
