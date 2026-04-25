import type { WalletKind } from '../types/wallet';
import { getJson, setJson } from './storage';
import { getActiveChain } from '../config/chain';

const ACTIVE_WALLET_TYPE_KEY = 'wallet.activeType.v1';

export async function getActiveWalletType(): Promise<WalletKind> {
  const stored = await getJson<WalletKind>(ACTIVE_WALLET_TYPE_KEY);
  if (stored === 'ethereum' || stored === 'solana') {
    return stored;
  }
  return getActiveChain().kind;
}

export async function setActiveWalletType(walletType: WalletKind): Promise<void> {
  await setJson(ACTIVE_WALLET_TYPE_KEY, walletType);
}
