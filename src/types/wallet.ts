export type WalletKind = 'ethereum' | 'solana';

export type EncryptedWalletKey = {
  id: string;
  encryptedJson: string;
  createdAt: string;
  updatedAt: string;
  backupCompleted?: boolean;
  walletType?: WalletKind;
};
