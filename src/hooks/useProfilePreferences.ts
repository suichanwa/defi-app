import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { availableLanguages, setLanguage as setI18nLanguage } from '@i18n';
import type { AvatarType, LanguageCode, ThemePreference } from '@app-types/profile';
import { createProfileStyles } from '@styles/ProfileStyles';
import type { LocalSession } from '@hooks/useProfileAuth';
import {
  fetchRemoteProfile,
  getAnonymousId,
  getAuthSession,
  isSupabaseConfigured,
  loadEncryptedWalletKey,
  loadProfileSettings,
  normalizeLanguage,
  saveProfileSettings,
  toAnonymousProfileId,
  upsertRemoteProfile,
  type AuthSession,
} from '@services';
import { makeSeed } from '@utils/identicon';
import type { StyleProp, ViewStyle } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar } from '@services/avatarStorage';

const ALIAS_MIN = 3;
const ALIAS_MAX = 24;
const ALIAS_REGEX = /^[a-zA-Z0-9 _-]+$/;

type ProfilePreferencesState = {
  alias: string;
  avatarType: AvatarType;
  avatarSeed: string;
  avatarUri?: string;
  themePreference: ThemePreference;
  language: LanguageCode;
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
  avatarType: 'identicon',
  avatarSeed: '',
  avatarUri: undefined,
  themePreference: 'system',
  language: 'en',
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

const isSupabaseSession = (value: AuthSession | LocalSession | null | undefined): value is NonNullable<AuthSession> =>
  Boolean(value && typeof value === 'object' && 'access_token' in value);

const resolveProfileId = async (currentSession: AuthSession | LocalSession | null | undefined) => {
  if (!isSupabaseConfigured) return null;
  if (isSupabaseSession(currentSession)) {
    return currentSession.user?.id ?? null;
  }
  if (currentSession) {
    return null;
  }
  const anonId = await getAnonymousId();
  return toAnonymousProfileId(anonId);
};

const normalizeProfileError = (error: unknown, fallback: string) => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lower = message.toLowerCase();
  if (!message) return fallback;
  if (lower.includes('bucket') && lower.includes('not found')) {
    return 'Avatar upload failed. Create a public storage bucket named "avatars" in Supabase.';
  }
  if (lower.includes('row level security') || lower.includes('permission') || lower.includes('unauthorized')) {
    return 'Supabase policy blocked the request. Check RLS and storage policies.';
  }
  if (lower.includes('invalid input syntax for type uuid')) {
    return 'Supabase expects UUIDs for profile ids. Update user_profiles.id to text for anon/local profiles.';
  }
  return message || fallback;
};

