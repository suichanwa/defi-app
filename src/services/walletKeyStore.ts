import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/ciphers/webcrypto';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import type { EncryptedWalletKey, WalletKind, WalletRecordMeta } from '@app-types/wallet';
import { getJson, removeKey, setJson } from './storage';
import { getActiveWalletType } from '@config/chain';

const PBKDF2_ITERATIONS = 10000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export class WalletKeyNotFoundError extends Error {
  constructor(message = 'No wallet key found in storage.') {
    super(message);
    this.name = 'WalletKeyNotFoundError';
  }
}

export class WalletPasswordError extends Error {
  constructor(message = 'Incorrect wallet password.') {
    super(message);
    this.name = 'WalletPasswordError';
  }
}

export class WalletReencryptError extends Error {
  constructor(message = 'Failed to re-encrypt the wallet key.') {
    super(message);
    this.name = 'WalletReencryptError';
  }
}

const getStorageKey = (walletType: WalletKind) => `wallet.records.${walletType}.v1`;
const getActiveWalletKey = (walletType: WalletKind) => `wallet.active.${walletType}.v1`;

export async function loadWalletRecords(
  walletType: WalletKind = getActiveWalletType(),
): Promise<WalletRecordMeta[]> {
  const records = await getJson<EncryptedWalletKey[]>(getStorageKey(walletType));
  if (!records) return [];
  return records.map((r) => {
    const { encryptedJson, ...meta } = r;
    return meta;
  });
}

export async function getActiveWalletId(walletType: WalletKind = getActiveWalletType()): Promise<string | null> {
  return getJson<string>(getActiveWalletKey(walletType));
}

export async function setActiveWalletId(
  walletId: string,
  walletType: WalletKind = getActiveWalletType(),
): Promise<void> {
  await setJson(getActiveWalletKey(walletType), walletId);
}

export async function loadEncryptedWalletKeyById(
  walletId: string,
  walletType: WalletKind = getActiveWalletType(),
): Promise<EncryptedWalletKey | null> {
  const records = await getJson<EncryptedWalletKey[]>(getStorageKey(walletType));
  if (!records) return null;
  return records.find((r) => r.id === walletId) ?? null;
}

export async function loadEncryptedWalletKey(
  walletType: WalletKind = getActiveWalletType(),
): Promise<EncryptedWalletKey | null> {
  const activeId = await getActiveWalletId(walletType);
  if (activeId) {
    const record = await loadEncryptedWalletKeyById(activeId, walletType);
    if (record) return record;
  }
  const records = await getJson<EncryptedWalletKey[]>(getStorageKey(walletType));
  if (!records || records.length === 0) return null;
  return records[0];
}

export async function saveEncryptedWalletKey(
  record: EncryptedWalletKey,
  walletType: WalletKind = record.walletType ?? getActiveWalletType(),
): Promise<void> {
  const records = (await getJson<EncryptedWalletKey[]>(getStorageKey(walletType))) ?? [];
  const index = records.findIndex((r) => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  await setJson(getStorageKey(walletType), records);
  await setActiveWalletId(record.id, walletType);
}

// OPTIMIZED: Faster key derivation
function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  return pbkdf2(sha256, password, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: 32,
  });
}

export async function encryptWalletKey(privateKey: string, password: string): Promise<EncryptedWalletKey> {
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const plaintext = new TextEncoder().encode(privateKey);
  const cipher = gcm(key, iv);
  const ciphertext = cipher.encrypt(plaintext);

  const payload = {
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    ciphertext: bytesToHex(ciphertext),
  };

  return {
    id: `wallet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    encryptedJson: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function decryptWalletKey(encryptedJson: string, password: string): Promise<string> {
  const payload = JSON.parse(encryptedJson);
  const salt = hexToBytes(payload.salt);
  const iv = hexToBytes(payload.iv);
  const ciphertext = hexToBytes(payload.ciphertext);

  const key = deriveKey(password, salt);

  try {
    const cipher = gcm(key, iv);
    const plaintext = cipher.decrypt(ciphertext);
    return new TextDecoder().decode(plaintext);
  } catch (error) {
    throw new WalletPasswordError('Incorrect password or corrupted data.');
  }
}

export async function removeWalletRecord(
  walletId: string,
  walletType: WalletKind = getActiveWalletType(),
): Promise<void> {
  const records = (await getJson<EncryptedWalletKey[]>(getStorageKey(walletType))) ?? [];
  const filtered = records.filter((r) => r.id !== walletId);
  
  if (filtered.length === 0) {
    await removeKey(getStorageKey(walletType));
    await removeKey(getActiveWalletKey(walletType));
  } else {
    await setJson(getStorageKey(walletType), filtered);
    const activeId = await getActiveWalletId(walletType);
    if (activeId === walletId && filtered.length > 0) {
      await setActiveWalletId(filtered[0].id, walletType);
    }
  }
}

export async function updateWalletRecordMeta(
  walletId: string,
  updates: Partial<Pick<WalletRecordMeta, 'label' | 'color'>>,
  walletType: WalletKind = getActiveWalletType(),
): Promise<WalletRecordMeta[]> {
  const records = (await getJson<EncryptedWalletKey[]>(getStorageKey(walletType))) ?? [];
  const updated = records.map((r) =>
    r.id === walletId
      ? { ...r, ...updates, updatedAt: new Date().toISOString() }
      : r
  );
  await setJson(getStorageKey(walletType), updated);
  return updated.map((r) => {
    const { encryptedJson, ...meta } = r;
    return meta;
  });
}
