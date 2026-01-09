import type { ChainConfig, EthereumChain, SolanaChain } from '@app-types/chain';
import { CHAINS } from '@constants/chain.constants';

export type { ChainConfig, EthereumChain, SolanaChain } from '@app-types/chain';

export type ChainKey = keyof typeof CHAINS;

let activeChainKey: ChainKey = 'solanaDevnet';

export const getActiveChainKey = () => activeChainKey;
export const setActiveChainKey = (nextKey: ChainKey) => {
  if (CHAINS[nextKey]) {
    activeChainKey = nextKey;
  }
};
export const getActiveChain = () => CHAINS[activeChainKey];

export { CHAINS };

export const isSolanaChain = (chain: ChainConfig): chain is SolanaChain => chain.kind === 'solana';

export const isEthereumChain = (chain: ChainConfig): chain is EthereumChain => chain.kind === 'ethereum';

export const getSolanaClusterLabel = (cluster: SolanaChain['cluster']) =>
  cluster === 'mainnet-beta' ? 'Mainnet Beta' : 'Devnet';

export const getExplorerAddressUrl = (chain: ChainConfig, address: string) => {
  if (chain.kind === 'solana') {
    const clusterSuffix = chain.cluster === 'mainnet-beta' ? '' : `?cluster=${chain.cluster}`;
    return `${chain.explorerBaseUrl}/address/${address}${clusterSuffix}`;
  }
  return `${chain.explorerBaseUrl}/address/${address}`;
};
