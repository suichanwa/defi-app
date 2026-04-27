import React, { useEffect } from 'react';
import renderer, { act } from 'react-test-renderer';

const mockSetChainKey = jest.fn();
const mockSwitchWallet = jest.fn();
const mockGetActiveWalletId = jest.fn();
const mockLoadEncryptedWalletKeyById = jest.fn();
const mockLoadWalletRecords = jest.fn();
const mockCreate = jest.fn();
const mockDropClient = jest.fn().mockResolvedValue(undefined);
const mockGetOrCreateXmtpDbKey = jest.fn().mockResolvedValue('db-key');
const mockPublishWalletLinkToProfile = jest.fn().mockResolvedValue({ ok: true });
const mockReadLocalWalletLinkCandidates = jest.fn().mockResolvedValue({ solanaWalletAddress: null });

let mockCurrentChainKey: 'solanaDevnet' | 'solanaMainnet' | 'ethereumMainnet' = 'solanaDevnet';
let mockCurrentWalletAddress = 'So1ana111111111111111111111111111111111111';
let mockCurrentWallet = { kind: 'solana' };

jest.mock('../src/context/ChainProvider', () => ({
  useChain: () => ({
    chainKey: mockCurrentChainKey,
    setChainKey: async (nextKey: 'solanaDevnet' | 'solanaMainnet' | 'ethereumMainnet') => {
      mockCurrentChainKey = nextKey;
      mockSetChainKey(nextKey);
    },
  }),
}));

jest.mock('../src/context/WalletSessionProvider', () => ({
  useWalletSession: () => ({
    status: 'unlocked',
    wallet: mockCurrentWallet,
    address: mockCurrentWalletAddress,
    switchWallet: async (walletId: string) => {
      mockSwitchWallet(walletId);
      mockCurrentWalletAddress = walletId;
      mockCurrentWallet = { kind: 'ethereum' };
    },
  }),
}));

jest.mock('@services/xmtp/dbKeyStore', () => ({
  getOrCreateXmtpDbKey: (...args: unknown[]) => mockGetOrCreateXmtpDbKey(...args),
}));

jest.mock('@services/xmtp/profileWalletLink', () => ({
  publishWalletLinkToProfile: (...args: unknown[]) => mockPublishWalletLinkToProfile(...args),
  readLocalWalletLinkCandidates: (...args: unknown[]) => mockReadLocalWalletLinkCandidates(...args),
}));

jest.mock('@services/xmtp/signer', () => ({
  createXmtpEoaSigner: jest.fn(),
  isEvmAddress: (value: string) => value.startsWith('0x'),
  isEvmMessageSigner: (wallet: { kind?: string }) => wallet?.kind === 'ethereum',
}));

jest.mock('@services/xmtp/sdk', () => ({
  createXmtpReadReceiptCodec: jest.fn().mockReturnValue({ contentKey: 'readReceipt' }),
  getXmtpSdkErrorMessage: jest.fn().mockReturnValue(null),
  isXmtpNativeModuleAvailable: jest.fn().mockReturnValue(true),
  XmtpClient: {
    create: (...args: unknown[]) => mockCreate(...args),
    dropClient: (...args: unknown[]) => mockDropClient(...args),
  },
}));

jest.mock('@services/walletKeyStore', () => ({
  getActiveWalletId: (...args: unknown[]) => mockGetActiveWalletId(...args),
  loadEncryptedWalletKeyById: (...args: unknown[]) => mockLoadEncryptedWalletKeyById(...args),
  loadWalletRecords: (...args: unknown[]) => mockLoadWalletRecords(...args),
}));

jest.mock('@services/xmtp/config', () => ({
  getXmtpEnvironment: () => 'dev',
}));

jest.mock('@services/xmtp/constants', () => ({
  XMTP_APP_VERSION: 'test-version',
}));

const { XmtpProvider, useXmtpClient } = require('../src/context/XmtpProvider');

function Probe() {
  const { status, error } = useXmtpClient();

  useEffect(() => {
    void status;
    void error;
  }, [status, error]);

  return null;
}

describe('XmtpProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentChainKey = 'solanaDevnet';
    mockCurrentWalletAddress = 'So1ana111111111111111111111111111111111111';
    mockCurrentWallet = { kind: 'solana' };

    mockGetActiveWalletId.mockResolvedValue('0xabc1234567890abc1234567890abc1234567890a');
    mockLoadEncryptedWalletKeyById.mockResolvedValue({ id: '0xabc1234567890abc1234567890abc1234567890a' });
    mockLoadWalletRecords.mockResolvedValue([{ id: '0xabc1234567890abc1234567890abc1234567890a' }]);
    mockCreate.mockResolvedValue({
      inboxId: 'inbox-1',
      installationId: 'installation-1',
    });
  });

  it('switches to the Ethereum chain and wallet when the active wallet is not EVM', async () => {
    await act(async () => {
      renderer.create(
        <XmtpProvider>
          <Probe />
        </XmtpProvider>,
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSetChainKey).toHaveBeenCalledWith('ethereumMainnet');
    expect(mockSwitchWallet).toHaveBeenCalledWith('0xabc1234567890abc1234567890abc1234567890a');
    expect(mockGetActiveWalletId).toHaveBeenCalledWith('ethereum');
    expect(mockLoadEncryptedWalletKeyById).toHaveBeenCalledWith('0xabc1234567890abc1234567890abc1234567890a', 'ethereum');
  });
});
