import { useCallback, useEffect, useMemo, useState } from 'react';
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
  profileSource: 'local',
};

const initialStatus: ProfilePreferencesStatus = {
  loading: false,
  message: null,
  error: null,
};

export function useProfilePreferences({ theme, session }: ProfilePreferencesArgs) {
  const [state, setState] = useState<ProfilePreferencesState>(initialState);
  const [status, setStatus] = useState<ProfilePreferencesStatus>(initialStatus);
  const applyThemePreference = theme.setPreference;

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
      updateStatus({ loading: true, error: null });
      try {
        const [settings, key] = await Promise.all([loadProfileSettings(), loadEncryptedWalletKey()]);
        const currentSession = session ?? (await getAuthSession());
        let profileId: string | null = null;
        if (isSupabaseConfigured) {
          if (currentSession?.user?.id) {
            profileId = currentSession.user.id;
          } else {
            const anonId = await getAnonymousId();
            profileId = toAnonymousProfileId(anonId);
          }
        }
        const remoteProfile = profileId ? await fetchRemoteProfile(profileId) : null;
        if (!isActive()) return;

        const merged = remoteProfile ?? settings;
        const mergedTheme = merged.themePreference ?? 'system';
        const mergedLanguage = normalizeLanguage(merged.language);
        const nextSeed = merged.avatarSeed ?? key?.id ?? makeSeed();

        setState({
          alias: merged.alias ?? '',
          avatarType: merged.avatarType ?? 'identicon',
          avatarSeed: nextSeed,
          avatarUri: merged.avatarUri,
          themePreference: mergedTheme,
          language: mergedLanguage,
          profileSource: remoteProfile ? 'supabase' : 'local',
        });

        setI18nLanguage(mergedLanguage);
        await applyThemePreference(mergedTheme);
        if (!merged.avatarSeed) {
          await saveProfileSettings({ ...merged, avatarSeed: nextSeed });
        }
        if (!isActive()) return;
        updateStatus({ loading: false });
      } catch (error) {
        if (!isActive()) return;
        updateStatus({ loading: false, message: null, error: error instanceof Error ? error.message : 'Unable to load profile.' });
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
    setState((prev) => ({ ...prev, avatarType: value, ...(value !== 'custom' ? { avatarUri: undefined } : {} ) }));
  const setAvatarSeed = (value: string) => setState((prev) => ({ ...prev, avatarSeed: value }));
  const setAvatarUri = (value?: string) => setState((prev) => ({ ...prev, avatarUri: value }));
  const setLanguage = (value: LanguageCode) => setState((prev) => ({ ...prev, language: value }));
  const setThemePreference = async (value: ThemePreference) => {
    setState((prev) => ({ ...prev, themePreference: value }));
    await applyThemePreference(value);
  };

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      updateStatus({ error: 'Media permission is required to pick an avatar.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
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

  const save = async () => {
    updateStatus({ loading: true, message: null, error: null });
    const trimmed = state.alias.trim();
    const aliasError = validateAlias(trimmed);
    if (aliasError) {
      updateStatus({ loading: false, message: null, error: aliasError });
      return;
    }
    if (state.avatarType === 'custom' && !state.avatarUri) {
      updateStatus({ loading: false, message: null, error: 'Pick a photo to use a custom avatar.' });
      return;
    }
    try {
      let profileId: string | null = null;
      if (isSupabaseConfigured) {
        if (session?.user?.id) {
          profileId = session.user.id;
        } else {
          const anonId = await getAnonymousId();
          profileId = toAnonymousProfileId(anonId);
        }
      }
      let remoteAvatarUrl = state.avatarUri;
      if (state.avatarType === 'custom' && state.avatarUri && profileId) {
        remoteAvatarUrl = await uploadAvatar(profileId, state.avatarUri);
        setState((prev) => ({ ...prev, avatarUri: remoteAvatarUrl }));
      }
      const saved = await saveProfileSettings({
        alias: trimmed,
        avatarType: state.avatarType,
        avatarSeed: state.avatarType === 'identicon' ? state.avatarSeed : undefined,
        avatarUri: state.avatarType === 'custom' ? remoteAvatarUrl : undefined,
        themePreference: state.themePreference,
        language: state.language,
      });
      setI18nLanguage(state.language);
      if (profileId) {
        await upsertRemoteProfile(profileId, saved);
        setState((prev) => ({ ...prev, profileSource: 'supabase' }));
      }
      setState((prev) => ({ ...prev, alias: saved.alias }));
      updateStatus({ loading: false, message: 'Profile preferences saved.', error: null });
    } catch (error) {
      updateStatus({ loading: false, message: null, error: error instanceof Error ? error.message : 'Unable to save profile.' });
    }
  };

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
