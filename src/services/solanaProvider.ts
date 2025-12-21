import { Connection } from '@solana/web3.js';
import { CHAIN, isSolanaChain } from '../config/chain';
import { RpcConfigurationError } from './provider';

let connection: Connection | null = null;

export function getSolanaConnection(): Connection {
  if (connection) return connection;
  if (!isSolanaChain(CHAIN)) {
    throw new RpcConfigurationError('Solana connection requested while the active chain is not Solana.');
  }
  const rpcUrl = CHAIN.rpcUrl?.trim();
  if (!rpcUrl) {
    throw new RpcConfigurationError('Solana RPC URL is not configured. Set SOLANA_RPC_URL.');
  }
  if (rpcUrl.includes('YOUR_KEY')) {
    throw new RpcConfigurationError('Solana RPC URL uses a placeholder key. Update SOLANA_RPC_URL.');
  }
  connection = new Connection(rpcUrl, 'confirmed');
  return connection;
}
