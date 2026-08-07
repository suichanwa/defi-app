import type { EncryptedWalletKey, WalletRecordMeta, WalletKind } from '../types/wallet';
import { getJson, setJson } from './storage';
import { getActiveWalletType } from './activeWalletType';
import { verifyOrSetMasterPasscode } from './masterPasscodeStore';
import aesjs from 'aes-js';
import { pbkdf2 as pbkdf2Callback } from 'pbkdf2';
import { Buffer } from 'buffer';
import {
  isRustWalletStoreAvailable,
  tryRustClearWallet,
  tryRustDecryptWalletKey,
  tryRustEncryptWalletKey,
  tryRustGetActiveWalletId,
  tryRustLoadEncryptedWalletKey,
  tryRustLoadEncryptedWalletKeyById,
  tryRustLoadWalletRecords,
  tryRustMarkBackupCompleted,
  tryRustRemoveWalletRecord,
  tryRustSaveEncryptedWalletKey,
  tryRustSetActiveWalletId,
  tryRustUpdateWalletRecordMeta,
} from './rustWalletCryptoNative';
import { deriveSolanaKeypairFromMnemonic } from '@utils/solanaMnemonic';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 16;

// Message text is matched by walletErrorMessage() -> "Incorrect passcode."
const INVALID_PASSCODE_MESSAGE = 'Invalid password for this wallet.';

// ponytail: AES-CTR carries no MAC, so a wrong passcode decrypts to random bytes
// instead of failing. Everything we store is printable ASCII (an 0x-hex private key
// or a base64 secret key), so a non-ASCII result means the key was wrong.
// Upgrade path: an AEAD payload (AES-GCM, or CTR+HMAC) as version 2 here and in
// rust-api/src/lib.rs, keeping v1 readable for existing wallets.
function assertDecryptedPlaintext(plaintext: string): string {
  if (!plaintext || !/^[\x20-\x7e]+$/.test(plaintext)) {
    throw new Error(INVALID_PASSCODE_MESSAGE);
  }
  return plaintext;
}

/** True for payloads written by encryptWalletKey (JS or Rust). False for legacy ethers JSON. */
export function isAppEncryptedWalletPayload(encryptedJson: string): boolean {
  try {
    const parsed = JSON.parse(encryptedJson);
    return parsed?.version === 1 && parsed?.algorithm === 'aes-256-ctr';
  } catch {
    return false;
  }
}

const getStorageKey = (walletType: WalletKind) => `wallet.records.${walletType}.v1`;
const getActiveWalletKey = (walletType: WalletKind) => `wallet.active.${walletType}.v1`;

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const passwordStr = String(password);
  const passwordBytes = new TextEncoder().encode(passwordStr);

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    pbkdf2Callback(passwordBytes, Buffer.from(salt), PBKDF2_ITERATIONS, 32, 'sha256', (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });

  return new Uint8Array(derivedKey);
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function mapNativeRecord(record: any): WalletRecordMeta {
  return {
    id: record.id,
    label: record.label ?? 'Wallet',
    color: record.color ?? '#4f46e5',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    walletType: record.walletType,
  };
}

function mapNativeRecordList(records: unknown[] | null | undefined): WalletRecordMeta[] {
  if (!records) return [];
  return records.map((record) => mapNativeRecord(record));
}

function mapNativeEncryptedRecord(record: any): EncryptedWalletKey | null {
  if (!record || typeof record !== 'object') return null;
  if (typeof record.id !== 'string' || typeof record.encryptedJson !== 'string') return null;
  return {
    id: record.id,
    encryptedJson: record.encryptedJson,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    backupCompleted: record.backupCompleted,
    walletType: record.walletType,
  };
}

async function getJsWalletRecords(walletType: WalletKind): Promise<EncryptedWalletKey[]> {
  return (await getJson<EncryptedWalletKey[]>(getStorageKey(walletType))) ?? [];
}

async function getJsActiveWalletId(walletType: WalletKind): Promise<string | null> {
  return getJson<string>(getActiveWalletKey(walletType));
}

