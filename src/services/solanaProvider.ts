import { Connection, type Commitment } from '@solana/web3.js';
import { getActiveChain, isSolanaChain } from '../config/chain';
import { RpcConfigurationError } from './provider';

let connection: Connection | null = null;

export function getSolanaConnection(): Connection {
  if (connection) return connection;
  const chain = getActiveChain();
  if (!isSolanaChain(chain)) {
    throw new RpcConfigurationError('Solana connection requested while the active chain is not Solana.');
  }
  const rpcUrl = chain.rpcUrl?.trim();
  if (!rpcUrl) {
    throw new RpcConfigurationError('Solana RPC URL is not configured. Set SOLANA_RPC_URL.');
  }
  if (rpcUrl.includes('YOUR_KEY')) {
    throw new RpcConfigurationError('Solana RPC URL uses a placeholder key. Update SOLANA_RPC_URL.');
  }
  connection = new Connection(rpcUrl, { commitment: 'confirmed', disableRetryOnRateLimit: true });
  return connection;
}

export function resetSolanaConnection() {
  connection = null;
}

const CONFIRM_POLL_INTERVAL_MS = 2_000;
const CONFIRM_TIMEOUT_MS = 60_000;

// Polls over HTTP instead of connection.confirmTransaction(), which relies on
// WebSocket signatureSubscribe — rejected by public devnet RPC endpoints.
export async function confirmSignatureByPolling(
  connection: Connection,
  signature: string,
  commitment: Commitment = 'confirmed',
): Promise<void> {
  const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { value } = await connection.getSignatureStatus(signature);
    if (value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(value.err)}`);
    }
    const status = value?.confirmationStatus;
    if (status === 'finalized' || (commitment !== 'finalized' && status === 'confirmed')) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, CONFIRM_POLL_INTERVAL_MS));
  }
  throw new Error(`Transaction confirmation timed out for signature ${signature}`);
}
