import { getAuthSession } from '@services/auth';
import { getAnonymousId, toAnonymousProfileId } from '@services/identity';
import { isSupabaseConfigured, supabase } from '@services/supabaseClient';
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

const resolveProfileId = async (): Promise<string | null> => {
  const session = await getAuthSession();
  if (session?.user?.id) {
    return session.user.id;
  }
  const anonId = await getAnonymousId();
  return toAnonymousProfileId(anonId);
};

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

const buildUpdatePayload = (args: UpsertWalletLinkArgs) => {
  const payload: Record<string, string> = {};
  const evmWalletAddress = normalizeEvm(args.evmWalletAddress);
  const solanaWalletAddress = normalizeSolana(args.solanaWalletAddress);
  const xmtpInboxId = args.xmtpInboxId?.trim();

  if (evmWalletAddress) payload.evm_wallet_address = evmWalletAddress;
  if (solanaWalletAddress) payload.solana_wallet_address = solanaWalletAddress;
  if (xmtpInboxId) payload.xmtp_inbox_id = xmtpInboxId;
  if (Object.keys(payload).length > 0) {
    payload.updated_at = new Date().toISOString();
  }
  return payload;
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

export async function publishWalletLinkToProfile(args: UpsertWalletLinkArgs): Promise<WalletLinkPublishResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, reason: 'supabase_not_configured' };
  }

  const profileId = await resolveProfileId();
  if (!profileId) {
    return { ok: false, reason: 'profile_id_unavailable' };
  }

  const updatePayload = buildUpdatePayload(args);
  if (Object.keys(updatePayload).length === 0) {
    return { ok: false, reason: 'no_wallet_data' };
  }

  const { data: existingRow, error: readError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', profileId)
    .maybeSingle();

  if (readError) {
    return { ok: false, reason: `read_failed:${readError.message}` };
  }

  if (existingRow?.id) {
    const { error: updateError } = await supabase.from('user_profiles').update(updatePayload).eq('id', profileId);
    if (updateError) {
      return { ok: false, reason: `update_failed:${updateError.message}` };
    }
  } else {
    const insertPayload = {
      id: profileId,
      ...updatePayload,
    };
    const { error: insertError } = await supabase.from('user_profiles').insert(insertPayload);
    if (insertError) {
      return { ok: false, reason: `insert_failed:${insertError.message}` };
    }
  }

  return {
    ok: true,
    profileId,
    evmWalletAddress: updatePayload.evm_wallet_address,
    solanaWalletAddress: updatePayload.solana_wallet_address,
    xmtpInboxId: updatePayload.xmtp_inbox_id,
  };
}
