const RATE_LIMIT_PATTERNS = [
  '429',
  'too many requests',
  'rate limit',
  'faucet',
  'airdrop request failed',
  'request limit',
  'try again later',
];

const parseStatusFromError = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
  const err = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number };
    request?: { status?: number };
    error?: { status?: number; statusCode?: number };
  };
  return (
    err.status ??
    err.statusCode ??
    err.response?.status ??
    err.request?.status ??
    err.error?.status ??
    err.error?.statusCode ??
    null
  );
};

const extractMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const err = error as { message?: string };
    if (typeof err.message === 'string') return err.message;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return '';
};

export function isAirdropRateLimited(error: unknown): boolean {
  const status = parseStatusFromError(error);
  if (status === 429) return true;
  const lower = extractMessage(error).toLowerCase();
  return RATE_LIMIT_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function getAirdropErrorMessage(error: unknown): string {
  if (isAirdropRateLimited(error)) {
    return 'Airdrop rate limited. Please wait a moment and try again.';
  }

  const message = extractMessage(error).toLowerCase();
  if (message.includes('blockhash')) {
    return 'Network is behind. Please retry the airdrop in a few seconds.';
  }
  if (message.includes('invalid public key')) {
    return 'Wallet address is invalid for airdrop.';
  }
  if (message.includes('rpc')) {
    return 'RPC temporarily unavailable. Please try again.';
  }
  return 'Airdrop failed. Try again.';
}
