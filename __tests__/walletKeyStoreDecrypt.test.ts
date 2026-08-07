import { decryptWalletKey, encryptWalletKey, isAppEncryptedWalletPayload } from '../src/services/walletKeyStore';

jest.mock('../src/services/rustWalletCryptoNative', () => ({
  isRustWalletStoreAvailable: jest.fn(async () => false),
  tryRustEncryptWalletKey: jest.fn(async () => null),
  tryRustDecryptWalletKey: jest.fn(async () => null),
  tryRustClearWallet: jest.fn(async () => false),
  tryRustGetActiveWalletId: jest.fn(async () => null),
  tryRustLoadEncryptedWalletKey: jest.fn(async () => null),
  tryRustLoadEncryptedWalletKeyById: jest.fn(async () => null),
  tryRustLoadWalletRecords: jest.fn(async () => null),
  tryRustMarkBackupCompleted: jest.fn(async () => false),
  tryRustRemoveWalletRecord: jest.fn(async () => false),
  tryRustSaveEncryptedWalletKey: jest.fn(async () => false),
  tryRustSetActiveWalletId: jest.fn(async () => false),
  tryRustUpdateWalletRecordMeta: jest.fn(async () => null),
}));

const PRIVATE_KEY = `0x${'ab'.repeat(32)}`;

describe('decryptWalletKey passcode validation', () => {
  it('round-trips the private key with the right passcode', async () => {
    const { encryptedJson } = await encryptWalletKey(PRIVATE_KEY, 'correct-horse');
    expect(isAppEncryptedWalletPayload(encryptedJson)).toBe(true);
    await expect(decryptWalletKey(encryptedJson, 'correct-horse')).resolves.toBe(PRIVATE_KEY);
  });

  it('rejects a wrong passcode instead of returning garbage', async () => {
    const { encryptedJson } = await encryptWalletKey(PRIVATE_KEY, 'correct-horse');
    // AES-CTR has no MAC, so this only fails if the plaintext check is doing its job.
    await expect(decryptWalletKey(encryptedJson, 'wrong-horse')).rejects.toThrow(/Invalid password/);
  });

  it('does not claim legacy ethers JSON as an app payload', () => {
    expect(isAppEncryptedWalletPayload('{"address":"abc","crypto":{"cipher":"aes-128-ctr"}}')).toBe(false);
  });
});
