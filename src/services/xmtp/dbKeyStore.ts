import * as Crypto from 'expo-crypto';
import { getSecureItem, setSecureItem } from '@services/secureStore';
import { XMTP_DB_KEY_PREFIX } from './constants';

const DB_KEY_BYTES = 32;

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex: string): Uint8Array | null => {
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  const out = new Uint8Array(DB_KEY_BYTES);
  for (let i = 0; i < DB_KEY_BYTES; i += 1) {
    const idx = i * 2;
    out[i] = Number.parseInt(hex.slice(idx, idx + 2), 16);
  }
  return out;
};

const keyForAddress = (address: string) => `${XMTP_DB_KEY_PREFIX}${address.toLowerCase()}`;

export async function getOrCreateXmtpDbKey(address: string): Promise<Uint8Array> {
  const storageKey = keyForAddress(address);
  const existing = await getSecureItem(storageKey);
  if (existing) {
    const parsed = hexToBytes(existing);
    if (parsed) return parsed;
  }

  const fresh = await Crypto.getRandomBytesAsync(DB_KEY_BYTES);
  await setSecureItem(storageKey, bytesToHex(fresh));
  return fresh;
}
