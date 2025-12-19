import { useEffect, useReducer } from 'react';
import {
  changeWalletPassword,
  createInitialWalletKey,
  loadEncryptedWalletKey,
  WalletKeyNotFoundError,
  WalletPasswordError,
  WalletReencryptError,
} from '@services';
import type { AvatarType, LanguageCode, ThemePreference } from '@app-types/profile';
import type { EncryptedWalletKey } from '@app-types/wallet';
import { saveProfileSettings } from '@services';

type SecurityState = {
  walletKey: EncryptedWalletKey | null;
  setupPassword: string;
  setupConfirm: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  message: string | null;
  error: string | null;
};

type SecurityAction =
  | { type: 'SET_FIELD'; key: keyof SecurityState; value: string }
  | { type: 'SET_WALLET'; walletKey: EncryptedWalletKey | null }
  | { type: 'START' }
  | { type: 'SUCCESS'; message: string }
  | { type: 'FAIL'; error: string };

const PASSWORD_MIN = 8;

const initialState: SecurityState = {
  walletKey: null,
  setupPassword: '',
  setupConfirm: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
  loading: false,
  message: null,
  error: null,
};

function securityReducer(state: SecurityState, action: SecurityAction): SecurityState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.key]: action.value };
    case 'SET_WALLET':
      return { ...state, walletKey: action.walletKey };
    case 'START':
      return { ...state, loading: true, message: null, error: null };
    case 'SUCCESS':
      return { ...state, loading: false, message: action.message, error: null };
    case 'FAIL':
      return { ...state, loading: false, message: null, error: action.error };
    default:
      return state;
  }
}

const validateNewPassword = (value: string) =>
  value.length < PASSWORD_MIN ? `Password must be at least ${PASSWORD_MIN} characters.` : null;

type WalletSecurityArgs = {
  alias: string;
  avatarType: AvatarType;
  themePreference: ThemePreference;
  language: LanguageCode;
  onWalletKeyCreated?: (seed: string) => void;
};

export function useWalletSecurity({ alias, avatarType, themePreference, language, onWalletKeyCreated }: WalletSecurityArgs) {
  const [state, dispatch] = useReducer(securityReducer, initialState);

  useEffect(() => {
    let mounted = true;
    loadEncryptedWalletKey().then((key) => {
      if (mounted) {
        dispatch({ type: 'SET_WALLET', walletKey: key });
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const setField = (key: keyof SecurityState, value: string) => dispatch({ type: 'SET_FIELD', key, value });

  const changePassword = async () => {
    dispatch({ type: 'START' });
    if (!state.currentPassword || !state.newPassword || !state.confirmPassword) {
      dispatch({ type: 'FAIL', error: 'Fill in all password fields.' });
      return;
    }
    const policyError = validateNewPassword(state.newPassword);
    if (policyError) {
      dispatch({ type: 'FAIL', error: policyError });
      return;
    }
    if (state.newPassword !== state.confirmPassword) {
      dispatch({ type: 'FAIL', error: 'New password entries do not match.' });
      return;
    }
    try {
      const updated = await changeWalletPassword(state.currentPassword, state.newPassword);
      dispatch({ type: 'SET_WALLET', walletKey: updated });
      dispatch({ type: 'SET_FIELD', key: 'currentPassword', value: '' });
      dispatch({ type: 'SET_FIELD', key: 'newPassword', value: '' });
      dispatch({ type: 'SET_FIELD', key: 'confirmPassword', value: '' });
      dispatch({ type: 'SUCCESS', message: 'Wallet password updated.' });
    } catch (error) {
      if (error instanceof WalletPasswordError) {
        dispatch({ type: 'FAIL', error: 'Current password is incorrect.' });
        return;
      }
      if (error instanceof WalletKeyNotFoundError) {
        dispatch({ type: 'FAIL', error: 'No local wallet key found.' });
        return;
      }
      if (error instanceof WalletReencryptError) {
        dispatch({ type: 'FAIL', error: 'Unable to verify the new password.' });
        return;
      }
      dispatch({ type: 'FAIL', error: 'Unexpected error updating password.' });
    }
  };

  const createWalletKey = async () => {
    dispatch({ type: 'START' });
    if (!state.setupPassword || !state.setupConfirm) {
      dispatch({ type: 'FAIL', error: 'Enter and confirm a password.' });
      return;
    }
    const policyError = validateNewPassword(state.setupPassword);
    if (policyError) {
      dispatch({ type: 'FAIL', error: policyError });
      return;
    }
    if (state.setupPassword !== state.setupConfirm) {
      dispatch({ type: 'FAIL', error: 'Password entries do not match.' });
      return;
    }
    try {
      const created = await createInitialWalletKey(state.setupPassword);
      dispatch({ type: 'SET_WALLET', walletKey: created });
      dispatch({ type: 'SET_FIELD', key: 'setupPassword', value: '' });
      dispatch({ type: 'SET_FIELD', key: 'setupConfirm', value: '' });
      if (avatarType === 'identicon') {
        await saveProfileSettings({
          alias: alias.trim(),
          avatarType,
          avatarSeed: created.id,
          themePreference,
          language,
        });
        onWalletKeyCreated?.(created.id);
      }
      dispatch({ type: 'SUCCESS', message: 'Encrypted wallet key created.' });
    } catch (error) {
      dispatch({ type: 'FAIL', error: error instanceof Error ? error.message : 'Unable to create wallet key.' });
    }
  };

  const reload = async () => {
    dispatch({ type: 'START' });
    try {
      const key = await loadEncryptedWalletKey();
      dispatch({ type: 'SET_WALLET', walletKey: key });
      dispatch({ type: 'SUCCESS', message: 'Wallet state refreshed.' });
    } catch (error) {
      dispatch({ type: 'FAIL', error: error instanceof Error ? error.message : 'Unable to reload wallet key.' });
    }
  };

  const clearWallet = async () => {
    dispatch({ type: 'SET_WALLET', walletKey: null });
    dispatch({ type: 'SUCCESS', message: 'Local wallet key removed.' });
  };

  return {
    state,
    actions: {
      setField,
      changePassword,
      createWalletKey,
      reload,
      clearWallet,
    },
    status: {
      loading: state.loading,
      message: state.message,
      error: state.error,
    },
  };
}
