import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Wallet } from 'ethers';
import type { Keypair } from '@solana/web3.js';
import { getActiveChain } from '../config/chain';
import {
  createInitialWalletKey,
  encryptWalletKey,
  getActiveWalletId,
  loadEncryptedWalletKey,
  loadEncryptedWalletKeyById,
  loadWalletRecords,
  markBackupCompleted,
  removeWalletRecord,
  clearWallet as clearWalletStorage,
  saveEncryptedWalletKey,
  setActiveWalletId,
  updateWalletRecordMeta,
  createSolanaWalletRecord,
  importSolanaWalletRecord,
  unlockSolanaWallet,
} from '../services/walletKeyStore';
import type { WalletRecordMeta } from '../types/wallet';
import { clearBiometricPassword } from '../services/biometrics';

type Status = 'loading' | 'missing' | 'locked' | 'unlocked';

type WalletInstance = Wallet | Keypair;

type WalletSession = {
  status: Status;
  address: string | null;
  wallet: WalletInstance | null;
  recoveryPhrase: string | null;
  backupCompleted: boolean;
  wallets: WalletRecordMeta[];
  activeWalletId: string | null;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  createWallet: (password: string) => Promise<{ mnemonic: string; address: string }>;
  importWallet: (mnemonic: string, password: string) => Promise<{ address: string }>;
  confirmBackup: () => Promise<void>;
  forgetWallet: () => Promise<void>;
  removeWallet: (walletId: string) => Promise<void>;
  registerActivity: () => void;
  switchWallet: (walletId: string) => Promise<void>;
  updateWalletMeta: (walletId: string, updates: Partial<WalletRecordMeta>) => Promise<void>;
};

const WalletSessionContext = createContext<WalletSession | null>(null);

const AUTO_LOCK_MS = 2 * 60 * 1000;

