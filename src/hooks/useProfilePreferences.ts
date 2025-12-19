import { useCallback, useEffect, useMemo, useState } from 'react';
import { availableLanguages, setLanguage as setI18nLanguage } from '@i18n';
import type { AvatarType, LanguageCode, ThemePreference } from '@app-types/profile';
import { profileStyles as styles } from '@styles/ProfileStyles';
import {
  fetchRemoteProfile,
  getAuthSession,
  isSupabaseConfigured,
  loadEncryptedWalletKey,
  loadProfileSettings,
  normalizeLanguage,
  saveProfileSettings,
  upsertRemoteProfile,
  type AuthSession,
} from '@services';
import { makeSeed } from '@utils/identicon';
import type { StyleProp, ViewStyle } from 'react-native';

const ALIAS_MIN = 3;
const ALIAS_MAX = 24;
const ALIAS_REGEX = /^[a-zA-Z0-9 _-]+$/;

type ProfilePreferencesState = {
  alias: string;
  avatarType: AvatarType;
  avatarSeed: string;
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
  session?: AuthSession;
};

const initialState: ProfilePreferencesState = {
  alias: '',
  avatarType: 'identicon',
  avatarSeed: '',
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

  const cardStyle = useMemo<StyleProp<ViewStyle>>(
    () => [styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }],
    [theme.colors],
  );
  const scrollStyle = useMemo<StyleProp<ViewStyle>>(
    () => [styles.scrollContent, { backgroundColor: theme.colors.background }],
    [theme.colors],
  );

  const loadProfile = useCallback(
    async (isActive: () => boolean) => {
      if (!isActive()) return;
      updateStatus({ loading: true, error: null });
      try {
        const [settings, key] = await Promise.all([loadProfileSettings(), loadEncryptedWalletKey()]);
        const currentSession = session ?? (await getAuthSession());
        const useSupabaseProfile = Boolean(isSupabaseConfigured && currentSession?.user?.id);
        const remoteProfile = useSupabaseProfile ? await fetchRemoteProfile(currentSession!.user!.id) : null;
        if (!isActive()) return;

        const merged = remoteProfile ?? settings;
        const mergedTheme = merged.themePreference ?? 'system';
        const mergedLanguage = normalizeLanguage(merged.language);
        const nextSeed = merged.avatarSeed ?? key?.id ?? makeSeed();

        setState({
          alias: merged.alias ?? '',
          avatarType: merged.avatarType ?? 'identicon',
          avatarSeed: nextSeed,
          themePreference: mergedTheme,
          language: mergedLanguage,
          profileSource: remoteProfile ? 'supabase' : 'local',
        });

        setI18nLanguage(mergedLanguage);
        if (mergedTheme !== theme.preference) {
          await theme.setPreference(mergedTheme);
        }
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
    [session, theme],
  );

  useEffect(() => {
    let mounted = true;
    loadProfile(() => mounted);
    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const setAlias = (value: string) => setState((prev) => ({ ...prev, alias: value }));
  const setAvatarType = (value: AvatarType) => setState((prev) => ({ ...prev, avatarType: value }));
  const setAvatarSeed = (value: string) => setState((prev) => ({ ...prev, avatarSeed: value }));
  const setLanguage = (value: LanguageCode) => setState((prev) => ({ ...prev, language: value }));
  const setThemePreference = async (value: ThemePreference) => {
    setState((prev) => ({ ...prev, themePreference: value }));
    await theme.setPreference(value);
  };

  const save = async () => {
    updateStatus({ loading: true, message: null, error: null });
    const trimmed = state.alias.trim();
    const aliasError = validateAlias(trimmed);
    if (aliasError) {
      updateStatus({ loading: false, message: null, error: aliasError });
      return;
    }
    try {
      const saved = await saveProfileSettings({
        alias: trimmed,
        avatarType: state.avatarType,
        avatarSeed: state.avatarType === 'identicon' ? state.avatarSeed : undefined,
        themePreference: state.themePreference,
        language: state.language,
      });
      setI18nLanguage(state.language);
      if (isSupabaseConfigured && session?.user?.id) {
        await upsertRemoteProfile(session.user.id, saved);
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
      setLanguage,
      setThemePreference,
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
