import { Wallet } from 'ethers';
import { Keypair } from '@solana/web3.js';
import { base64 } from '@scure/base';
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { bytesToUtf8, concatBytes, randomBytes, utf8ToBytes } from '@noble/ciphers/utils.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { CHAIN } from '../config/chain';
import type { EncryptedWalletKey, WalletKind, WalletRecordMeta } from '../types/wallet';
import { getJson, removeKey, setJson } from './storage';
import { deleteSecureItem, getSecureItem, setSecureItem } from './secureStore';

// Default scrypt params are heavy on mobile; reduce N for faster UX while keeping reasonable security.
const FAST_SCRYPT = { N: 1 << 14, r: 8, p: 1 };

const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";
const SOLANA_CIPHER_TYPE = 'solana-secret-key';
const SOLANA_CIPHER_VERSION = 1;
const SOLANA_SALT_BYTES = 16;
const SOLANA_NONCE_BYTES = 24;
const SOLANA_DK_LEN = 32;
const ED25519_CURVE = 'ed25519 seed';
const HARDENED_OFFSET = 0x80000000;

const LEGACY_METADATA_KEY = 'wallet.metadata.v1';
const LEGACY_SECURE_KEY = 'wallet.encrypted.v1';
const LEGACY_KEY = 'wallet.encryptedKey.v1';

type SolanaEncryptedPayload = {
  type: string;
  version: number;
  salt: string;
  nonce: string;
  ciphertext: string;
  kdf: { name: 'scrypt'; N: number; r: number; p: number; dkLen: number };
};

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

const getActiveWalletType = (): WalletKind => (CHAIN.kind === 'solana' ? 'solana' : 'ethereum');

const getStorageKeys = (walletType: WalletKind) => ({
  metadataKey: `wallet.${walletType}.metadata.v1`,
  secureKey: `wallet.${walletType}.encrypted.v1`,
  listKey: `wallet.${walletType}.metadata.list.v1`,
  activeIdKey: `wallet.${walletType}.active.id.v1`,
  walletSecureKey: (id: string) => `wallet.${walletType}.encrypted.${id}.v1`,
});

const normalizeMnemonic = (phrase: string) =>
  phrase
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .join(' ');

const base64Encode = (bytes: Uint8Array) => base64.encode(bytes);
const base64Decode = (value: string) => base64.decode(value);

const ser32 = (value: number) => {
  const bytes = new Uint8Array(4);
  bytes[0] = (value >>> 24) & 0xff;
  bytes[1] = (value >>> 16) & 0xff;
  bytes[2] = (value >>> 8) & 0xff;
  bytes[3] = value & 0xff;
  return bytes;
};

const parseDerivationPath = (path: string) => {
  if (!path.startsWith('m/')) {
    throw new Error('Invalid derivation path.');
  }
  return path
    .split('/')
    .slice(1)
    .map((segment) => {
      const hardened = segment.endsWith("'") || segment.endsWith('h');
      const raw = hardened ? segment.slice(0, -1) : segment;
      if (!/^\d+$/.test(raw)) {
        throw new Error('Invalid derivation path.');
      }
      const index = Number(raw);
      if (!Number.isSafeInteger(index)) {
        throw new Error('Invalid derivation path.');
      }
      if (!hardened) {
        throw new Error('Non-hardened derivation is not supported for Solana.');
      }
      return index;
    });
};

const deriveEd25519Seed = (seed: Uint8Array, path: string): Uint8Array => {
  const segments = parseDerivationPath(path);
  let I = hmac(sha512, utf8ToBytes(ED25519_CURVE), seed);
  let key = I.slice(0, 32);
  let chainCode = I.slice(32);

  for (const segment of segments) {
    const data = concatBytes(new Uint8Array([0]), key, ser32(segment + HARDENED_OFFSET));
    I = hmac(sha512, chainCode, data);
    key = I.slice(0, 32);
    chainCode = I.slice(32);
  }

  return key;
};

