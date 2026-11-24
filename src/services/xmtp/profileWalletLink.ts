import { getActiveWalletId } from '@services/walletKeyStore';
import { isEvmAddress } from './signer';
import { isSolanaAddress } from './addressResolver';

type UpsertWalletLinkArgs = {
  evmWalletAddress?: string | null;
  solanaWalletAddress?: string | null;
  xmtpInboxId?: string | null;
};

export type WalletLinkPublishResult =
  | { ok: true; profileId: string; evmWalletAddress?: string; solanaWalletAddress?: string; xmtpInboxId?: string }
  | { ok: false; reason: string };

const normalizeEvm = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return isEvmAddress(normalized) ? normalized : undefined;
};

const normalizeSolana = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim();
  return isSolanaAddress(normalized) ? normalized : undefined;
};

export async function readLocalWalletLinkCandidates() {
  const [solanaWalletAddress, ethereumWalletAddress] = await Promise.all([
    getActiveWalletId('solana'),
    getActiveWalletId('ethereum'),
  ]);

  return {
    solanaWalletAddress: normalizeSolana(solanaWalletAddress) ?? undefined,
    ethereumWalletAddress: normalizeEvm(ethereumWalletAddress) ?? undefined,
  };
}

export async function publishWalletLinkToProfile(_args: UpsertWalletLinkArgs): Promise<WalletLinkPublishResult> {
  return { ok: false, reason: 'serverless_mode_directory_unavailable' };
}
