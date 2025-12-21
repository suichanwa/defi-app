import { providers } from 'ethers';
import { CHAIN, isEthereumChain } from '../config/chain';

export class RpcConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RpcConfigurationError';
  }
}

let provider: providers.JsonRpcProvider | null = null;

export function getProvider(): providers.JsonRpcProvider {
  if (provider) return provider;
  if (!isEthereumChain(CHAIN)) {
    throw new RpcConfigurationError('Ethereum provider requested while the active chain is not Ethereum.');
  }
  const rpcUrl = CHAIN.rpcUrl?.trim();
  if (!rpcUrl) {
    throw new RpcConfigurationError('Ethereum RPC URL is not configured. Set ETHEREUM_RPC_URL.');
  }
  if (rpcUrl.includes('YOUR_KEY')) {
    throw new RpcConfigurationError('Ethereum RPC URL uses a placeholder key. Update ETHEREUM_RPC_URL.');
  }
  provider = new providers.JsonRpcProvider(rpcUrl, {
    name: CHAIN.name,
    chainId: CHAIN.chainId,
  });
  return provider;
}
