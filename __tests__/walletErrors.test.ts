import { walletErrorMessage, rpcErrorMessage } from '../src/utils/walletErrors';

jest.mock('../src/config/chain', () => ({
  getActiveChain: jest.fn(() => ({ kind: 'solana', cluster: 'devnet' })),
}));

jest.mock('../src/services/provider', () => {
  const { RpcConfigurationError } = jest.requireActual('../src/services/provider');
  return { RpcConfigurationError };
});

import { RpcConfigurationError } from '../src/services/provider';

describe('rpcErrorMessage', () => {
  it('returns the error message for an RpcConfigurationError', () => {
    const err = new RpcConfigurationError('bad RPC config');
    expect(rpcErrorMessage(err)).toBe('bad RPC config');
  });

  it('returns a 401 message for a 401 status error', () => {
    const err = { status: 401 };
    expect(rpcErrorMessage(err)).toMatch(/401/);
  });

  it('returns a 403 message for a 403 status error', () => {
    const err = { status: 403 };
    expect(rpcErrorMessage(err)).toMatch(/403/);
  });

  it('returns null when no RPC error is detected', () => {
    expect(rpcErrorMessage(new Error('something else'))).toBeNull();
  });
});

describe('walletErrorMessage', () => {
  it('returns "You rejected the request." for ACTION_REJECTED', () => {
    const err = { code: 'ACTION_REJECTED' };
    expect(walletErrorMessage(err, 'send')).toBe('You rejected the request.');
  });

  it('returns a network error message for NETWORK_ERROR', () => {
    const err = { code: 'NETWORK_ERROR' };
    expect(walletErrorMessage(err, 'send')).toBe('Network error. Check connectivity and RPC.');
  });

  it('returns an insufficient funds message for INSUFFICIENT_FUNDS', () => {
    const err = { code: 'INSUFFICIENT_FUNDS' };
    expect(walletErrorMessage(err, 'send')).toBe('Insufficient funds for this action.');
  });

  it('returns an invalid input message for INVALID_ARGUMENT', () => {
    const err = { code: 'INVALID_ARGUMENT' };
    expect(walletErrorMessage(err, 'send')).toBe('Invalid input. Check address/amount and try again.');
  });

  it('returns "Invalid seed phrase." for an invalid mnemonic message', () => {
    const err = { message: 'Error: invalid mnemonic phrase' };
    expect(walletErrorMessage(err, 'import')).toBe('Invalid seed phrase. Check the words and spacing.');
  });

  it('returns a valid address message for non-base58 input', () => {
    const err = { message: 'non-base58 character' };
    expect(walletErrorMessage(err, 'send')).toBe('Enter a valid recipient address.');
  });

  it('returns the generic action fallback for unknown errors', () => {
    const err = { code: 'UNKNOWN' };
    expect(walletErrorMessage(err, 'create')).toContain('Unable to create wallet. Please try again.');
  });

  it('returns the generic send fallback for unknown errors on send', () => {
    const err = { code: 'UNKNOWN' };
    expect(walletErrorMessage(err, 'send')).toContain('Transaction failed. Please try again.');
  });
});
