import { sendSolTransfer } from '../src/services/solanaTransfers';
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
  class Transaction {
    instructions: any[] = [];
    feePayer?: any;
    recentBlockhash?: string;
    add(instruction: any) {
      this.instructions.push(instruction);
      return this;
    }
    sign() {
      return this;
    }
    serialize() {
      return Uint8Array.from([1, 2, 3]);
    }
  }
  const SystemProgram = {
    transfer: (params: any) => ({ ...params, type: 'transfer' }),
  };
  const LAMPORTS_PER_SOL = 1_000_000_000;
  class Keypair {
    publicKey: PublicKey;
    constructor() {
      this.publicKey = new PublicKey('from-key');
    }
  }
  return { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair };
});

describe('sendSolTransfer', () => {
  it('sends and confirms a transfer with a mocked connection', async () => {
    const mockConnection = {
      getLatestBlockhash: jest.fn().mockResolvedValue({
        blockhash: 'blockhash',
        lastValidBlockHeight: 99,
      }),
      sendRawTransaction: jest.fn().mockResolvedValue('signature'),
      confirmTransaction: jest.fn().mockResolvedValue({}),
    };
    (getSolanaConnection as jest.Mock).mockReturnValue(mockConnection);

    const { Keypair } = jest.requireMock('@solana/web3.js');
    const keypair = new Keypair();

    const signature = await sendSolTransfer(keypair, 'to-address', 0.5);

    expect(mockConnection.getLatestBlockhash).toHaveBeenCalledWith('confirmed');
    expect(mockConnection.sendRawTransaction).toHaveBeenCalled();
    expect(mockConnection.confirmTransaction).toHaveBeenCalledWith(
      { signature: 'signature', blockhash: 'blockhash', lastValidBlockHeight: 99 },
      'confirmed',
    );
    expect(signature).toBe('signature');
  });
});
