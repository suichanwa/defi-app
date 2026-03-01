import { Contract, HDNodeWallet, Wallet, parseEther, parseUnits } from 'ethers';
import type { TokenInfo } from '@config/tokens';
import { getProvider } from './provider';

const erc20TransferAbi = ['function transfer(address to, uint256 value) returns (bool)'];

type EvmWallet = Wallet | HDNodeWallet;

function ensureConnectedSigner(wallet: EvmWallet) {
  const provider = getProvider();
  return wallet.connect(provider);
}

export async function sendEthTransfer(wallet: EvmWallet, toAddress: string, amountEth: number): Promise<string> {
  const signer = ensureConnectedSigner(wallet);
  const tx = await signer.sendTransaction({
    to: toAddress,
    value: parseEther(amountEth.toString()),
  });
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export async function sendErc20Transfer(
  wallet: EvmWallet,
  token: TokenInfo,
  toAddress: string,
  amount: number,
): Promise<string> {
  const signer = ensureConnectedSigner(wallet);
  const contract = new Contract(token.address, erc20TransferAbi, signer);
  const tx = await contract.transfer(toAddress, parseUnits(amount.toString(), token.decimals));
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}
