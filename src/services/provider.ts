import { providers } from 'ethers';
import { CHAIN } from '../config/chain';

let provider: providers.JsonRpcProvider | null = null;

export function getProvider(): providers.JsonRpcProvider {
  if (provider) return provider;
  provider = new providers.JsonRpcProvider(CHAIN.rpcUrl, {
    name: CHAIN.name,
    chainId: CHAIN.chainId,
  });
  return provider;
}
