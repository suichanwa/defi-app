import { requestSolAirdrop } from '../src/services/airdrop/solanaAirdrop.service';
import { getSolanaConnection, confirmSignatureByPolling } from '../src/services/solanaProvider';

jest.mock('../src/services/solanaProvider', () => ({
  getSolanaConnection: jest.fn(),
  confirmSignatureByPolling: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@solana/web3.js', () => {
  class PublicKey {
    value: string;

    constructor(value: string) {
      this.value = value;
    }
  }

  const LAMPORTS_PER_SOL = 1_000_000_000;

  return { PublicKey, LAMPORTS_PER_SOL };
});

describe('requestSolAirdrop', () => {
  it('requests and confirms a 1 SOL devnet airdrop for the user address', async () => {
    const mockConnection = {
      requestAirdrop: jest.fn().mockResolvedValue('airdrop-signature'),
    };

    (getSolanaConnection as jest.Mock).mockReturnValue(mockConnection);

    const result = await requestSolAirdrop({
      address: 'devnet-user-address',
      amountSol: 1,
      commitment: 'confirmed',
    });

    expect(mockConnection.requestAirdrop).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'devnet-user-address' }),
      1_000_000_000,
    );
    expect(confirmSignatureByPolling).toHaveBeenCalledWith(
      mockConnection,
      'airdrop-signature',
      'confirmed',
    );
    expect(result).toEqual({ signature: 'airdrop-signature' });
  });
});
