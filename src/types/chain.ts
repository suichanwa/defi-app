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