const normalizeRecordMeta = (record: EncryptedWalletKey): WalletRecordMeta => ({
  id: record.id,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
  backupCompleted: record.backupCompleted,
  walletType: record.walletType,
});

const migrateLegacyWallet = async (walletType: WalletKind): Promise<WalletRecordMeta[]> => {
  const { metadataKey, secureKey, listKey, activeIdKey, walletSecureKey } = getStorageKeys(walletType);
  const [meta, secureJson] = await Promise.all([
    getJson<Omit<EncryptedWalletKey, 'encryptedJson'> | null>(metadataKey),
    getSecureItem(secureKey),
  ]);

  if (meta && secureJson) {
    const record: EncryptedWalletKey = { ...meta, encryptedJson: secureJson, walletType };
    const normalized = normalizeRecordMeta(record);
    await Promise.all([
      setJson(listKey, [normalized]),
      setJson(activeIdKey, normalized.id),
      setSecureItem(walletSecureKey(normalized.id), secureJson),
      removeKey(metadataKey),
      deleteSecureItem(secureKey),
    ]);
    return [normalized];
  }

  if (walletType !== 'ethereum') return [];

  const [legacyMeta, legacySecure, legacyRecord] = await Promise.all([
    getJson<Omit<EncryptedWalletKey, 'encryptedJson'> | null>(LEGACY_METADATA_KEY),
    getSecureItem(LEGACY_SECURE_KEY),
    getJson<EncryptedWalletKey | null>(LEGACY_KEY),
  ]);

  const legacyEncryptedJson = legacySecure ?? legacyRecord?.encryptedJson ?? null;
  const legacyBase = legacyRecord ?? (legacyMeta ? { ...legacyMeta, encryptedJson: legacyEncryptedJson ?? '' } : null);

  if (!legacyBase || !legacyEncryptedJson) return [];

  const record: EncryptedWalletKey = {
    id: legacyBase.id,
    encryptedJson: legacyEncryptedJson,
    createdAt: legacyBase.createdAt,
    updatedAt: legacyBase.updatedAt,
    backupCompleted: legacyBase.backupCompleted,
    walletType: 'ethereum',
  };
  const normalized = normalizeRecordMeta(record);

  await Promise.all([
    setJson(listKey, [normalized]),
    setJson(activeIdKey, normalized.id),
    setSecureItem(walletSecureKey(normalized.id), legacyEncryptedJson),
    removeKey(LEGACY_METADATA_KEY),
    deleteSecureItem(LEGACY_SECURE_KEY),
    removeKey(LEGACY_KEY),
  ]);

  return [normalized];
};

export async function loadWalletRecords(
  walletType: WalletKind = getActiveWalletType(),
): Promise<WalletRecordMeta[]> {
  const { listKey, activeIdKey } = getStorageKeys(walletType);
  const stored = await getJson<WalletRecordMeta[] | null>(listKey);
  if (stored && stored.length) {
    const activeId = await getJson<string | null>(activeIdKey);
    if (!activeId || !stored.some((record) => record.id === activeId)) {
      await setJson(activeIdKey, stored[0].id);
    }
    return stored;
  }

  const migrated = await migrateLegacyWallet(walletType);
  if (migrated.length) return migrated;
  return [];
}

export async function getActiveWalletId(walletType: WalletKind = getActiveWalletType()): Promise<string | null> {
  const { activeIdKey } = getStorageKeys(walletType);
  return getJson<string | null>(activeIdKey);
}

export async function setActiveWalletId(
  walletId: string,
  walletType: WalletKind = getActiveWalletType(),
): Promise<void> {
  const { activeIdKey } = getStorageKeys(walletType);
  await setJson(activeIdKey, walletId);
}