export function useProfilePreferences({ theme, session }: ProfilePreferencesArgs) {
  const [state, setState] = useState<ProfilePreferencesState>(initialState);
  const [status, setStatus] = useState<ProfilePreferencesStatus>(initialStatus);
  const applyThemePreference = theme.setPreference;
  const didInitRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevProfileRef = useRef({
    alias: initialState.alias,
    avatarType: initialState.avatarType,
    avatarUri: initialState.avatarUri,
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
        const currentSession = session ?? (await getAuthSession());
        const profileId = await resolveProfileId(currentSession);
        const remoteProfile = profileId ? await fetchRemoteProfile(profileId) : null;
        if (!isActive()) return;

        const merged = remoteProfile ?? settings;
        const mergedTheme = merged.themePreference ?? 'system';
        const mergedLanguage = normalizeLanguage(merged.language);
        const nextSeed = merged.avatarSeed ?? key?.id ?? makeSeed();

        // Always use local experimental settings (never sync from Supabase)
        const localExperimental = settings.experimental ?? { cardNamesEnabled: false };

        setState({
          alias: merged.alias ?? '',
          avatarType: merged.avatarType ?? 'identicon',
          avatarSeed: nextSeed,
          avatarUri: merged.avatarUri,
          themePreference: mergedTheme,
          language: mergedLanguage,
          experimental: localExperimental,
          profileSource: remoteProfile ? 'supabase' : 'local',
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
  const setAvatarType = (value: AvatarType) =>
    setState((prev) => ({ ...prev, avatarType: value, ...(value !== 'custom' ? { avatarUri: undefined } : {}) }));
  const setAvatarSeed = (value: string) => setState((prev) => ({ ...prev, avatarSeed: value }));
  const setAvatarUri = (value?: string) => setState((prev) => ({ ...prev, avatarUri: value }));
  const setLanguage = (value: LanguageCode) => setState((prev) => ({ ...prev, language: value }));
  const setThemePreference = async (value: ThemePreference) => {
    setState((prev) => ({ ...prev, themePreference: value }));
    await applyThemePreference(value);
  };
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
    setStatus({ loading: true, message: null, error: null });
    const trimmed = state.alias.trim();
    const aliasError = validateAlias(trimmed);
    if (aliasError) {
      setStatus({ loading: false, message: null, error: aliasError });
      return;
    }
    if (state.avatarType === 'custom' && !state.avatarUri) {
      setStatus({ loading: false, message: null, error: 'Pick a photo to use a custom avatar.' });
      return;
    }
    try {
      const currentSession = session ?? (await getAuthSession());
      const profileId = await resolveProfileId(currentSession);
      let remoteAvatarUrl = state.avatarUri;
      if (state.avatarType === 'custom' && state.avatarUri && profileId) {
        try {
          remoteAvatarUrl = await uploadAvatar(profileId, state.avatarUri);
          setState((prev) => ({ ...prev, avatarUri: remoteAvatarUrl }));
        } catch (uploadError) {
          setStatus({
            loading: false,
            message: null,
            error: normalizeProfileError(uploadError, 'Unable to upload avatar.'),
          });
          return;
        }
      }
      const settings = {
        alias: trimmed,
        avatarType: state.avatarType,
        avatarSeed: state.avatarType === 'identicon' ? state.avatarSeed : undefined,
        avatarUri: state.avatarType === 'custom' ? remoteAvatarUrl : undefined,
        themePreference: state.themePreference,
        language: state.language,
        experimental: state.experimental,
        updatedAt: new Date().toISOString(),
      };
      // Always save locally first (including experimental settings)
      await saveProfileSettings(settings);
      setStatus({ loading: false, message: 'Profile saved locally.', error: null });

      // If signed in with Supabase, also save remotely (non-blocking)
      // Exclude experimental settings from remote sync - keep them local-only
      const userId = session?.user?.id;
      if (userId && isSupabaseConfigured) {
        // Run in background, don't block UI
        const { experimental: _, ...settingsWithoutExperimental } = settings;
        upsertRemoteProfile(userId, settingsWithoutExperimental)
          .then(() => {
            setState((prev) => ({ ...prev, profileSource: 'supabase' }));
            setStatus({ loading: false, message: 'Profile saved.', error: null });
          })
          .catch((remoteError) => {
            console.warn('Failed to sync profile to Supabase:', remoteError);
            // Keep local success message, just note the source
            setState((prev) => ({ ...prev, profileSource: 'local' }));
          });
      } else {
        setState((prev) => ({ ...prev, profileSource: 'local' }));
      }

      setI18nLanguage(state.language);
      setState((prev) => ({ ...prev, alias: settings.alias }));
    } catch (error) {
      setStatus({ loading: false, message: null, error: normalizeProfileError(error, 'Unable to save profile.') });
    }
  }, [state, session]);

  useEffect(() => {
    if (!didInitRef.current) {
      prevProfileRef.current = {
        alias: state.alias,
        avatarType: state.avatarType,
        avatarUri: state.avatarUri,
      };
      return;
    }

    const prev = prevProfileRef.current;
    const aliasChanged = prev.alias !== state.alias;
    const avatarTypeChanged = prev.avatarType !== state.avatarType;
    const avatarUriChanged = prev.avatarUri !== state.avatarUri;
    if (!aliasChanged && !avatarTypeChanged && !avatarUriChanged) return;

    prevProfileRef.current = {
      alias: state.alias,
      avatarType: state.avatarType,
      avatarUri: state.avatarUri,
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

    if (avatarBecameRemote && !aliasChanged && !avatarTypeChanged) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    const delayMs = avatarTypeChanged || avatarUriChanged ? 0 : 600;
    autoSaveTimerRef.current = setTimeout(() => {
      save();
    }, delayMs);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [save, state.alias, state.avatarType, state.avatarUri]);

  useEffect(() => {
    let mounted = true;
    if (state.profileSource === 'local') {
      loadProfile(() => mounted);
    }
    return () => {
      mounted = false;
    };
  }, [save, state.profileSource]);

  const reset = async () => {
    updateStatus({ loading: true, message: null, error: null });
    try {
      await saveProfileSettings({
        alias: '',
        avatarType: 'identicon',
        avatarSeed: '',
        avatarUri: undefined,
        themePreference: 'system',
        language: 'en',
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
      setAvatarType,
      setAvatarSeed,
      setAvatarUri,
      setLanguage,
      setThemePreference,
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
