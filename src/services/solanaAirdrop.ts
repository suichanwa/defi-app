import { requestSolAirdrop as requestSolAirdropV2 } from './airdrop';

// Backward-compatible wrapper for older call sites.
export async function requestSolAirdrop(address: string, amountSol: number): Promise<string> {
  const { signature } = await requestSolAirdropV2({ address, amountSol });
  return signature;
}