export async function loadEncryptedWalletKeyById(
  walletId: string,
  walletType: WalletKind = getActiveWalletType(),
): Promise<EncryptedWalletKey | null> {
  const records = await loadWalletRecords(walletType);
  const record = records.find((item) => item.id === walletId);
  if (!record) return null;
  const { walletSecureKey } = getStorageKeys(walletType);
  const encryptedJson = await getSecureItem(walletSecureKey(record.id));
  if (!encryptedJson) return null;
  return { ...record, encryptedJson, walletType: record.walletType ?? walletType };
}

export async function loadEncryptedWalletKey(
  walletType: WalletKind = getActiveWalletType(),
): Promise<EncryptedWalletKey | null> {
  const records = await loadWalletRecords(walletType);
  if (!records.length) return null;
  const storedActive = await getActiveWalletId(walletType);
  const activeId = storedActive && records.some((record) => record.id === storedActive) ? storedActive : records[0].id;
  if (activeId !== storedActive) {
    await setActiveWalletId(activeId, walletType);
  }
  return loadEncryptedWalletKeyById(activeId, walletType);
}

export async function saveEncryptedWalletKey(
  record: EncryptedWalletKey,
  walletType: WalletKind = record.walletType ?? getActiveWalletType(),
): Promise<void> {
  const { listKey, walletSecureKey } = getStorageKeys(walletType);
  const { encryptedJson, ...meta } = record;
  const existing = await loadWalletRecords(walletType);
  const nextRecords = existing.some((item) => item.id === meta.id)
    ? existing.map((item) => (item.id === meta.id ? { ...item, ...meta, walletType } : item))
    : [...existing, { ...meta, walletType }];
  await Promise.all([
    setJson(listKey, nextRecords),
    setActiveWalletId(meta.id, walletType),
    setSecureItem(walletSecureKey(meta.id), encryptedJson),
  ]);
}

export async function encryptWalletKey(privateKey: string, password: string): Promise<EncryptedWalletKey> {
  const wallet = new Wallet(privateKey);
  const encryptedJson = await wallet.encrypt(password, { scrypt: FAST_SCRYPT });
  const timestamp = new Date().toISOString();
  return {
    id: wallet.address,
    encryptedJson,
    createdAt: timestamp,
    updatedAt: timestamp,
    backupCompleted: false,
    walletType: 'ethereum',
  };
}

export async function decryptWalletKey(encryptedJson: string, password: string): Promise<string> {
  const wallet = await Wallet.fromEncryptedJson(encryptedJson, password);
  return wallet.privateKey;
}

export async function removeWalletRecord(
  walletId: string,
  walletType: WalletKind = getActiveWalletType(),
): Promise<void> {
  const { listKey, activeIdKey, walletSecureKey } = getStorageKeys(walletType);
  const records = await loadWalletRecords(walletType);
  const nextRecords = records.filter((record) => record.id !== walletId);
  await Promise.all([
    setJson(listKey, nextRecords),
    deleteSecureItem(walletSecureKey(walletId)),
  ]);
  const storedActive = await getJson<string | null>(activeIdKey);
  if (storedActive === walletId) {
    const nextActive = nextRecords[0]?.id ?? null;
    if (nextActive) {
      await setJson(activeIdKey, nextActive);
    } else {
      await removeKey(activeIdKey);
    }
  }
}

const encryptSolanaSecretKey = async (
  secretKey: Uint8Array,
  password: string,
  mnemonic?: string,
): Promise<string> => {
  const salt = randomBytes(SOLANA_SALT_BYTES);
  const nonce = randomBytes(SOLANA_NONCE_BYTES);
  const key = await scryptAsync(password, salt, { ...FAST_SCRYPT, dkLen: SOLANA_DK_LEN });
  const cipher = xchacha20poly1305(key, nonce);
  const payloadJson = JSON.stringify({
    secretKey: base64Encode(secretKey),
    mnemonic: mnemonic ? normalizeMnemonic(mnemonic) : undefined,
  });
  const ciphertext = cipher.encrypt(utf8ToBytes(payloadJson));
  const payload: SolanaEncryptedPayload = {
    type: SOLANA_CIPHER_TYPE,
    version: SOLANA_CIPHER_VERSION,
    salt: base64Encode(salt),
    nonce: base64Encode(nonce),
    ciphertext: base64Encode(ciphertext),
    kdf: { name: 'scrypt', ...FAST_SCRYPT, dkLen: SOLANA_DK_LEN },
  };
  return JSON.stringify(payload);
};