export function WalletSessionProvider({ children, isWalletActive }: { children: React.ReactNode; isWalletActive: boolean }) {
  const [status, setStatus] = useState<Status>('loading');
  const [address, setAddress] = useState<string | null>(null);
  const [wallet, setWallet] = useState<WalletInstance | null>(null);
  const [recoveryPhrase, setRecoveryPhrase] = useState<string | null>(null);
  const [backupCompletedState, setBackupCompletedState] = useState(false);
  const [wallets, setWallets] = useState<WalletRecordMeta[]>([]);
  const [activeWalletId, setActiveWalletIdState] = useState<string | null>(null);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPasswordRef = useRef<string | null>(null);

  const clearLockTimer = () => {
    if (lockTimer.current) {
      clearTimeout(lockTimer.current);
      lockTimer.current = null;
    }
  };

  const refreshWallets = useCallback(async () => {
    const records = await loadWalletRecords();
    setWallets(records);
    const storedActive = await getActiveWalletId();
    const nextActive =
      storedActive && records.some((record) => record.id === storedActive) ? storedActive : records[0]?.id ?? null;
    if (nextActive && nextActive !== storedActive) {
      await setActiveWalletId(nextActive);
    }
    setActiveWalletIdState(nextActive);
    return { records, activeId: nextActive };
  }, []);

  const hydrateUnlockedWallet = useCallback(
    async (record: { id: string; encryptedJson: string; backupCompleted?: boolean }, password: string) => {
      if (getActiveChain().kind === 'solana') {
        const { keypair, mnemonic } = await unlockSolanaWallet(record.encryptedJson, password);
        setWallet(keypair);
        setAddress(record.id);
        setBackupCompletedState(Boolean(record.backupCompleted));
        setRecoveryPhrase(record.backupCompleted ? null : mnemonic ?? null);
        return;
      }

      const walletInstance = await Wallet.fromEncryptedJson(record.encryptedJson, password);
      setWallet(walletInstance);
      setAddress(walletInstance.address);
      setBackupCompletedState(Boolean(record.backupCompleted));
      setRecoveryPhrase(record.backupCompleted ? null : walletInstance.mnemonic?.phrase ?? null);
    },
    [],
  );

  const scheduleLock = useCallback(() => {
    clearLockTimer();
    if (!isWalletActive) return;
    lockTimer.current = setTimeout(() => {
      setWallet(null);
      setRecoveryPhrase(null);
      setStatus((prev) => (prev === 'unlocked' ? 'locked' : prev));
      lastPasswordRef.current = null;
    }, AUTO_LOCK_MS);
  }, [isWalletActive]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setWallet(null);
        setRecoveryPhrase(null);
        setStatus((prev) => (prev === 'unlocked' ? 'locked' : prev));
        clearLockTimer();
        lastPasswordRef.current = null;
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (status === 'unlocked') {
      scheduleLock();
    }
  }, [isWalletActive, status, scheduleLock]);

  useEffect(() => {
    const init = async () => {
      const { records, activeId } = await refreshWallets();
      if (!records.length || !activeId) {
        setStatus('missing');
        return;
      }
      const activeRecord = records.find((record) => record.id === activeId);
      if (activeRecord?.backupCompleted === false) {
        await removeWalletRecord(activeId);
        const refreshed = await refreshWallets();
        if (!refreshed.records.length || !refreshed.activeId) {
          await clearBiometricPassword();
          setWallet(null);
          setAddress(null);
          setRecoveryPhrase(null);
          setBackupCompletedState(false);
          setStatus('missing');
          return;
        }
        const fallbackRecord = refreshed.records.find((record) => record.id === refreshed.activeId);
        setAddress(refreshed.activeId);
        setBackupCompletedState(Boolean(fallbackRecord?.backupCompleted));
        setStatus('locked');
        return;
      }
      setAddress(activeId);
      setBackupCompletedState(Boolean(activeRecord?.backupCompleted));
      setStatus('locked');
    };
    init();
  }, [refreshWallets]);

  const unlock = async (password: string) => {
    const existing = await loadEncryptedWalletKey();
    if (!existing) {
      setStatus('missing');
      return;
    }
    setActiveWalletIdState(existing.id);
    lastPasswordRef.current = password;
    if (getActiveChain().kind === 'solana') {
      await hydrateUnlockedWallet(existing, password);
      setStatus('unlocked');
      scheduleLock();
      return;
    }
    await hydrateUnlockedWallet(existing, password);
    setStatus('unlocked');
    scheduleLock();
  };

  const lock = () => {
    setWallet(null);
    setRecoveryPhrase(null);
    setStatus((prev) => (prev === 'unlocked' ? 'locked' : prev));
    clearLockTimer();
    lastPasswordRef.current = null;
  };

  const registerActivity = useCallback(() => {
    if (status !== 'unlocked') return;
    scheduleLock();
  }, [scheduleLock, status]);

  const forgetWallet = async () => {
    clearLockTimer();
    await clearWalletStorage();
    await clearBiometricPassword();
    setWallet(null);
    setAddress(null);
    setRecoveryPhrase(null);
    setBackupCompletedState(false);
    setWallets([]);
    setActiveWalletIdState(null);
    lastPasswordRef.current = null;
    setStatus('missing');
  };

  const createWallet = async (password: string) => {
    if (getActiveChain().kind === 'solana') {
      const { record, keypair, mnemonic } = await createSolanaWalletRecord(password);
      setAddress(record.id);
      setBackupCompletedState(false);
      setWallet(keypair);
      setRecoveryPhrase(mnemonic);
      setActiveWalletIdState(record.id);
      lastPasswordRef.current = password;
      await refreshWallets();
      setStatus('unlocked');
      scheduleLock();
      return { mnemonic, address: record.id };
    }

    const record = await createInitialWalletKey(password);
    setAddress(record.id);
    setBackupCompletedState(false);
    const walletInstance = await Wallet.fromEncryptedJson(record.encryptedJson, password);
    setWallet(walletInstance);
    setRecoveryPhrase(walletInstance.mnemonic?.phrase ?? null);
    setActiveWalletIdState(record.id);
    lastPasswordRef.current = password;
    await refreshWallets();
    setStatus('unlocked');
    scheduleLock();
    const mnemonic = walletInstance.mnemonic?.phrase ?? '';
    return { mnemonic, address: walletInstance.address };
  };

  const importWallet = async (mnemonic: string, password: string) => {
    if (getActiveChain().kind === 'solana') {
      const { record, keypair } = await importSolanaWalletRecord(mnemonic.trim(), password);
      setAddress(record.id);
      setBackupCompletedState(false);
      setWallet(keypair);
      setRecoveryPhrase(null);
      setActiveWalletIdState(record.id);
      lastPasswordRef.current = password;
      await refreshWallets();
      setStatus('unlocked');
      scheduleLock();
      return { address: record.id };
    }

    const walletInstance = Wallet.fromMnemonic(mnemonic.trim());
    const record = await encryptWalletKey(walletInstance.privateKey, password);
    record.backupCompleted = false;
    await saveEncryptedWalletKey(record);
    setAddress(record.id);
    setBackupCompletedState(false);
    setWallet(walletInstance);
    setRecoveryPhrase(null);
    setActiveWalletIdState(record.id);
    lastPasswordRef.current = password;
    await refreshWallets();
    setStatus('unlocked');
    scheduleLock();
    return { address: walletInstance.address };
  };

  const confirmBackup = async () => {
    await markBackupCompleted();
    setBackupCompletedState(true);
    setRecoveryPhrase(null);
    await refreshWallets();
  };

  const updateWalletMeta = async (walletId: string, updates: Partial<WalletRecordMeta>) => {
    const next = await updateWalletRecordMeta(walletId, {
      label: updates.label,
      color: updates.color,
    });
    setWallets(next);
  };

  const removeWallet = async (walletId: string) => {
    if (!walletId) return;
    await removeWalletRecord(walletId);
    const { records, activeId } = await refreshWallets();
    if (!records.length || !activeId) {
      setWallet(null);
      setAddress(null);
      setRecoveryPhrase(null);
      setBackupCompletedState(false);
      setActiveWalletIdState(null);
      lastPasswordRef.current = null;
      setStatus('missing');
      return;
    }

    setActiveWalletIdState(activeId);
    setAddress(activeId);
    const recordMeta = records.find((record) => record.id === activeId);
    setBackupCompletedState(Boolean(recordMeta?.backupCompleted));

    if (status !== 'unlocked') {
      setWallet(null);
      setRecoveryPhrase(null);
      return;
    }

    const password = lastPasswordRef.current;
    if (!password) {
      setWallet(null);
      setRecoveryPhrase(null);
      setStatus('locked');
      return;
    }

    const record = await loadEncryptedWalletKeyById(activeId);
    if (!record) {
      setStatus('missing');
      return;
    }
    await hydrateUnlockedWallet(record, password);
    setStatus('unlocked');
    scheduleLock();
  };

  const switchWallet = async (walletId: string) => {
    if (!walletId || walletId === activeWalletId) return;
    await setActiveWalletId(walletId);
    setActiveWalletIdState(walletId);
    const records = wallets.length ? wallets : await loadWalletRecords();
    if (!wallets.length) {
      setWallets(records);
    }
    const recordMeta = records.find((record) => record.id === walletId);
    setBackupCompletedState(Boolean(recordMeta?.backupCompleted));
    setAddress(walletId);
    if (status !== 'unlocked') {
      setWallet(null);
      setRecoveryPhrase(null);
      return;
    }
    const password = lastPasswordRef.current;
    if (!password) {
      setWallet(null);
      setRecoveryPhrase(null);
      setStatus('locked');
      return;
    }
    const record = await loadEncryptedWalletKeyById(walletId);
    if (!record) {
      setStatus('missing');
      return;
    }
    await hydrateUnlockedWallet(record, password);
    setStatus('unlocked');
    scheduleLock();
  };

  const value = useMemo(
    () => ({
      status,
      address,
      wallet,
      recoveryPhrase,
      backupCompleted: backupCompletedState,
      wallets,
      activeWalletId,
      unlock,
      lock,
      createWallet,
      importWallet,
      confirmBackup,
      forgetWallet,
      removeWallet,
      registerActivity,
      switchWallet,
      updateWalletMeta,
    }),
    [
      status,
      address,
      wallet,
      recoveryPhrase,
      backupCompletedState,
      wallets,
      activeWalletId,
      updateWalletMeta,
      removeWallet,
      registerActivity,
    ],
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
