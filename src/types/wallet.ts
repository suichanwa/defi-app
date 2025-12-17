export type EncryptedWalletKey = {
  id: string;
  encryptedJson: string;
  createdAt: string;
  updatedAt: string;
  backupCompleted?: boolean;
};
