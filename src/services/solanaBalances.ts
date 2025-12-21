import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getSolanaConnection } from './solanaProvider';

export async function fetchSolBalance(address: string): Promise<number> {
  const connection = getSolanaConnection();
  const balance = await connection.getBalance(new PublicKey(address));
  return balance / LAMPORTS_PER_SOL;
}
