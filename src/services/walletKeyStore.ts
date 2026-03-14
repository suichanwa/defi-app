import type { EncryptedWalletKey, WalletRecordMeta, WalletKind } from '../types/wallet';
import { getJson, setJson } from './storage';
import { getActiveWalletType } from './activeWalletType';
import { verifyOrSetMasterPasscode } from './masterPasscodeStore';
import aesjs from 'aes-js';
import { pbkdf2 as pbkdf2Callback } from 'pbkdf2';
import { Buffer } from 'buffer';
import { tryRustDecryptWalletKey, tryRustEncryptWalletKey } from './rustWalletCryptoNative';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 16;

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

export async function loadWalletRecords(
  walletType?: WalletKind,
): Promise<WalletRecordMeta[]> {
  const type = walletType ?? await getActiveWalletType();
  const records = await getJson<EncryptedWalletKey[]>(getStorageKey(type));
  if (!records) return [];
  return records.map((r: EncryptedWalletKey) => ({
    id: r.id,
    label: (r as any).label ?? 'Wallet',
    color: (r as any).color ?? '#4f46e5',
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    walletType: r.walletType,
  }));
}

export async function getActiveWalletId(walletType?: WalletKind): Promise<string | null> {
  const type = walletType ?? await getActiveWalletType();
  return getJson<string>(getActiveWalletKey(type));
}

export async function setActiveWalletId(
  walletId: string,
  walletType?: WalletKind,
): Promise<void> {
  const type = walletType ?? await getActiveWalletType();
  await setJson(getActiveWalletKey(type), walletId);
}

export async function loadEncryptedWalletKeyById(
  walletId: string,
  walletType?: WalletKind,
): Promise<EncryptedWalletKey | null> {
  const type = walletType ?? await getActiveWalletType();
  const records = await getJson<EncryptedWalletKey[]>(getStorageKey(type));
  if (!records) return null;
  return records.find((r: EncryptedWalletKey) => r.id === walletId) ?? null;
}

export async function loadEncryptedWalletKey(
  walletType?: WalletKind,
): Promise<EncryptedWalletKey | null> {
  const type = walletType ?? await getActiveWalletType();
  const activeId = await getActiveWalletId(type);
  if (activeId) {
    return loadEncryptedWalletKeyById(activeId, type);
  }
  const records = await getJson<EncryptedWalletKey[]>(getStorageKey(type));
  if (!records || records.length === 0) return null;
  return records[0];
}

export async function saveEncryptedWalletKey(
  record: EncryptedWalletKey,
  walletType?: WalletKind,
): Promise<void> {
  const type = walletType ?? record.walletType ?? await getActiveWalletType();
  const records = (await getJson<EncryptedWalletKey[]>(getStorageKey(type))) ?? [];
  const index = records.findIndex((r: EncryptedWalletKey) => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.push(record);
  }
  await setJson(getStorageKey(type), records);
  await setActiveWalletId(record.id, type);
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
    return rustDecrypted;
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
  const decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);

  return decryptedText;
}

export async function createInitialWalletKey(password: string): Promise<EncryptedWalletKey> {
  // Verify or set master passcode
  const isValid = await verifyOrSetMasterPasscode(password);
  if (!isValid) {
    throw new Error('Invalid master passcode');
  }
  
  const { Wallet } = await import('ethers');
  const wallet = Wallet.createRandom();
  const encryptedJson = await wallet.encrypt(password);
  
  const now = new Date().toISOString();
  const record: EncryptedWalletKey = {
    id: wallet.address,
    encryptedJson,
    createdAt: now,
    updatedAt: now,
    backupCompleted: false,
    walletType: 'ethereum',
  };
  
  await saveEncryptedWalletKey(record);
  return record;
}

export async function markBackupCompleted(walletType?: WalletKind): Promise<void> {
  const type = walletType ?? await getActiveWalletType();
  const activeId = await getActiveWalletId(type);
  if (!activeId) return;
  
  const records = (await getJson<EncryptedWalletKey[]>(getStorageKey(type))) ?? [];
  const index = records.findIndex((r: EncryptedWalletKey) => r.id === activeId);
  if (index >= 0) {
    records[index] = { ...records[index], backupCompleted: true, updatedAt: new Date().toISOString() };
    await setJson(getStorageKey(type), records);
  }
}

export async function clearWallet(walletType?: WalletKind): Promise<void> {
  if (walletType) {
    await setJson(getStorageKey(walletType), []);
    await setJson(getActiveWalletKey(walletType), null);
    return;
  }

  // Full local reset path: wipe all supported wallet namespaces.
  await Promise.all(
    (['ethereum', 'solana'] as WalletKind[]).flatMap((type) => [
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
  // Verify or set master passcode
  const isValid = await verifyOrSetMasterPasscode(password);
  if (!isValid) {
    throw new Error('Invalid master passcode');
  }
  
  const { Keypair } = await import('@solana/web3.js');
  const { mnemonicToSeedSync } = await import('bip39');
  
  const seed = mnemonicToSeedSync(mnemonic);
  const seedBytes = seed.slice(0, 32);
  const keypair = Keypair.fromSeed(seedBytes);
  
  const privateKeyBase58 = Buffer.from(keypair.secretKey).toString('base64');
  const encrypted = await encryptWalletKey(privateKeyBase58, password);
  
  const record: EncryptedWalletKey = {
    ...encrypted,
    id: keypair.publicKey.toBase58(),
    walletType,
    backupCompleted: false,
  };
  
  await saveEncryptedWalletKey(record, walletType);
  return { record, keypair, mnemonic };
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
  
  const { Keypair } = await import('@solana/web3.js');
  const { generateMnemonic, mnemonicToSeedSync } = await import('bip39');
  
  const mnemonic = generateMnemonic();
  const seed = mnemonicToSeedSync(mnemonic);
  const seedBytes = seed.slice(0, 32);
  const keypair = Keypair.fromSeed(seedBytes);
  
  const privateKeyBase58 = Buffer.from(keypair.secretKey).toString('base64');
  const encrypted = await encryptWalletKey(privateKeyBase58, password);
  
  const record: EncryptedWalletKey = {
    ...encrypted,
    id: keypair.publicKey.toBase58(),
    walletType,
    backupCompleted: false,
  };
  
  await saveEncryptedWalletKey(record, walletType);
  return { record, keypair, mnemonic };
}

export async function removeWalletRecord(
  walletId: string,
  walletType?: WalletKind,
): Promise<void> {
  const type = walletType ?? await getActiveWalletType();
  const records = (await getJson<EncryptedWalletKey[]>(getStorageKey(type))) ?? [];
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
  const records = (await getJson<EncryptedWalletKey[]>(getStorageKey(type))) ?? [];
  const index = records.findIndex((r: EncryptedWalletKey) => r.id === walletId);
  if (index >= 0) {
    records[index] = { ...records[index], ...updates };
    await setJson(getStorageKey(type), records);
  }
  return loadWalletRecords(type);
}
