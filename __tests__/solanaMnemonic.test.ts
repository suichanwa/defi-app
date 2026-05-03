import { buildMnemonicWords, deriveSolanaKeypairFromMnemonic, getMnemonicWordCount, normalizeMnemonicInput } from '../src/utils/solanaMnemonic';

const mockBuffer = require('buffer').Buffer;

jest.mock('bip39', () => ({
  mnemonicToSeedSync: jest.fn(() => mockBuffer.from('11'.repeat(64), 'hex')),
  validateMnemonic: jest.fn(() => true),
}));

const mockDerivePath = jest.fn(() => ({ key: mockBuffer.alloc(32, 7) }));
jest.mock('ed25519-hd-key', () => ({
  derivePath: (...args: unknown[]) => mockDerivePath(...args),
}));

const mockFromSeed = jest.fn(() => ({ publicKey: { toBase58: () => 'solana-public-key' } }));
jest.mock('@solana/web3.js', () => ({
  Keypair: { fromSeed: (...args: unknown[]) => mockFromSeed(...args) },
}));

describe('solana mnemonic helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes and resizes recovery phrases', () => {
    expect(normalizeMnemonicInput('  ALPHA   beta  GAMMA  ')).toBe('alpha beta gamma');
    expect(buildMnemonicWords('one two three', 12)).toHaveLength(12);
    expect(buildMnemonicWords('one two three', 12).slice(0, 3)).toEqual(['one', 'two', 'three']);
    expect(getMnemonicWordCount('one two three four five six seven eight nine ten eleven twelve thirteen')).toBe(24);
  });

  it('derives a solana keypair from the standard derivation path', async () => {
    const result = await deriveSolanaKeypairFromMnemonic('  Alpha   Beta  Gamma Delta Epsilon Zeta Eta Theta Iota Kappa Lambda Mu  ');

    expect(result.mnemonic).toBe('alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu');
    expect(mockDerivePath).toHaveBeenCalledWith("m/44'/501'/0'/0'", '11111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111111');
    expect(mockFromSeed).toHaveBeenCalledWith(mockBuffer.alloc(32, 7));
    expect(result.keypair.publicKey.toBase58()).toBe('solana-public-key');
  });
});