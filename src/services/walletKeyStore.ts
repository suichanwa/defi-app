import { Wallet } from 'ethers';
import type { EncryptedWalletKey } from '../types/wallet';
import { getJson, setJson } from './storage';

const WALLET_KEY = 'wallet.encryptedKey.v1';

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
  return getJson<EncryptedWalletKey>(WALLET_KEY);
}

export async function saveEncryptedWalletKey(record: EncryptedWalletKey): Promise<void> {
  await setJson(WALLET_KEY, record);
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
  };

  await saveEncryptedWalletKey(next);

  try {
    await decryptWalletKey(next.encryptedJson, newPassword);
  } catch (error) {
    throw new WalletReencryptError();
  }

  return next;
}
