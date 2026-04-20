import type { Signer } from '@xmtp/react-native-sdk';
import { PublicIdentity } from '@xmtp/react-native-sdk';

type EvmMessageSigner = {
  signMessage: (message: string) => Promise<string>;
  address?: string;
};

export const isEvmMessageSigner = (value: unknown): value is EvmMessageSigner => {
  if (!value || typeof value !== 'object') return false;
  return typeof (value as EvmMessageSigner).signMessage === 'function';
};

export const isEvmAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim());

export const createXmtpEoaSigner = (wallet: EvmMessageSigner, address: string): Signer => {
  const normalized = address.toLowerCase();
  return {
    getIdentifier: async () => new PublicIdentity(normalized, 'ETHEREUM'),
    getChainId: () => undefined,
    getBlockNumber: () => undefined,
    signerType: () => 'EOA',
    signMessage: async (message: string) => {
      const signature = await wallet.signMessage(message);
      return { signature };
    },
  };
};
