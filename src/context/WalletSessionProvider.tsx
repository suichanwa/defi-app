import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Wallet } from 'ethers';
import {
  createInitialWalletKey,
  decryptWalletKey,
  encryptWalletKey,
  loadEncryptedWalletKey,
  markBackupCompleted,
  clearWallet as clearWalletStorage,
  saveEncryptedWalletKey,
} from '../services/walletKeyStore';
import { clearBiometricPassword } from '../services/biometrics';

type Status = 'loading' | 'missing' | 'locked' | 'unlocked';

type WalletSession = {
  status: Status;
  address: string | null;
  wallet: Wallet | null;
  backupCompleted: boolean;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  createWallet: (password: string) => Promise<{ mnemonic: string; address: string }>;
  importWallet: (mnemonic: string, password: string) => Promise<{ address: string }>;
  confirmBackup: () => Promise<void>;
  forgetWallet: () => Promise<void>;
};

const WalletSessionContext = createContext<WalletSession | null>(null);

const AUTO_LOCK_MS = 2 * 60 * 1000;

export function WalletSessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [address, setAddress] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [backupCompletedState, setBackupCompletedState] = useState(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLockTimer = () => {
    if (lockTimer.current) {
      clearTimeout(lockTimer.current);
      lockTimer.current = null;
    }
  };

  const scheduleLock = () => {
    clearLockTimer();
    lockTimer.current = setTimeout(() => {
      setWallet(null);
      setStatus((prev) => (prev === 'unlocked' ? 'locked' : prev));
    }, AUTO_LOCK_MS);
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setWallet(null);
        setStatus((prev) => (prev === 'unlocked' ? 'locked' : prev));
        clearLockTimer();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const init = async () => {
      const existing = await loadEncryptedWalletKey();
      if (!existing) {
        setStatus('missing');
        return;
      }
      setAddress(existing.id);
      setBackupCompletedState(Boolean(existing.backupCompleted));
      setStatus('locked');
    };
    init();
  }, []);

  const unlock = async (password: string) => {
    const existing = await loadEncryptedWalletKey();
    if (!existing) {
      setStatus('missing');
      return;
    }
    const pk = await decryptWalletKey(existing.encryptedJson, password);
    const w = new Wallet(pk);
    setWallet(w);
    setAddress(w.address);
    setBackupCompletedState(Boolean(existing.backupCompleted));
    setStatus('unlocked');
    scheduleLock();
  };

  const lock = () => {
    setWallet(null);
    setStatus((prev) => (prev === 'unlocked' ? 'locked' : prev));
    clearLockTimer();
  };

  const forgetWallet = async () => {
    clearLockTimer();
    await clearWalletStorage();
    await clearBiometricPassword();
    setWallet(null);
    setAddress(null);
    setBackupCompletedState(false);
    setStatus('missing');
  };

  const createWallet = async (password: string) => {
    const record = await createInitialWalletKey(password);
    setAddress(record.id);
    setBackupCompletedState(false);
    const walletInstance = await Wallet.fromEncryptedJson(record.encryptedJson, password);
    setWallet(walletInstance);
    setStatus('unlocked');
    scheduleLock();
    const mnemonic = walletInstance.mnemonic?.phrase ?? '';
    return { mnemonic, address: walletInstance.address };
  };

  const importWallet = async (mnemonic: string, password: string) => {
    const walletInstance = Wallet.fromMnemonic(mnemonic.trim());
    const record = await encryptWalletKey(walletInstance.privateKey, password);
    record.backupCompleted = false;
    await saveEncryptedWalletKey(record);
    setAddress(record.id);
    setBackupCompletedState(false);
    setWallet(walletInstance);
    setStatus('unlocked');
    scheduleLock();
    return { address: walletInstance.address };
  };

  const confirmBackup = async () => {
    await markBackupCompleted();
    setBackupCompletedState(true);
  };

  const value = useMemo(
    () => ({
      status,
      address,
      wallet,
      backupCompleted: backupCompletedState,
      unlock,
      lock,
      createWallet,
      importWallet,
      confirmBackup,
      forgetWallet,
    }),
    [status, address, wallet, backupCompletedState],
  );

  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

export function useWalletSession() {
  const ctx = useContext(WalletSessionContext);
  if (!ctx) {
    throw new Error('useWalletSession must be used within WalletSessionProvider');
  }
  return ctx;
}
