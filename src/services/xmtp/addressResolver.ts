import { PublicKey } from '@solana/web3.js';
import { isEvmAddress } from './signer';

export type ResolvedPeerXmtpAddress = {
  input: string;
  xmtpEvmAddress: string;
  source: 'evm' | 'solana';
  profileId?: string;
  alias?: string;
};

export const isSolanaAddress = (value: string): boolean => {
  const candidate = value.trim();
  if (!candidate) return false;
  try {
    const key = new PublicKey(candidate);
    return key.toBase58() === candidate;
  } catch {
    return false;
  }
};

const normalizeEvmAddress = (value: string) => value.trim().toLowerCase();

export async function resolvePeerXmtpAddress(inputAddress: string): Promise<ResolvedPeerXmtpAddress> {
  const normalizedInput = inputAddress.trim();
  if (!normalizedInput) {
    throw new Error('Enter a wallet address (Ethereum 0x... or Solana base58).');
  }

  if (isEvmAddress(normalizedInput)) {
    return {
      input: normalizedInput,
      xmtpEvmAddress: normalizeEvmAddress(normalizedInput),
      source: 'evm',
    };
  }

  if (!isSolanaAddress(normalizedInput)) {
    throw new Error('Unsupported address format. Use Ethereum (0x...) or Solana address.');
  }

  throw new Error('Solana-to-XMTP address lookup requires an Ethereum 0x address in serverless local mode.');
}
