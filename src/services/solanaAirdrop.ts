import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getSolanaConnection } from './solanaProvider';

export async function requestSolAirdrop(address: string, amountSol: number): Promise<string> {
  const connection = getSolanaConnection();
  const lamports = amountSol * LAMPORTS_PER_SOL;
  const signature = await connection.requestAirdrop(new PublicKey(address), lamports);
  await connection.confirmTransaction(signature, 'confirmed');
  return signature;
}
