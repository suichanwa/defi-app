import { requestSolAirdrop } from '../src/services/airdrop/solanaAirdrop.service';
import { getSolanaConnection } from '../src/services/solanaProvider';

jest.mock('../src/services/solanaProvider', () => ({
  getSolanaConnection: jest.fn(),
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
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: 'blockhash',
        lastValidBlockHeight: 99,
      }),
      requestAirdrop: jest.fn().mockResolvedValue('airdrop-signature'),
      confirmTransaction: jest.fn().mockResolvedValue({}),
    };

    (getSolanaConnection as jest.Mock).mockReturnValue(mockConnection);

    const result = await requestSolAirdrop({
      address: 'devnet-user-address',
      amountSol: 1,
      commitment: 'confirmed',
    });

    expect(mockConnection.getLatestBlockhash).toHaveBeenCalledWith('confirmed');
    expect(mockConnection.requestAirdrop).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'devnet-user-address' }),
      1_000_000_000,
    );
    expect(mockConnection.confirmTransaction).toHaveBeenCalledWith(
      {
        signature: 'airdrop-signature',
        blockhash: 'blockhash',
        lastValidBlockHeight: 99,
      },
      'confirmed',
    );
    expect(result).toEqual({ signature: 'airdrop-signature' });
  });
});