const decryptSolanaSecretKey = async (
  encryptedJson: string,
  password: string,
): Promise<{ secretKey: Uint8Array; mnemonic?: string }> => {
  let payload: SolanaEncryptedPayload;
  try {
    payload = JSON.parse(encryptedJson) as SolanaEncryptedPayload;
  } catch (error) {
    throw new WalletPasswordError();
  }

  if (payload.type !== SOLANA_CIPHER_TYPE) {
    throw new WalletPasswordError();
  }

  const salt = base64Decode(payload.salt);
  const nonce = base64Decode(payload.nonce);
  const ciphertext = base64Decode(payload.ciphertext);
  const key = await scryptAsync(password, salt, {
    N: payload.kdf?.N ?? FAST_SCRYPT.N,
    r: payload.kdf?.r ?? FAST_SCRYPT.r,
    p: payload.kdf?.p ?? FAST_SCRYPT.p,
    dkLen: payload.kdf?.dkLen ?? SOLANA_DK_LEN,
  });

  const cipher = xchacha20poly1305(key, nonce);
  try {
    const decrypted = bytesToUtf8(cipher.decrypt(ciphertext));
    const parsed = JSON.parse(decrypted) as { secretKey: string; mnemonic?: string };
    if (!parsed?.secretKey) {
      throw new Error('Missing secret key payload.');
    }
    return {
      secretKey: base64Decode(parsed.secretKey),
      mnemonic: parsed.mnemonic ? normalizeMnemonic(parsed.mnemonic) : undefined,
    };
  } catch (error) {
    throw new WalletPasswordError();
  }
};

const deriveSolanaKeypair = (mnemonic: string): Keypair => {
  const normalized = normalizeMnemonic(mnemonic);
  if (!validateMnemonic(normalized, wordlist)) {
    throw new Error('Invalid mnemonic.');
  }
  const seed = mnemonicToSeedSync(normalized);
  const derived = deriveEd25519Seed(seed, SOLANA_DERIVATION_PATH);
  return Keypair.fromSeed(derived);
};

export async function createSolanaWalletRecord(password: string): Promise<{
  record: EncryptedWalletKey;
  keypair: Keypair;
  mnemonic: string;
}> {
  const mnemonic = generateMnemonic(wordlist, 128);
  const keypair = deriveSolanaKeypair(mnemonic);
  const encryptedJson = await encryptSolanaSecretKey(keypair.secretKey, password, mnemonic);
  const timestamp = new Date().toISOString();
  const record: EncryptedWalletKey = {
    id: keypair.publicKey.toBase58(),
    encryptedJson,
    createdAt: timestamp,
    updatedAt: timestamp,
    backupCompleted: false,
    walletType: 'solana',
  };
  await saveEncryptedWalletKey(record, 'solana');
  return { record, keypair, mnemonic };
}

export async function importSolanaWalletRecord(
  mnemonic: string,
  password: string,
): Promise<{ record: EncryptedWalletKey; keypair: Keypair }> {
  const keypair = deriveSolanaKeypair(mnemonic);
  const encryptedJson = await encryptSolanaSecretKey(keypair.secretKey, password, mnemonic);
  const timestamp = new Date().toISOString();
  const record: EncryptedWalletKey = {
    id: keypair.publicKey.toBase58(),
    encryptedJson,
    createdAt: timestamp,
    updatedAt: timestamp,
    backupCompleted: false,
    walletType: 'solana',
  };
  await saveEncryptedWalletKey(record, 'solana');
  return { record, keypair };
}

