import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { availableLanguages, setLanguage as setI18nLanguage } from '@i18n';
import type { AvatarType, LanguageCode, ThemePreference } from '@app-types/profile';
import { createProfileStyles } from '@styles/ProfileStyles';
import type { LocalSession } from '@hooks/useProfileAuth';
import {
  loadEncryptedWalletKey,
  loadProfileSettings,
  normalizeLanguage,
  saveProfileSettings,
  type AuthSession,
} from '@services';
import { clearBiometricPassword } from '@services/biometrics';
import { makeSeed } from '@utils/identicon';
import type { StyleProp, ViewStyle } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const ALIAS_MIN = 3;
const ALIAS_MAX = 24;
const ALIAS_REGEX = /^[a-zA-Z0-9 _-]+$/;

type ProfilePreferencesState = {
  alias: string;
  bio: string;
  avatarType: AvatarType;
  avatarSeed: string;
  avatarUri?: string;
  themePreference: ThemePreference;
  language: LanguageCode;
  walletBiometricUnlockEnabled: boolean;
  experimental?: {
    cardNamesEnabled?: boolean;
  };
  profileSource: 'local' | 'supabase';
};

type ProfilePreferencesStatus = {
  loading: boolean;
  message: string | null;
  error: string | null;
};

type ProfilePreferencesArgs = {
  theme: {
    preference: ThemePreference;
    setPreference: (pref: ThemePreference) => Promise<void> | void;
    colors: { card: string; border: string; background: string };
  };
  session?: AuthSession | LocalSession | null;
};

const initialState: ProfilePreferencesState = {
  alias: '',
  bio: '',
  avatarType: 'identicon',
  avatarSeed: '',
  avatarUri: undefined,
  themePreference: 'system',
  language: 'en',
  walletBiometricUnlockEnabled: true,
  experimental: {
    cardNamesEnabled: false,
  },
  profileSource: 'local',
};

const initialStatus: ProfilePreferencesStatus = {
  loading: false,
  message: null,
  error: null,
};

const normalizeProfileError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return message || fallback;
};