async function saveJsWalletRecord(record: EncryptedWalletKey, walletType: WalletKind): Promise<void> {
  const records = await getJsWalletRecords(walletType);
  const index = records.findIndex((item) => item.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  await setJson(getStorageKey(walletType), records);
  await setJson(getActiveWalletKey(walletType), record.id);
}

async function migrateJsWalletStoreToRust(walletType: WalletKind): Promise<void> {
  if (!(await isRustWalletStoreAvailable())) return;
  const nativeRecords = await tryRustLoadWalletRecords(walletType);
  if (nativeRecords && nativeRecords.length > 0) return;

  const jsRecords = await getJsWalletRecords(walletType);
  if (!jsRecords.length) return;

  for (const record of jsRecords) {
    const saved = await tryRustSaveEncryptedWalletKey(walletType, JSON.stringify(record));
    if (!saved) {
      return;
    }
  }

  const activeWalletId = await getJsActiveWalletId(walletType);
  if (activeWalletId) {
    await tryRustSetActiveWalletId(walletType, activeWalletId);
  }

  await setJson(getStorageKey(walletType), []);
  await setJson(getActiveWalletKey(walletType), null);
}

async function loadRustWalletRecords(walletType: WalletKind): Promise<WalletRecordMeta[] | null> {
  const records = await tryRustLoadWalletRecords(walletType);
  return records ? mapNativeRecordList(records) : null;
}

async function loadRustEncryptedWalletKeyById(walletType: WalletKind, walletId: string): Promise<EncryptedWalletKey | null> {
  const recordJson = await tryRustLoadEncryptedWalletKeyById(walletType, walletId);
  return recordJson ? mapNativeEncryptedRecord(JSON.parse(recordJson)) : null;
}

async function loadRustEncryptedWalletKey(walletType: WalletKind): Promise<EncryptedWalletKey | null> {
  const recordJson = await tryRustLoadEncryptedWalletKey(walletType);
  return recordJson ? mapNativeEncryptedRecord(JSON.parse(recordJson)) : null;
}

export async function loadWalletRecords(
  walletType?: WalletKind,
): Promise<WalletRecordMeta[]> {
  const type = walletType ?? await getActiveWalletType();
  await migrateJsWalletStoreToRust(type);

  const rustRecords = await loadRustWalletRecords(type);
  if (rustRecords) return rustRecords;

  const records = await getJsWalletRecords(type);
  return records.map((record) => mapNativeRecord(record));
}

export async function getActiveWalletId(walletType?: WalletKind): Promise<string | null> {
  const type = walletType ?? await getActiveWalletType();
  await migrateJsWalletStoreToRust(type);

  const rustActiveId = await tryRustGetActiveWalletId(type);
  if (rustActiveId) return rustActiveId;

  return getJsActiveWalletId(type);
}

export async function setActiveWalletId(
  walletId: string,
  walletType?: WalletKind,
): Promise<void> {
  const type = walletType ?? await getActiveWalletType();
  if (await isRustWalletStoreAvailable()) {
    const saved = await tryRustSetActiveWalletId(type, walletId);
    if (saved) return;
  }

  await setJson(getActiveWalletKey(type), walletId);
}

export async function loadEncryptedWalletKeyById(
  walletId: string,
  walletType?: WalletKind,
): Promise<EncryptedWalletKey | null> {
  const type = walletType ?? await getActiveWalletType();
  await migrateJsWalletStoreToRust(type);

  const rustRecord = await loadRustEncryptedWalletKeyById(type, walletId);
  if (rustRecord) return rustRecord;

  const records = await getJsWalletRecords(type);
  return records.find((record) => record.id === walletId) ?? null;
}

export async function loadWalletRecordById(walletId: string): Promise<EncryptedWalletKey | null> {
  const activeType = await getActiveWalletType();
  const preferred = await loadEncryptedWalletKeyById(walletId, activeType);
  if (preferred) return preferred;

  const fallbackType: WalletKind = activeType === 'ethereum' ? 'solana' : 'ethereum';
  return loadEncryptedWalletKeyById(walletId, fallbackType);
}

export async function loadEncryptedWalletKey(
  walletType?: WalletKind,
): Promise<EncryptedWalletKey | null> {
  const type = walletType ?? await getActiveWalletType();
  await migrateJsWalletStoreToRust(type);

  const rustRecord = await loadRustEncryptedWalletKey(type);
  if (rustRecord) return rustRecord;

  const activeId = await getActiveWalletId(type);
  if (activeId) {
    return loadEncryptedWalletKeyById(activeId, type);
  }
  const records = await getJsWalletRecords(type);
  if (!records.length) return null;
  return records[0];
}

export async function saveEncryptedWalletKey(
  record: EncryptedWalletKey,
  walletType?: WalletKind,
): Promise<void> {
  const type = walletType ?? record.walletType ?? await getActiveWalletType();
  if (await isRustWalletStoreAvailable()) {
    const migrated = await tryRustSaveEncryptedWalletKey(type, JSON.stringify(record));
    if (migrated) {
      return;
    }
  }

  await saveJsWalletRecord(record, type);
}

export async function encryptWalletKey(privateKey: string, password: string): Promise<EncryptedWalletKey> {
  // Validate inputs
  if (!privateKey || typeof privateKey !== 'string') {
    throw new Error('Private key must be a non-empty string');
  }
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const rustEncryptedJson = await tryRustEncryptWalletKey(privateKey, password);
  if (rustEncryptedJson) {
    const now = new Date().toISOString();
    return {
      id: Date.now().toString(),
      encryptedJson: rustEncryptedJson,
      createdAt: now,
      updatedAt: now,
    } as EncryptedWalletKey;
  }

  const salt = getRandomBytes(SALT_LENGTH);
  const iv = getRandomBytes(IV_LENGTH);

  const key = await deriveKey(password, salt);

  const textBytes = aesjs.utils.utf8.toBytes(privateKey);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const encryptedBytes = aesCtr.encrypt(textBytes);

  const encrypted = {
    version: 1,
    algorithm: 'aes-256-ctr',
    salt: bufferToHex(salt),
    iv: bufferToHex(iv),
    ciphertext: bufferToHex(encryptedBytes),
  };

  const now = new Date().toISOString();
  return {
    id: Date.now().toString(),
    encryptedJson: JSON.stringify(encrypted),
    createdAt: now,
    updatedAt: now,
  } as EncryptedWalletKey;
}

export async function decryptWalletKey(encryptedJson: string, password: string): Promise<string> {
  // Validate inputs
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  const rustDecrypted = await tryRustDecryptWalletKey(encryptedJson, password);
  if (rustDecrypted !== null) {
    return assertDecryptedPlaintext(rustDecrypted);
  }

  const data = JSON.parse(encryptedJson);

  if (data.version !== 1 || data.algorithm !== 'aes-256-ctr') {
    throw new Error('Unsupported encryption version or algorithm');
  }

  const salt = hexToBuffer(data.salt);
  const iv = hexToBuffer(data.iv);
  const ciphertext = hexToBuffer(data.ciphertext);

  const key = await deriveKey(password, salt);

  const aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(iv));
  const decryptedBytes = aesCtr.decrypt(ciphertext);

  let decryptedText: string;
  try {
    decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
  } catch {
    // Wrong key -> random bytes -> invalid UTF-8.
    throw new Error(INVALID_PASSCODE_MESSAGE);
  }

  return assertDecryptedPlaintext(decryptedText);
}

