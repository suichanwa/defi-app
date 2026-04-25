import { PublicKey } from '@solana/web3.js';
import { isSupabaseConfigured, supabase } from '@services/supabaseClient';
import { isEvmAddress } from './signer';

type WalletLinkRow = {
  id: string;
  alias: string | null;
  evm_wallet_address: string | null;
};

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

  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Solana lookup requires Supabase profile mapping to be configured.');
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, alias, evm_wallet_address, updated_at')
    .eq('solana_wallet_address', normalizedInput)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to resolve Solana wallet: ${error.message}`);
  }

  const row = (data?.[0] ?? null) as WalletLinkRow | null;
  const mappedEvmAddress = row?.evm_wallet_address?.trim();
  if (!mappedEvmAddress || !isEvmAddress(mappedEvmAddress)) {
    throw new Error(
      'This Solana wallet is not linked to an XMTP-enabled Ethereum wallet yet. Ask the user to open chat once with their Ethereum wallet to publish the link.',
    );
  }

  return {
    input: normalizedInput,
    xmtpEvmAddress: normalizeEvmAddress(mappedEvmAddress),
    source: 'solana',
    profileId: row?.id ?? undefined,
    alias: row?.alias?.trim() || undefined,
  };
}
