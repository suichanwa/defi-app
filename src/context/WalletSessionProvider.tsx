import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { Wallet, HDNodeWallet } from 'ethers';
import { Keypair } from '@solana/web3.js';
import type { EncryptedWalletKey, WalletRecordMeta, WalletKind } from '../types/wallet';
import {
  loadEncryptedWalletKey,
  saveEncryptedWalletKey,
  loadWalletRecords,
  getActiveWalletId,
  setActiveWalletId,
  loadEncryptedWalletKeyById,
  markBackupCompleted,
  clearWallet,
  createSolanaWalletRecord,
  importSolanaWalletRecord,
  unlockSolanaWallet,
  removeWalletRecord,
  updateWalletRecordMeta,
} from '../services/walletKeyStore';
import { getActiveChain } from '../config/chain';
import { clearBiometricPassword } from '../services/biometricAuth';

type Status = 'loading' | 'missing' | 'locked' | 'unlocked';

type WalletInstance = Wallet | HDNodeWallet | Keypair;
type WalletCreateOptions = {
  label?: string;
  color?: string;
};

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
  createWallet: (passwordOrOptions?: string | WalletCreateOptions) => Promise<{ mnemonic: string; address: string }>;
  importWallet: (mnemonic: string, passwordOrOptions?: string | WalletCreateOptions) => Promise<{ address: string }>;
  confirmBackup: () => Promise<void>;
  forgetWallet: () => Promise<void>;
  removeWallet: (walletId: string) => Promise<void>;
  registerActivity: () => void;
  switchWallet: (walletId: string) => Promise<void>;
  updateWalletMeta: (walletId: string, updates: Partial<WalletRecordMeta>) => Promise<void>;
};

const WalletSessionContext = createContext<WalletSession | null>(null);