export async function unlockSolanaWallet(
  encryptedJson: string,
  password: string,
): Promise<{ keypair: Keypair; mnemonic?: string }> {
  const payload = await decryptSolanaSecretKey(encryptedJson, password);
  return { keypair: Keypair.fromSecretKey(payload.secretKey), mnemonic: payload.mnemonic };
}

export async function createInitialWalletKey(
  password: string,
  walletType: WalletKind = getActiveWalletType(),
): Promise<EncryptedWalletKey> {
  if (walletType === 'solana') {
    const { record } = await createSolanaWalletRecord(password);
    return record;
  }

  const wallet = Wallet.createRandom();
  const encryptedJson = await wallet.encrypt(password, { scrypt: FAST_SCRYPT });
  const timestamp = new Date().toISOString();
  const record: EncryptedWalletKey = {
    id: wallet.address,
    encryptedJson,
    createdAt: timestamp,
    updatedAt: timestamp,
    backupCompleted: false,
    walletType: 'ethereum',
  };
  await saveEncryptedWalletKey(record, 'ethereum');
  return record;
}

export async function changeWalletPassword(
  currentPassword: string,
  newPassword: string,
  walletType: WalletKind = getActiveWalletType(),
): Promise<EncryptedWalletKey> {
  const existing = await loadEncryptedWalletKey(walletType);
  if (!existing) {
    throw new WalletKeyNotFoundError();
  }

  if (walletType === 'solana') {
    let decrypted: { secretKey: Uint8Array; mnemonic?: string };
    try {
      decrypted = await decryptSolanaSecretKey(existing.encryptedJson, currentPassword);
    } catch (error) {
      throw new WalletPasswordError();
    }

    const encryptedJson = await encryptSolanaSecretKey(decrypted.secretKey, newPassword, decrypted.mnemonic);
    const next: EncryptedWalletKey = {
      ...existing,
      encryptedJson,
      updatedAt: new Date().toISOString(),
      walletType: 'solana',
    };

    await saveEncryptedWalletKey(next, 'solana');

    try {
      await decryptSolanaSecretKey(next.encryptedJson, newPassword);
    } catch (error) {
      throw new WalletReencryptError();
    }

    return next;
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
    walletType: 'ethereum',
  };

  await saveEncryptedWalletKey(next, 'ethereum');

  try {
    await decryptWalletKey(next.encryptedJson, newPassword);
  } catch (error) {
    throw new WalletReencryptError();
  }

  return next;
}

export async function markBackupCompleted(walletType: WalletKind = getActiveWalletType()): Promise<void> {
  const { listKey } = getStorageKeys(walletType);
  const records = await loadWalletRecords(walletType);
  if (!records.length) return;
  const activeId = await getActiveWalletId(walletType);
  if (!activeId) return;
  const next = records.map((record) =>
    record.id === activeId
      ? { ...record, backupCompleted: true, updatedAt: new Date().toISOString(), walletType }
      : record,
  );
  await setJson(listKey, next);
}

export async function clearWallet(walletType: WalletKind = getActiveWalletType()): Promise<void> {
  const { metadataKey, secureKey, listKey, activeIdKey, walletSecureKey } = getStorageKeys(walletType);
  const records = await loadWalletRecords(walletType);
  await Promise.all(records.map((record) => deleteSecureItem(walletSecureKey(record.id))));
  await Promise.all([removeKey(metadataKey), deleteSecureItem(secureKey), removeKey(listKey), removeKey(activeIdKey)]);

  if (walletType === 'ethereum') {
    await Promise.all([removeKey(LEGACY_METADATA_KEY), deleteSecureItem(LEGACY_SECURE_KEY), removeKey(LEGACY_KEY)]);
  }
}