export async function createInitialWalletKey(password: string): Promise<EncryptedWalletKey> {
  // Verify or set master passcode
  const isValid = await verifyOrSetMasterPasscode(password);
  if (!isValid) {
    throw new Error('Invalid master passcode');
  }
  
  const { Wallet } = await import('ethers');
  const wallet = Wallet.createRandom();
  const encrypted = await encryptWalletKey(wallet.privateKey, password);
  
  const record: EncryptedWalletKey = {
    ...encrypted,
    id: wallet.address,
    backupCompleted: false,
    walletType: 'ethereum',
  };
  
  await saveEncryptedWalletKey(record, 'ethereum');
  return record;
}

export async function markBackupCompleted(walletType?: WalletKind): Promise<void> {
  const type = walletType ?? await getActiveWalletType();
  if (await tryRustMarkBackupCompleted(type)) {
    return;
  }

  const activeId = await getActiveWalletId(type);
  if (!activeId) return;

  const records = await getJsWalletRecords(type);
  const index = records.findIndex((r: EncryptedWalletKey) => r.id === activeId);
  if (index >= 0) {
    records[index] = { ...records[index], backupCompleted: true, updatedAt: new Date().toISOString() };
    await setJson(getStorageKey(type), records);
  }
}

export async function clearWallet(walletType?: WalletKind): Promise<void> {
  if (walletType) {
    await tryRustClearWallet(walletType);
    await setJson(getStorageKey(walletType), []);
    await setJson(getActiveWalletKey(walletType), null);
    return;
  }

  // Full local reset path: wipe all supported wallet namespaces.
  await Promise.all(
    (['ethereum', 'solana'] as WalletKind[]).flatMap((type) => [
      tryRustClearWallet(type),
      setJson(getStorageKey(type), []),
      setJson(getActiveWalletKey(type), null),
    ]),
  );
}

