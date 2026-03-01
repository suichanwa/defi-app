import { match } from 'ts-pattern';
import { RpcConfigurationError } from '../services/provider';
import { getActiveChain } from '../config/chain';

type WalletAction = 'create' | 'import' | 'unlock' | 'send';

type EthersError = {
  code?: string;
  reason?: string;
  message?: string;
  status?: number;
  statusCode?: number;
  response?: { status?: number };
  error?: { status?: number; statusCode?: number };
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const isDev = (globalThis as { __DEV__?: boolean }).__DEV__ ?? false;

const genericByAction: Record<WalletAction, string> = {
  create: 'Unable to create wallet. Please try again.',
  import: 'Unable to import wallet. Check the phrase and try again.',
  unlock: 'Unable to unlock wallet. Check the passcode and try again.',
  send: 'Transaction failed. Please try again.',
};

const getRpcStatus = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
  const err = error as EthersError;
  return (
    err.status ??
    err.statusCode ??
    err.response?.status ??
    err.error?.status ??
    err.error?.statusCode ??
    null
  );
};

export function rpcErrorMessage(error: unknown): string | null {
  if (error instanceof RpcConfigurationError) return error.message;
  const chain = getActiveChain();
  const envKey =
    chain.kind === 'solana'
      ? chain.cluster === 'mainnet-beta'
        ? 'SOLANA_MAINNET_RPC_URL'
        : 'SOLANA_RPC_URL'
      : 'ETHEREUM_RPC_URL';
  const status = getRpcStatus(error);
  if (status === 401) return `RPC unauthorized (401). Check ${envKey} or your provider key.`;
  if (status === 403) return 'RPC access forbidden (403). Check your provider permissions.';
  const message = getErrorMessage(error);
  if (message.toLowerCase().includes('401')) {
    return `RPC unauthorized (401). Check ${envKey} or your provider key.`;
  }
  return null;
}

export function walletErrorMessage(error: unknown, action: WalletAction): string {
  const rpcMessage = rpcErrorMessage(error);
  if (rpcMessage) return rpcMessage;

  const err = error as EthersError;
  const code = err?.code ?? '';
  const reason = err?.reason ?? '';
  const message = err?.message ?? getErrorMessage(error);

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
      if (lower.includes('crypto.getrandomvalues')) {
        return 'Secure random source is unavailable. Use https/localhost or avoid remote debugging.';
      }
      if (lower.includes('textencoder')) {
        return 'TextEncoder is unavailable in this environment. Add a TextEncoder polyfill.';
      }
      if (lower.includes('securestore') || lower.includes('asyncstorage') || lower.includes('localstorage')) {
        return 'Secure storage is unavailable. Check browser storage settings or device permissions.';
      }
      if (lower.includes('invalid mnemonic')) return 'Invalid seed phrase. Check the words and spacing.';
      if (lower.includes('invalid public key') || lower.includes('non-base58')) return 'Enter a valid recipient address.';
      if (lower.includes('insufficient funds')) return 'Insufficient funds for this action.';
      if (lower.includes('blockhash not found')) return 'Network is out of sync. Try again in a moment.';
      if (lower.includes('checksum')) return 'Invalid address checksum.';
      if (lower.includes('wrong password') || lower.includes('invalid password')) return 'Incorrect passcode.';
      return genericByAction[action] ?? 'Something went wrong.';
    });

  if (mapped === genericByAction[action] && isDev && message) {
    return `${mapped} (${message})`;
  }

  return mapped;
}
