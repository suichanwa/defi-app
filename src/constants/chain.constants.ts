import { ETHEREUM_RPC_URL, SOLANA_RPC_URL } from '@env';
import type { ChainConfig, SolanaChain } from '@app-types/chain';

export const defaultSolanaRpcByCluster: Record<SolanaChain['cluster'], string> = {
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
