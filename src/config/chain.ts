import { ETHEREUM_RPC_URL, SOLANA_RPC_URL } from '@env';

export type ChainKind = 'ethereum' | 'solana';

export type NativeToken = {
  name: string;
  symbol: string;
  decimals: number;
  priceSymbol: string;
  color: string;
};

export type EthereumChain = {
  kind: 'ethereum';
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerBaseUrl: string;
  nativeToken: NativeToken;
};

export type SolanaChain = {
  kind: 'solana';
  name: string;
  cluster: 'devnet' | 'mainnet-beta';
  rpcUrl: string;
  explorerBaseUrl: string;
  nativeToken: NativeToken;
};

export type ChainConfig = EthereumChain | SolanaChain;

const defaultSolanaRpcByCluster: Record<SolanaChain['cluster'], string> = {
  devnet: 'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
};

export const CHAINS: Record<string, ChainConfig> = {
  solanaDevnet: {
    kind: 'solana',
    name: 'Solana Devnet',
    cluster: 'devnet',
    rpcUrl: SOLANA_RPC_URL?.trim() || defaultSolanaRpcByCluster.devnet,
    explorerBaseUrl: 'https://explorer.solana.com',
    nativeToken: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
      priceSymbol: 'SOLUSDT',
      color: '#14f195',
    },
  },
  solanaMainnet: {
    kind: 'solana',
    name: 'Solana',
    cluster: 'mainnet-beta',
    rpcUrl: SOLANA_RPC_URL?.trim() || defaultSolanaRpcByCluster['mainnet-beta'],
    explorerBaseUrl: 'https://explorer.solana.com',
    nativeToken: {
      name: 'Solana',
      symbol: 'SOL',
      decimals: 9,
      priceSymbol: 'SOLUSDT',
      color: '#14f195',
    },
  },
  ethereumMainnet: {
    kind: 'ethereum',
    name: 'Ethereum',
    chainId: 1,
    rpcUrl: ETHEREUM_RPC_URL,
    explorerBaseUrl: 'https://etherscan.io',
    nativeToken: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      priceSymbol: 'ETHUSDT',
      color: '#6b8cef',
    },
  },
};

export const CHAIN = CHAINS.solanaDevnet;

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