export function useProfilePreferences({ theme, session }: ProfilePreferencesArgs) {
  const [state, setState] = useState<ProfilePreferencesState>(initialState);
  const [status, setStatus] = useState<ProfilePreferencesStatus>(initialStatus);
  const applyThemePreference = theme.setPreference;
  const saveInFlightRef = useRef(false);
  const didInitRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevProfileRef = useRef({
    alias: initialState.alias,
    bio: initialState.bio,
    avatarType: initialState.avatarType,
    avatarUri: initialState.avatarUri,
    walletBiometricUnlockEnabled: initialState.walletBiometricUnlockEnabled,
  });

  const updateStatus = (next: Partial<ProfilePreferencesStatus>) =>
    setStatus((prev) => ({ ...prev, ...next }));

  const validateAlias = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length > 0 && (trimmed.length < ALIAS_MIN || trimmed.length > ALIAS_MAX)) {
      return `Alias must be ${ALIAS_MIN}-${ALIAS_MAX} characters.`;
    }
    if (trimmed.length > 0 && !ALIAS_REGEX.test(trimmed)) {
      return 'Alias can only use letters, numbers, spaces, _ and -.';
    }
    return null;
  };

  const themedStyles = useMemo(() => createProfileStyles(theme.colors as any), [theme.colors]);
  const cardStyle = themedStyles.card as StyleProp<ViewStyle>;
  const scrollStyle = themedStyles.scrollContent as StyleProp<ViewStyle>;

  const loadProfile = useCallback(
    async (isActive: () => boolean) => {
      if (!isActive()) return;
      didInitRef.current = false;
      updateStatus({ loading: true, error: null });
      try {
        const [settings, key] = await Promise.all([loadProfileSettings(), loadEncryptedWalletKey()]);
        if (!isActive()) return;

        const merged = settings;
        const mergedTheme = merged.themePreference ?? 'system';
        const mergedLanguage = normalizeLanguage(merged.language);
        const nextSeed = merged.avatarSeed ?? key?.id ?? makeSeed();

        const localExperimental = settings.experimental ?? { cardNamesEnabled: false };

        setState({
          alias: merged.alias ?? '',
          bio: merged.bio ?? '',
          avatarType: merged.avatarType ?? 'identicon',
          avatarSeed: nextSeed,
          avatarUri: merged.avatarUri,
          themePreference: mergedTheme,
          language: mergedLanguage,
          walletBiometricUnlockEnabled: merged.walletBiometricUnlockEnabled ?? true,
          experimental: localExperimental,
          profileSource: 'local',
        });

        setI18nLanguage(mergedLanguage);
        await applyThemePreference(mergedTheme);
        if (!merged.avatarSeed) {
          await saveProfileSettings({ ...merged, avatarSeed: nextSeed });
        }
        if (!isActive()) return;
        updateStatus({ loading: false });
        didInitRef.current = true;
      } catch (error) {
        if (!isActive()) return;
        updateStatus({
          loading: false,
          message: null,
          error: normalizeProfileError(error, 'Unable to load profile.'),
        });
      }
    },
    [applyThemePreference, session],
  );

  useEffect(() => {
    let mounted = true;
    loadProfile(() => mounted);
    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const setAlias = (value: string) => setState((prev) => ({ ...prev, alias: value }));
  const setBio = (value: string) => setState((prev) => ({ ...prev, bio: value }));
  const setAvatarType = (value: AvatarType) =>
    setState((prev) => ({ ...prev, avatarType: value, ...(value !== 'custom' ? { avatarUri: undefined } : {}) }));
  const setAvatarSeed = (value: string) => setState((prev) => ({ ...prev, avatarSeed: value }));
  const setAvatarUri = (value?: string) => setState((prev) => ({ ...prev, avatarUri: value }));
  const setLanguage = (value: LanguageCode) => setState((prev) => ({ ...prev, language: value }));
  const setThemePreference = async (value: ThemePreference) => {
    setState((prev) => ({ ...prev, themePreference: value }));
    await applyThemePreference(value);
  };
  const setWalletBiometricUnlockEnabled = (value: boolean) =>
    setState((prev) => ({ ...prev, walletBiometricUnlockEnabled: value }));
  const setCardNamesEnabled = (enabled: boolean) => 
    setState((prev) => ({ ...prev, experimental: { ...prev.experimental, cardNamesEnabled: enabled } }));

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      updateStatus({ error: 'Media permission is required to pick an avatar.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) {
        setState((prev) => ({ ...prev, avatarUri: uri, avatarType: 'custom' }));
        updateStatus({ error: null });
      }
    }
  };

  const save = useCallback(async () => {
    if (saveInFlightRef.current) {
      return;
    }
    saveInFlightRef.current = true;
    setStatus({ loading: true, message: null, error: null });
    const trimmed = state.alias.trim();
    const aliasError = validateAlias(trimmed);
    if (aliasError) {
      setStatus({ loading: false, message: null, error: aliasError });
      saveInFlightRef.current = false;
      return;
    }
    if (state.avatarType === 'custom' && !state.avatarUri) {
      setStatus({ loading: false, message: null, error: 'Pick a photo to use a custom avatar.' });
      saveInFlightRef.current = false;
      return;
    }
    try {
      const settings = {
        alias: trimmed,
        bio: state.bio.trim(),
        avatarType: state.avatarType,
        avatarSeed: state.avatarType === 'identicon' ? state.avatarSeed : undefined,
        avatarUri: state.avatarType === 'custom' ? state.avatarUri : undefined,
        themePreference: state.themePreference,
        language: state.language,
        walletBiometricUnlockEnabled: state.walletBiometricUnlockEnabled,
        experimental: state.experimental,
        updatedAt: new Date().toISOString(),
      };
      await saveProfileSettings(settings);
      if (!state.walletBiometricUnlockEnabled) {
        await clearBiometricPassword();
      }
      setStatus({ loading: false, message: 'Profile saved locally.', error: null });
      setState((prev) => ({ ...prev, profileSource: 'local' }));

      setI18nLanguage(state.language);
      setState((prev) => ({ ...prev, alias: settings.alias }));
    } catch (error) {
      setStatus({ loading: false, message: null, error: normalizeProfileError(error, 'Unable to save profile.') });
    } finally {
      saveInFlightRef.current = false;
    }
  }, [state, session]);

  useEffect(() => {
    if (!didInitRef.current) {
      prevProfileRef.current = {
        alias: state.alias,
        bio: state.bio,
        avatarType: state.avatarType,
        avatarUri: state.avatarUri,
        walletBiometricUnlockEnabled: state.walletBiometricUnlockEnabled,
      };
      return;
    }

    const prev = prevProfileRef.current;
    const aliasChanged = prev.alias !== state.alias;
    const bioChanged = prev.bio !== state.bio;
    const avatarTypeChanged = prev.avatarType !== state.avatarType;
    const avatarUriChanged = prev.avatarUri !== state.avatarUri;
    const biometricChanged = prev.walletBiometricUnlockEnabled !== state.walletBiometricUnlockEnabled;
    if (!aliasChanged && !bioChanged && !avatarTypeChanged && !avatarUriChanged && !biometricChanged) return;

    prevProfileRef.current = {
      alias: state.alias,
      bio: state.bio,
      avatarType: state.avatarType,
      avatarUri: state.avatarUri,
      walletBiometricUnlockEnabled: state.walletBiometricUnlockEnabled,
    };

    if (aliasChanged) {
      const aliasError = validateAlias(state.alias);
      if (aliasError) {
        updateStatus({ loading: false, message: null, error: aliasError });
        return;
      }
    }

    const avatarBecameRemote =
      Boolean(prev.avatarUri) &&
      !prev.avatarUri?.startsWith('http') &&
      Boolean(state.avatarUri) &&
      state.avatarUri?.startsWith('http');

    if (avatarBecameRemote && !aliasChanged && !avatarTypeChanged && !biometricChanged) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const delayMs = avatarTypeChanged || avatarUriChanged || biometricChanged ? 0 : 600;
    autoSaveTimerRef.current = setTimeout(() => {
      save();
    }, delayMs);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [save, state.alias, state.bio, state.avatarType, state.avatarUri, state.walletBiometricUnlockEnabled]);

  useEffect(() => {
    if (state.profileSource !== 'local') return;

    let mounted = true;
    loadProfile(() => mounted);
    return () => {
      mounted = false;
    };
  }, [loadProfile, state.profileSource]);

  const reset = async () => {
    updateStatus({ loading: true, message: null, error: null });
    try {
      await saveProfileSettings({
        alias: '',
        bio: '',
        avatarType: 'identicon',
        avatarSeed: '',
        avatarUri: undefined,
        themePreference: 'system',
        language: 'en',
        walletBiometricUnlockEnabled: true,
        experimental: { cardNamesEnabled: false },
      });
      await loadProfile(() => true);
      updateStatus({ loading: false, message: 'Profile settings reset.', error: null });
    } catch {
      updateStatus({ loading: false, message: null, error: 'Unable to reset profile settings.' });
    }
  };

  return {
    state,
    status,
    actions: {
      setAlias,
      setBio,
      setAvatarType,
      setAvatarSeed,
      setAvatarUri,
      setLanguage,
      setThemePreference,
      setWalletBiometricUnlockEnabled,
      setCardNamesEnabled,
      pickAvatar,
      save,
      reload: () => loadProfile(() => true),
      reset,
    },
    styles: {
      cardStyle,
      scrollStyle,
    },
    availableLanguages,
  };
}
