import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getSolanaConnection } from '@services/solanaProvider';
import type { SolAirdropRequest, SolAirdropResult } from './airdrop.types';

export async function requestSolAirdrop({
  address,
  amountSol,
  commitment = 'confirmed',
}: SolAirdropRequest): Promise<SolAirdropResult> {
  const connection = getSolanaConnection();
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
  const publicKey = new PublicKey(address);

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash(commitment);
  const signature = await connection.requestAirdrop(publicKey, lamports);

  await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    commitment,
  );

  return { signature };
}
