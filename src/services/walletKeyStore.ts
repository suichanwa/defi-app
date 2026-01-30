import type { EncryptedWalletKey, WalletKind, WalletRecordMeta } from '@app-types/wallet';
import { getJson, removeKey, setJson } from './storage';
import { getActiveWalletType } from '@config/chain';

const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

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

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

export async function encryptWalletKey(privateKey: string, password: string): Promise<EncryptedWalletKey> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(password, salt);

  const plaintext = new TextEncoder().encode(privateKey);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    plaintext.buffer as ArrayBuffer
  );

  const payload = {
    salt: bufferToHex(salt.buffer as ArrayBuffer),
    iv: bufferToHex(iv.buffer as ArrayBuffer),
    ciphertext: bufferToHex(ciphertext),
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
  const salt = hexToBuffer(payload.salt);
  const iv = hexToBuffer(payload.iv);
  const ciphertext = hexToBuffer(payload.ciphertext);

  const key = await deriveKey(password, salt);

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext.buffer as ArrayBuffer
    );
    return new TextDecoder().decode(plaintext);
  } catch (error) {
    throw new Error('Incorrect password or corrupted data.');
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
