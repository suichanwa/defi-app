import { Contract, utils } from 'ethers';
import type { TokenInfo } from '../config/tokens';
import { getProvider } from './provider';

const erc20Abi = ['function balanceOf(address owner) view returns (uint256)'];
const { formatEther, formatUnits } = utils;

export async function fetchNativeBalance(address: string): Promise<string> {
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  return formatEther(balance);
}

export async function fetchTokenBalances(address: string, tokens: TokenInfo[]): Promise<Record<string, string>> {
  const provider = getProvider();
  const results: Record<string, string> = {};
  for (const token of tokens) {
    const contract = new Contract(token.address, erc20Abi, provider);
    const bal = await contract.balanceOf(address);
    results[token.symbol] = formatUnits(bal, token.decimals);
  }
  return results;
}
