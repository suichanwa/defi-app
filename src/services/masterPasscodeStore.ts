import { getJson, setJson } from './storage';
import { pbkdf2 as pbkdf2Callback } from 'pbkdf2';
import { Buffer } from 'buffer';
import { tryRustHashPasscode, tryRustVerifyPasscode } from './rustWalletCryptoNative';

const MASTER_PASSCODE_KEY = 'wallet.master.passcode.v1';
const MASTER_PASSCODE_SET_KEY = 'wallet.master.passcode.set.v1';
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;

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

/**
 * Create a hash of the passcode for verification
 */
async function hashPasscode(passcode: string): Promise<string> {
  const rustHash = await tryRustHashPasscode(passcode);
  if (rustHash) return rustHash;

  const salt = getRandomBytes(SALT_LENGTH);
  const key = await deriveKey(passcode, salt);
  return bufferToHex(salt) + ':' + bufferToHex(key);
}

/**
 * Verify a passcode against the stored hash
 */
async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  const rustResult = await tryRustVerifyPasscode(passcode, hash);
  if (rustResult !== null) return rustResult;

  try {
    const [saltHex, expectedKeyHex] = hash.split(':');
    if (!saltHex || !expectedKeyHex) return false;
    
    const salt = hexToBuffer(saltHex);
    const key = await deriveKey(passcode, salt);
    const keyHex = bufferToHex(key);
    
    return keyHex === expectedKeyHex;
  } catch {
    return false;
  }
}

/**
 * Check if master passcode has been set
 */
export async function isMasterPasscodeSet(): Promise<boolean> {
  const [isSet, existingHash] = await Promise.all([
    getJson<boolean>(MASTER_PASSCODE_SET_KEY),
    getMasterPasscodeHash(),
  ]);

  if (Boolean(isSet)) return true;

  // Backward compatibility: hash exists but legacy "set" flag is missing.
  if (existingHash) {
    await setMasterPasscodeFlag();
    return true;
  }

  return false;
}

/**
 * Set the master passcode flag
 */
async function setMasterPasscodeFlag(): Promise<void> {
  await setJson(MASTER_PASSCODE_SET_KEY, true);
}

/**
 * Clear the master passcode flag
 */
async function clearMasterPasscodeFlag(): Promise<void> {
  await setJson(MASTER_PASSCODE_SET_KEY, false);
}

/**
 * Get the encrypted master passcode hash
 * This is used to verify the passcode without storing it in plain text
 */
export async function getMasterPasscodeHash(): Promise<string | null> {
  return getJson<string>(MASTER_PASSCODE_KEY);
}

/**
 * Save the encrypted master passcode hash
 */
async function saveMasterPasscodeHash(hash: string): Promise<void> {
  await setJson(MASTER_PASSCODE_KEY, hash);
  await setMasterPasscodeFlag();
}

/**
 * Clear the master passcode (used when resetting)
 */
export async function clearMasterPasscode(): Promise<void> {
  await setJson(MASTER_PASSCODE_KEY, null);
  await clearMasterPasscodeFlag();
}

/**
 * Verify master passcode or set it if this is the first wallet
 */
export async function verifyOrSetMasterPasscode(passcode: string): Promise<boolean> {
  const existingHash = await getMasterPasscodeHash();
  
  if (!existingHash) {
    // First time - set the master passcode
    const hash = await hashPasscode(passcode);
    await saveMasterPasscodeHash(hash);
    return true;
  }
  
  // Verify against existing
  const isValid = await verifyPasscode(passcode, existingHash);
  if (isValid) {
    // Keep migration-safe flag synced for older installs.
    await setMasterPasscodeFlag();
  }
  return isValid;
}
