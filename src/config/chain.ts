import { ETHEREUM_RPC_URL } from '@env';

export const CHAIN = {
  name: 'Ethereum',
  chainId: 1,
  rpcUrl: ETHEREUM_RPC_URL,
  explorerBaseUrl: 'https://etherscan.io',
} as const;
