import type { WalletKind } from '../types/wallet';
import { getJson, setJson } from './storage';

const ACTIVE_WALLET_TYPE_KEY = 'wallet.activeType.v1';

export async function getActiveWalletType(): Promise<WalletKind> {
  const stored = await getJson<WalletKind>(ACTIVE_WALLET_TYPE_KEY);
  return stored ?? 'solana';
}

export async function setActiveWalletType(walletType: WalletKind): Promise<void> {
  await setJson(ACTIVE_WALLET_TYPE_KEY, walletType);
}