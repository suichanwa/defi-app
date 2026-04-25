import type { Signer } from '@xmtp/react-native-sdk';
import { XmtpPublicIdentity } from './sdk';

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
    getIdentifier: async () => {
      if (!XmtpPublicIdentity) {
        throw new Error('XMTP native module is unavailable in this build.');
      }
      return new XmtpPublicIdentity(normalized, 'ETHEREUM');
    },
    getChainId: () => undefined,
    getBlockNumber: () => undefined,
    signerType: () => 'EOA',
    signMessage: async (message: string) => {
      const signature = await wallet.signMessage(message);
      return { signature };
    },
  };
};
