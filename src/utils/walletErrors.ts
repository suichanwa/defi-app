import { match } from 'ts-pattern';
import {
  WalletKeyNotFoundError,
  WalletPasswordError,
  WalletReencryptError,
} from '../services/walletKeyStore';

type WalletAction = 'create' | 'import' | 'unlock' | 'send';

type EthersError = {
  code?: string;
  reason?: string;
  message?: string;
};

const genericByAction: Record<WalletAction, string> = {
  create: 'Unable to create wallet. Please try again.',
  import: 'Unable to import wallet. Check the phrase and try again.',
  unlock: 'Unable to unlock wallet. Check the password and try again.',
  send: 'Transaction failed. Please try again.',
};

export function walletErrorMessage(error: unknown, action: WalletAction): string {
  // Custom wallet key errors
  if (error instanceof WalletPasswordError) return 'Incorrect password for this wallet.';
  if (error instanceof WalletKeyNotFoundError) return 'No local wallet key found. Create or import first.';
  if (error instanceof WalletReencryptError) return 'Unable to verify the new password. Try another one.';

  const err = error as EthersError;
  const code = err?.code ?? '';
  const reason = err?.reason ?? '';
  const message = err?.message ?? '';

  // Ethers / provider errors
  const mapped = match({ code, reason, message })
    .with({ code: 'ACTION_REJECTED' }, () => 'You rejected the request.')
    .with({ code: 'NETWORK_ERROR' }, () => 'Network error. Check connectivity and RPC.')
    .with({ code: 'INSUFFICIENT_FUNDS' }, () => 'Insufficient funds for this action.')
    .with({ code: 'NONCE_EXPIRED' }, () => 'Nonce expired. Try again.')
    .with({ code: 'UNPREDICTABLE_GAS_LIMIT' }, () => 'Cannot estimate gas. Check inputs and try again.')
    .with({ code: 'INVALID_ARGUMENT' }, () => 'Invalid input. Check address/amount and try again.')
    .otherwise(() => {
      // Message heuristics
      const lower = `${reason} ${message}`.toLowerCase();
      if (lower.includes('invalid mnemonic')) return 'Invalid seed phrase. Check the words and spacing.';
      if (lower.includes('checksum')) return 'Invalid address checksum.';
      if (lower.includes('wrong password') || lower.includes('invalid password')) return 'Incorrect password.';
      return genericByAction[action] ?? 'Something went wrong.';
    });

  return mapped;
}