const AUTO_LOCK_MS = 2 * 60 * 1000;
const WALLET_SWITCH_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }) as Promise<T>;
}

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
        const { keypair } = await unlockSolanaWallet(record.encryptedJson, password);
        setWallet(keypair);
        setAddress(keypair.publicKey.toBase58());
        setBackupCompletedState(Boolean(record.backupCompleted));
        setRecoveryPhrase(null);
        return;
      }

      const walletInstance = await Wallet.fromEncryptedJson(record.encryptedJson, password);
      setWallet(walletInstance);
      setAddress(walletInstance.address);
      setBackupCompletedState(Boolean(record.backupCompleted));
      // HDNodeWallet has mnemonic, regular Wallet doesn't
      const hdWallet = walletInstance as HDNodeWallet;
      setRecoveryPhrase(record.backupCompleted ? null : hdWallet.mnemonic?.phrase ?? null);
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
      if (state === 'background' && status === 'unlocked') {
        scheduleLock();
      }
    });
    return () => sub.remove();
  }, [scheduleLock, status]);

  useEffect(() => {
    if (status === 'unlocked') {
      scheduleLock();
    }
  }, [isWalletActive, status, scheduleLock]);

  useEffect(() => {
    const init = async () => {
      const { activeId } = await refreshWallets();
      if (!activeId) {
        setStatus('missing');
        return;
      }
      setStatus('locked');
    };
    init();
  }, [refreshWallets]);

  const unlock = async (password: string) => {
    const existing = await loadEncryptedWalletKey();
    if (!existing) {
      throw new Error('No wallet found');
    }
    setActiveWalletIdState(existing.id);
    lastPasswordRef.current = password;
    if (getActiveChain().kind === 'solana') {
      const { keypair } = await unlockSolanaWallet(existing.encryptedJson, password);
      setWallet(keypair);
      setAddress(keypair.publicKey.toBase58());
      setBackupCompletedState(Boolean(existing.backupCompleted));
      setRecoveryPhrase(null);
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

  const clearWalletStorage = async () => {
    await clearWallet();
  };

  const resolveWalletCreateArgs = useCallback(
    (passwordOrOptions?: string | WalletCreateOptions) => {
      if (typeof passwordOrOptions === 'string') {
        return { password: passwordOrOptions, options: {} as WalletCreateOptions };
      }
      const password = lastPasswordRef.current;
      if (!password) {
        throw new Error('Wallet is locked. Unlock with your app passcode first.');
      }
      return { password, options: passwordOrOptions ?? {} };
    },
    [],
  );

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
    setStatus('missing');
  };

  const createWallet = async (passwordOrOptions?: string | WalletCreateOptions) => {
    const { password, options } = resolveWalletCreateArgs(passwordOrOptions);
    console.log('=== WalletSessionProvider.createWallet ===');
    console.log('Password received:', password);
    console.log('Password type:', typeof password);
    console.log('Password length:', password?.length);
    
    if (getActiveChain().kind === 'solana') {
      const { record, keypair, mnemonic } = await createSolanaWalletRecord(password);
      setAddress(record.id);
      setBackupCompletedState(false);
      setWallet(keypair);
      setRecoveryPhrase(mnemonic);
      setActiveWalletIdState(record.id);
      lastPasswordRef.current = password;
      if (options.label?.trim() || options.color) {
        await updateWalletRecordMeta(record.id, {
          label: options.label?.trim() || undefined,
          color: options.color,
        });
      }
      await refreshWallets();
      setStatus('unlocked');
      scheduleLock();
      return { mnemonic, address: record.id };
    }

    const walletInstance = Wallet.createRandom();
    const encryptedJson = await walletInstance.encrypt(password);
    const record: EncryptedWalletKey = {
      id: walletInstance.address,
      encryptedJson,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      backupCompleted: false,
      walletType: 'ethereum',
    };
    await saveEncryptedWalletKey(record);
    setAddress(record.id);
    setBackupCompletedState(false);
    setWallet(walletInstance);
    const hdWallet = walletInstance as HDNodeWallet;
    const mnemonic = hdWallet.mnemonic?.phrase ?? '';
    setRecoveryPhrase(mnemonic);
    setActiveWalletIdState(record.id);
    lastPasswordRef.current = password;
    if (options.label?.trim() || options.color) {
      await updateWalletRecordMeta(record.id, {
        label: options.label?.trim() || undefined,
        color: options.color,
      });
    }
    await refreshWallets();
    setStatus('unlocked');
    scheduleLock();
    return { mnemonic, address: walletInstance.address };
  };

  const importWallet = async (mnemonic: string, passwordOrOptions?: string | WalletCreateOptions) => {
    const { password, options } = resolveWalletCreateArgs(passwordOrOptions);
    if (getActiveChain().kind === 'solana') {
      const { record, keypair } = await importSolanaWalletRecord(mnemonic.trim(), password);
      setAddress(record.id);
      setBackupCompletedState(false);
      setWallet(keypair);
      setRecoveryPhrase(null);
      setActiveWalletIdState(record.id);
      lastPasswordRef.current = password;
      if (options.label?.trim() || options.color) {
        await updateWalletRecordMeta(record.id, {
          label: options.label?.trim() || undefined,
          color: options.color,
        });
      }
      await refreshWallets();
      setStatus('unlocked');
      scheduleLock();
      return { address: record.id };
    }

    const walletInstance = HDNodeWallet.fromPhrase(mnemonic.trim());
    const encryptedJson = await walletInstance.encrypt(password);
    const record: EncryptedWalletKey = {
      id: walletInstance.address,
      encryptedJson,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      backupCompleted: false,
      walletType: 'ethereum',
    };
    await saveEncryptedWalletKey(record);
    setAddress(record.id);
    setBackupCompletedState(false);
    setWallet(walletInstance);
    setRecoveryPhrase(null);
    setActiveWalletIdState(record.id);
    lastPasswordRef.current = password;
    if (options.label?.trim() || options.color) {
      await updateWalletRecordMeta(record.id, {
        label: options.label?.trim() || undefined,
        color: options.color,
      });
    }
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
    const updatedList = await updateWalletRecordMeta(walletId, updates);
    setWallets(updatedList);
  };

  const removeWallet = async (walletId: string) => {
    await removeWalletRecord(walletId);
    const { records, activeId } = await refreshWallets();
    if (!activeId) {
      setStatus('missing');
      setWallet(null);
      setAddress(null);
      setRecoveryPhrase(null);
      setBackupCompletedState(false);
      return;
    }
    if (walletId === activeWalletId && lastPasswordRef.current) {
      const newActive = await loadEncryptedWalletKeyById(activeId);
      if (newActive) {
        await hydrateUnlockedWallet(newActive, lastPasswordRef.current);
      }
    }
  };

  const switchWallet = async (walletId: string) => {
    await withTimeout(
      (async () => {
        if (status === 'unlocked') {
          const record = await loadEncryptedWalletKeyById(walletId);
          if (!record) {
            throw new Error('Wallet record not found.');
          }

          if (lastPasswordRef.current) {
            try {
              await hydrateUnlockedWallet(record, lastPasswordRef.current);
              await setActiveWalletId(walletId);
              setActiveWalletIdState(walletId);
              await refreshWallets();
              return;
            } catch {
              // Fall through to explicit unlock mode for the selected wallet.
            }
          }

          await setActiveWalletId(walletId);
          setActiveWalletIdState(walletId);
          clearLockTimer();
          setWallet(null);
          setAddress(null);
          setRecoveryPhrase(null);
          setBackupCompletedState(Boolean(record.backupCompleted));
          setStatus('locked');
          lastPasswordRef.current = null;
          await refreshWallets();
          return;
        }

        await setActiveWalletId(walletId);
        setActiveWalletIdState(walletId);
        await refreshWallets();
      })(),
      WALLET_SWITCH_TIMEOUT_MS,
      'Wallet activation timed out. Please try again.',
    );
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
