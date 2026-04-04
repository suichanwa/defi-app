import { sendEthTransfer, sendErc20Transfer } from '../src/services/ethereumTransfers';

jest.mock('../src/services/provider', () => ({
  getProvider: jest.fn(() => ({})),
}));

jest.mock('ethers', () => {
  const parseEther = (val: string) => BigInt(Math.round(parseFloat(val) * 1e18));
  const parseUnits = (val: string, decimals: number) =>
    BigInt(Math.round(parseFloat(val) * 10 ** decimals));

  const mockTx = {
    hash: '0xmockhash',
    wait: jest.fn().mockResolvedValue({ hash: '0xreceipthash' }),
  };

  class Contract {
    transfer: jest.Mock;
    constructor(_address: string, _abi: unknown, _signer: unknown) {
      this.transfer = jest.fn().mockResolvedValue(mockTx);
    }
  }

  const mockWallet = {
    connect: jest.fn().mockReturnThis(),
    sendTransaction: jest.fn().mockResolvedValue(mockTx),
    provider: null,
    address: '0xsender',
  };

  return { Contract, parseEther, parseUnits, Wallet: mockWallet, HDNodeWallet: mockWallet };
});

describe('sendEthTransfer', () => {
  it('sends an ETH transfer and returns the receipt hash', async () => {
    const { Wallet } = jest.requireMock('ethers');
    const hash = await sendEthTransfer(Wallet as any, '0xrecipient', 0.5);
    expect(hash).toBe('0xreceipthash');
  });

  it('falls back to tx.hash when receipt is null', async () => {
    const { Wallet } = jest.requireMock('ethers');
    const mockTxNoReceipt = {
      hash: '0xfallbackhash',
      wait: jest.fn().mockResolvedValue(null),
    };
    Wallet.sendTransaction.mockResolvedValueOnce(mockTxNoReceipt);
    const hash = await sendEthTransfer(Wallet as any, '0xrecipient', 1);
    expect(hash).toBe('0xfallbackhash');
  });
});

describe('sendErc20Transfer', () => {
  it('sends an ERC-20 transfer and returns the receipt hash', async () => {
    const { Wallet } = jest.requireMock('ethers');
    const token = { address: '0xtoken', decimals: 18, symbol: 'TKN' } as any;
    const hash = await sendErc20Transfer(Wallet as any, token, '0xrecipient', 10);
    expect(hash).toBe('0xreceipthash');
  });
});
