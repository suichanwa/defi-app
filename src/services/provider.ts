import { JsonRpcProvider } from 'ethers';
import { getActiveChain, isEthereumChain } from '../config/chain';

export class RpcConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RpcConfigurationError';
  }
}
  
let provider: JsonRpcProvider | null = null;

export function getProvider(): JsonRpcProvider {
  if (provider) return provider;
  const chain = getActiveChain();
  if (!isEthereumChain(chain)) {
    throw new RpcConfigurationError('Ethereum provider requested while the active chain is not Ethereum.');
  }
  const rpcUrl = chain.rpcUrl?.trim();
  if (!rpcUrl) {
    throw new RpcConfigurationError('Ethereum RPC URL is not configured. Set ETHEREUM_RPC_URL.');
  }
  if (rpcUrl.includes('YOUR_KEY')) {
    throw new RpcConfigurationError('Ethereum RPC URL uses a placeholder key. Update ETHEREUM_RPC_URL.');
  }
  provider = new JsonRpcProvider(rpcUrl, {
    name: chain.name,
    chainId: chain.chainId,
  });
  return provider;
}

export function resetProvider() {
  provider = null;
}
