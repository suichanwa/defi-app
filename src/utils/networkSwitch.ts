import { Platform } from 'react-native';
import { CHAINS, getSolanaClusterLabel, type ChainKey } from '@config/chain';

export type NetworkSwitchResult = 'unchanged' | 'missing' | 'reloaded' | 'locked';

const CHAIN_CYCLE: readonly ChainKey[] = ['solanaDevnet', 'solanaMainnet', 'ethereumMainnet'];

export function getNextChainKey(currentKey: ChainKey): ChainKey {
  const index = CHAIN_CYCLE.indexOf(currentKey);
  if (index === -1) return 'solanaDevnet';
  return CHAIN_CYCLE[(index + 1) % CHAIN_CYCLE.length];
}

type SwitchNetworkParams = {
  currentKey: ChainKey;
  nextKey: ChainKey;
  setChainKey: (key: ChainKey) => Promise<void>;
  lockForNetworkSwitch: (chainName?: string) => Promise<'locked' | 'missing'>;
  reloadOnWeb?: boolean;
};

/**
 * Persists a user-initiated network switch, locks the active wallet session so
 * the passcode prompt is shown, and reloads the page on web when requested.
 */
export async function switchNetworkAndRequireAuth({
  currentKey,
  nextKey,
  setChainKey,
  lockForNetworkSwitch,
  reloadOnWeb = true,
}: SwitchNetworkParams): Promise<NetworkSwitchResult> {
  if (nextKey === currentKey) {
    return 'unchanged';
  }

  const targetChain = CHAINS[nextKey];
  const nextChainName = targetChain
    ? targetChain.kind === 'solana'
      ? `Solana (${getSolanaClusterLabel(targetChain.cluster)})`
      : targetChain.name
    : String(nextKey);
  await setChainKey(nextKey);
  const sessionStatus = await lockForNetworkSwitch(nextChainName);

  if (sessionStatus === 'missing') {
    return 'missing';
  }

  if (Platform.OS === 'web' && reloadOnWeb) {
    const win = (globalThis as { window?: { location?: { reload?: () => void } } }).window;
    if (win?.location && typeof win.location.reload === 'function') {
      win.location.reload();
      return 'reloaded';
    }
  }

  return 'locked';
}
