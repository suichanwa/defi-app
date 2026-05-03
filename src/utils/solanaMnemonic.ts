import { derivePath } from 'ed25519-hd-key';

const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

export function normalizeMnemonicInput(phrase: string): string {
  return phrase.trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

export function buildMnemonicWords(phrase: string, wordCount: 12 | 24): string[] {
  const words = normalizeMnemonicInput(phrase).split(' ').filter(Boolean);
  const nextWords = Array(wordCount).fill('');
  words.slice(0, wordCount).forEach((word, index) => {
    nextWords[index] = word;
  });
  return nextWords;
}

export function getMnemonicWordCount(phrase: string): 12 | 24 {
  return normalizeMnemonicInput(phrase).split(' ').filter(Boolean).length > 12 ? 24 : 12;
}

export async function deriveSolanaKeypairFromMnemonic(mnemonic: string) {
  const normalizedMnemonic = normalizeMnemonicInput(mnemonic);
  if (!normalizedMnemonic) {
    throw new Error('Invalid mnemonic');
  }

  const { mnemonicToSeedSync, validateMnemonic } = require('bip39');
  if (!validateMnemonic(normalizedMnemonic)) {
    throw new Error('Invalid mnemonic');
  }

  const seed = mnemonicToSeedSync(normalizedMnemonic);
  const { key } = derivePath(SOLANA_DERIVATION_PATH, seed.toString('hex'));
  const { Keypair } = require('@solana/web3.js');

  return {
    keypair: Keypair.fromSeed(key),
    mnemonic: normalizedMnemonic,
  };
}
