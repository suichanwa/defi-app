import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  removeWalletRecord,
  saveEncryptedWalletKey,
  getActiveWalletId,
  loadWalletRecords,
  hasAnyWallets,
  clearWallet,
} from '../src/services/walletKeyStore';
import {
  clearMasterPasscode,
  isMasterPasscodeSet,
  verifyOrSetMasterPasscode,
} from '../src/services/masterPasscodeStore';

jest.mock('../src/services/rustWalletCryptoNative', () => ({
  isRustWalletStoreAvailable: jest.fn(async () => false),
  tryRustEncryptWalletKey: jest.fn(async () => null),
  tryRustDecryptWalletKey: jest.fn(async () => null),
  tryRustHashPasscode: jest.fn(async () => null),
  tryRustVerifyPasscode: jest.fn(async () => null),
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

describe('wallet removal and master passcode reset', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearWallet();
    await clearMasterPasscode();
  });

  it('clears active wallet ID and reflects empty records when last wallet is removed', async () => {
    const dummyRecord = {
      id: '0x1234567890abcdef',
      encryptedJson: '{}',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      backupCompleted: false,
      walletType: 'ethereum' as const,
    };

    await saveEncryptedWalletKey(dummyRecord, 'ethereum');
    expect(await getActiveWalletId('ethereum')).toBe(dummyRecord.id);
    expect(await hasAnyWallets()).toBe(true);

    // Set master passcode
    await verifyOrSetMasterPasscode('123456');
    expect(await isMasterPasscodeSet()).toBe(true);

    // Remove the only wallet
    await removeWalletRecord(dummyRecord.id, 'ethereum');

    const records = await loadWalletRecords('ethereum');
    expect(records).toHaveLength(0);
    expect(await getActiveWalletId('ethereum')).toBeNull();
    expect(await hasAnyWallets()).toBe(false);

    // Clear passcode like provider does when last wallet is gone
    await clearMasterPasscode();
    expect(await isMasterPasscodeSet()).toBe(false);
  });
});
