import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { confirmSignatureByPolling, getSolanaConnection } from './solanaProvider';
import type { Keypair } from '@solana/web3.js';

export async function sendSolTransfer(fromKeypair: Keypair, toAddress: string, amountSol: number): Promise<string> {
  const connection = getSolanaConnection();
  const toPubkey = new PublicKey(toAddress);
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey,
      lamports,
    }),
  );
  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  transaction.feePayer = fromKeypair.publicKey;
  transaction.recentBlockhash = latestBlockhash.blockhash;
  transaction.sign(fromKeypair);
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
  });
  await confirmSignatureByPolling(connection, signature, 'confirmed');
  return signature;
}