export async function importSolanaWalletRecord(
  mnemonic: string,
  password: string,
  walletType: WalletKind = 'solana'
): Promise<{ record: EncryptedWalletKey; keypair: any; mnemonic: string }> {
  const isValid = await verifyOrSetMasterPasscode(password);
  if (!isValid) {
    throw new Error('Invalid master passcode');
  }

  const { keypair, mnemonic: normalizedMnemonic } = await deriveSolanaKeypairFromMnemonic(mnemonic);

  const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
  const encrypted = await encryptWalletKey(secretKeyBase64, password);
  
  const record: EncryptedWalletKey = {
    ...encrypted,
    id: keypair.publicKey.toBase58(),
    walletType,
    backupCompleted: false,
  };
  
  await saveEncryptedWalletKey(record, walletType);
  return { record, keypair, mnemonic: normalizedMnemonic };
}

export async function unlockSolanaWallet(
  encryptedJson: string,
  password: string
): Promise<{ keypair: any; mnemonic: string | null }> {
  const { Keypair } = await import('@solana/web3.js');
  
  const decrypted = await decryptWalletKey(encryptedJson, password);
  const secretKeyBuffer = Buffer.from(decrypted, 'base64');
  const keypair = Keypair.fromSecretKey(secretKeyBuffer);
  
  return { keypair, mnemonic: null };
}

export async function createSolanaWalletRecord(
  password: string,
  walletType: WalletKind = 'solana'
): Promise<{ record: EncryptedWalletKey; keypair: any; mnemonic: string }> {
  // Verify or set master passcode
  const isValid = await verifyOrSetMasterPasscode(password);
  if (!isValid) {
    throw new Error('Invalid master passcode');
  }

  const { generateMnemonic } = await import('bip39');
  const mnemonic = generateMnemonic();
  const { keypair, mnemonic: normalizedMnemonic } = await deriveSolanaKeypairFromMnemonic(mnemonic);

  const secretKeyBase64 = Buffer.from(keypair.secretKey).toString('base64');
  const encrypted = await encryptWalletKey(secretKeyBase64, password);
  
  const record: EncryptedWalletKey = {
    ...encrypted,
    id: keypair.publicKey.toBase58(),
    walletType,
    backupCompleted: false,
  };
  
  await saveEncryptedWalletKey(record, walletType);
  return { record, keypair, mnemonic: normalizedMnemonic };
}

export async function removeWalletRecord(
  walletId: string,
  walletType?: WalletKind,
): Promise<void> {
  const type = walletType ?? await getActiveWalletType();
  if (await tryRustRemoveWalletRecord(type, walletId)) {
    return;
  }

  const records = await getJsWalletRecords(type);
  const filtered = records.filter((r: EncryptedWalletKey) => r.id !== walletId);
  await setJson(getStorageKey(type), filtered);
  
  const activeId = await getActiveWalletId(type);
  if (activeId === walletId && filtered.length > 0) {
    await setActiveWalletId(filtered[0].id, type);
  }
}

export async function updateWalletRecordMeta(
  walletId: string,
  updates: Partial<Pick<WalletRecordMeta, 'label' | 'color'>>,
  walletType?: WalletKind,
): Promise<WalletRecordMeta[]> {
  const type = walletType ?? await getActiveWalletType();
  const updatesJson = JSON.stringify(updates);
  const rustRecords = await tryRustUpdateWalletRecordMeta(type, walletId, updatesJson);
  if (rustRecords) {
    return mapNativeRecordList(rustRecords);
  }

  const records = await getJsWalletRecords(type);
  const index = records.findIndex((r: EncryptedWalletKey) => r.id === walletId);
  if (index >= 0) {
    records[index] = { ...records[index], ...updates };
    await setJson(getStorageKey(type), records);
  }
  return loadWalletRecords(type);
}
