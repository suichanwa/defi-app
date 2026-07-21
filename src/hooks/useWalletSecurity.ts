import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createInitialWalletKey,
  loadEncryptedWalletKey,
  loadProfileSettings,
  saveProfileSettings,
} from '@services';
import type { AvatarType, LanguageCode, ThemePreference } from '@app-types/profile';
import type { EncryptedWalletKey } from '@app-types/wallet';
import { useFormFields } from './useFormFields';
import { useAsyncAction } from './useAsyncAction';
import { createPasswordMatchSchema } from '@utils/passwordValidation';
import { z } from 'zod';

type WalletSecurityArgs = {
  alias: string;
  avatarType: AvatarType;
  themePreference: ThemePreference;
  language: LanguageCode;
  onWalletKeyCreated?: (seed: string) => void;
};

type SetupFields = {
  setupPassword: string;
  setupConfirm: string;
};

type ChangeFields = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const setupSchema = createPasswordMatchSchema<'setupPassword', 'setupConfirm'>('setupPassword', 'setupConfirm');

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export function useWalletSecurity({
  alias,
  avatarType,
  themePreference,
  language,
  onWalletKeyCreated,
}: WalletSecurityArgs) {
  const [walletKey, setWalletKey] = useState<EncryptedWalletKey | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const setupFields = useFormFields<SetupFields>({
    setupPassword: '',
    setupConfirm: '',
  });
  
  const changeFields = useFormFields<ChangeFields>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const asyncAction = useAsyncAction();

  useEffect(() => {
    if (!isInitialLoad) return;
    
    let mounted = true;
    const controller = new AbortController();

    loadEncryptedWalletKey()
      .then((key) => {
        if (mounted && !controller.signal.aborted) {
          setWalletKey(key);
          setIsInitialLoad(false);
        }
      })
      .catch(() => {
        if (mounted && !controller.signal.aborted) {
          setWalletKey(null);
          setIsInitialLoad(false);
        }
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [isInitialLoad]);

  const changePassword = useCallback(async () => {
    const validation = changePasswordSchema.safeParse(changeFields.fields);

    if (!validation.success) {
      asyncAction.setError(validation.error.issues[0]?.message ?? 'Validation failed');
      return;
    }

    const { currentPassword, newPassword } = validation.data;

    const result = await asyncAction.execute(
      () => Promise.resolve(null as EncryptedWalletKey | null),
      'Wallet password updated.'
    );

    if (result) {
      setWalletKey(result);
      changeFields.resetFields();
    }
  }, [changeFields.fields, asyncAction, changeFields]);

  const createWalletKey = useCallback(async () => {
    const validation = setupSchema.safeParse(setupFields.fields);
    
    if (!validation.success) {
      asyncAction.setError(validation.error.issues[0]?.message ?? 'Validation failed');
      return;
    }

    const { setupPassword } = validation.data;

    const result = await asyncAction.execute(
      () => createInitialWalletKey(setupPassword),
      'Encrypted wallet key created.'
    );

    if (result) {
      setWalletKey(result);
      setupFields.resetFields();
      
      if (avatarType === 'identicon') {
        const currentSettings = await loadProfileSettings();
        saveProfileSettings({
          ...currentSettings,
          alias: alias.trim(),
          avatarType,
          avatarSeed: result.id,
          themePreference,
          language,
        }).catch(console.error);
        
        onWalletKeyCreated?.(result.id);
      }
    }
  }, [setupFields.fields, asyncAction, alias, avatarType, themePreference, language, onWalletKeyCreated, setupFields]);

  const reload = useCallback(async () => {
    const result = await asyncAction.execute(
      () => loadEncryptedWalletKey(),
      'Wallet state refreshed.'
    );
    if (result) setWalletKey(result);
  }, [asyncAction]);

  const clearWallet = useCallback(() => {
    setWalletKey(null);
    asyncAction.clear();
  }, [asyncAction]);

  return useMemo(
    () => ({
      walletKey,
      setupFields,
      changeFields,
      actions: { 
        changePassword, 
        createWalletKey, 
        reload, 
        clearWallet 
      },
      status: {
        loading: asyncAction.loading,
        message: asyncAction.message,
        error: asyncAction.error,
      },
    }),
    [
      walletKey,
      setupFields,
      changeFields,
      changePassword,
      createWalletKey,
      reload,
      clearWallet,
      asyncAction.loading,
      asyncAction.message,
      asyncAction.error,
    ]
  );
}
