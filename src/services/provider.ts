import { JsonRpcProvider } from 'ethers';
import { CHAIN } from '../config/chain';

let provider: JsonRpcProvider | null = null;

export function getProvider(): JsonRpcProvider {
  if (provider) return provider;
  provider = new JsonRpcProvider(CHAIN.rpcUrl, {
    name: CHAIN.name,
    chainId: CHAIN.chainId,
  });
  return provider;
}
