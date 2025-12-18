import React, { useEffect, useMemo, useState } from 'react';
import { profileStyles as styles } from '../styles/ProfileStyles';
import type { AvatarType, LanguageCode, ThemePreference } from '../types/profile';
import type { EncryptedWalletKey } from '../types/wallet';
import type { RewardActivity, RewardsSummary } from '../types/rewards';
import { clearProfileSettings, loadProfileSettings, normalizeLanguage, saveProfileSettings } from '../services/profileStore';
import { clearRewardsCache, loadRewardsActivity, loadRewardsSummary } from '../services/rewardsStore';
import {
  getAuthSession,
  onAuthStateChange,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateAccountPassword,
  type AuthSession,
} from '../services/auth';
import { getAnonymousId } from '../services/identity';
import {
  fetchRewardsActivity,
  fetchRewardsSummary,
  insertRewardsActivity,
  upsertRewardsSummary,
} from '../services/rewardsRemote';
import { isSupabaseConfigured } from '../services/supabaseClient';
import { fetchRemoteProfile, upsertRemoteProfile } from '../services/profileRemote';
import {
  changeWalletPassword,
  createInitialWalletKey,
  loadEncryptedWalletKey,
  WalletKeyNotFoundError,
  WalletPasswordError,
  WalletReencryptError,
} from '../services/walletKeyStore';
import { useWalletSession } from '../context/WalletSessionProvider';
import { useTheme } from '../theme/ThemeProvider';
import { availableLanguages, setLanguage as setI18nLanguage } from '../i18n';
import AuthTab from '../components/profile/AuthTab';
import DeveloperTab from '../components/profile/DeveloperTab';
import AboutAppTab from '../components/profile/AboutAppTab';
import LocalizationTab from '../components/profile/LocalizationTab';
import PersonalizationTab from '../components/profile/PersonalizationTab';
import ProfileHomeTab from '../components/profile/ProfileHomeTab';
import RewardsTab from '../components/profile/RewardsTab';
import SecurityTab from '../components/profile/SecurityTab';
import StatusDialog from '../components/common/StatusDialog';

type ProfileView = 'home' | 'personalization' | 'security' | 'rewards' | 'auth' | 'developer' | 'localization' | 'about';

const ALIAS_MIN = 3;
const ALIAS_MAX = 24;
const PASSWORD_MIN = 8;
const ALIAS_REGEX = /^[a-zA-Z0-9 _-]+$/;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const makeSeed = () => `seed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const createRng = (seed: string) => {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
};

const buildIdenticon = (seed: string) => {
  const rng = createRng(seed);
  const grid: boolean[] = [];
  for (let row = 0; row < 5; row += 1) {
    const rowValues = [rng() > 0.5, rng() > 0.5, rng() > 0.5];
    const mirrored = [...rowValues, rowValues[1], rowValues[0]];
    grid.push(...mirrored);
  }
  const palette = ['#4f46e5', '#0ea5e9', '#22c55e', '#f97316', '#ec4899'];
  const colorIndex = Math.abs(seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palette.length;
  return { grid, color: palette[colorIndex] };
};

export default function ProfileScreen() {
  const [view, setView] = useState<ProfileView>('home');
  const [alias, setAlias] = useState('');
  const [avatarType, setAvatarType] = useState<AvatarType>('identicon');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [language, setLanguage] = useState<LanguageCode>('en');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [walletKey, setWalletKey] = useState<EncryptedWalletKey | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirm, setAccountConfirm] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [developerMessage, setDeveloperMessage] = useState<string | null>(null);
  const [developerError, setDeveloperError] = useState<string | null>(null);
  const [developerLoading, setDeveloperLoading] = useState(false);
  const [showDeveloperDialog, setShowDeveloperDialog] = useState(false);
  const [rewardsSummary, setRewardsSummary] = useState<RewardsSummary | null>(null);
  const [rewardsActivity, setRewardsActivity] = useState<RewardActivity[]>([]);
  const [rewardsSource, setRewardsSource] = useState<'local' | 'supabase'>('local');
  const [profileSource, setProfileSource] = useState<'local' | 'supabase'>('local');
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  const { preference: themePrefCtx, setPreference: setThemePrefCtx, colors } = useTheme();
  const { forgetWallet } = useWalletSession();
  const cardStyle = useMemo(
    () => [styles.card, { backgroundColor: colors.card, borderColor: colors.border }],
    [colors],
  );
  const scrollStyle = useMemo(() => [styles.scrollContent, { backgroundColor: colors.background }], [colors]);

  const loadAll = async (isActive: () => boolean) => {
    const [settings, key] = await Promise.all([loadProfileSettings(), loadEncryptedWalletKey()]);
    const currentSession = await getAuthSession();
    const userId = currentSession?.user?.id ?? (await getAnonymousId());
    if (!isActive()) return;
    setEffectiveUserId(userId);
    const useSupabaseRewards = Boolean(isSupabaseConfigured && currentSession?.user?.id);
    const [remoteSummary, remoteActivity] = await Promise.all([
      useSupabaseRewards ? fetchRewardsSummary(userId) : Promise.resolve(null),
      useSupabaseRewards ? fetchRewardsActivity(userId) : Promise.resolve(null),
    ]);
    const [localSummary, localActivity] = await Promise.all([loadRewardsSummary(), loadRewardsActivity()]);
    const remoteProfile =
      isSupabaseConfigured && currentSession?.user?.id ? await fetchRemoteProfile(currentSession.user.id) : null;
    if (!isActive()) return;
    const mergedProfile = remoteProfile ?? settings;
    setProfileSource(remoteProfile ? 'supabase' : 'local');
    setAlias(mergedProfile.alias ?? '');
    setAvatarType(mergedProfile.avatarType ?? 'identicon');
    const nextSeed = mergedProfile.avatarSeed ?? key?.id ?? makeSeed();
    setAvatarSeed(nextSeed);
    const mergedTheme = mergedProfile.themePreference ?? 'system';
    const mergedLanguage = normalizeLanguage(mergedProfile.language);
    setThemePreference(mergedTheme);
    setLanguage(mergedLanguage);
    setI18nLanguage(mergedLanguage);
    if (mergedTheme !== themePrefCtx) {
      await setThemePrefCtx(mergedTheme);
    }
    if (!mergedProfile.avatarSeed) {
      await saveProfileSettings({ ...mergedProfile, avatarSeed: nextSeed });
    }
    setWalletKey(key);
    if (isSupabaseConfigured && remoteSummary) {
      setRewardsSummary(remoteSummary);
      setRewardsSource('supabase');
    } else {
      setRewardsSummary(localSummary);
      setRewardsSource('local');
    }

    if (isSupabaseConfigured && remoteActivity) {
      setRewardsActivity(remoteActivity);
    } else {
      setRewardsActivity(localActivity);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadAll(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getAuthSession().then((current) => {
      if (active) {
        setSession(current);
      }
    });
    const subscription = onAuthStateChange((next) => {
      setSession(next);
    });
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const identiconSeed = walletKey?.id ?? avatarSeed;
  const identicon = useMemo(() => buildIdenticon(identiconSeed || 'seed'), [identiconSeed]);

  const handleSaveProfile = async () => {
    setProfileMessage(null);
    setProfileError(null);
    const trimmed = alias.trim();
    if (trimmed.length > 0 && (trimmed.length < ALIAS_MIN || trimmed.length > ALIAS_MAX)) {
      setProfileError(`Alias must be ${ALIAS_MIN}-${ALIAS_MAX} characters.`);
      return;
    }
    if (trimmed.length > 0 && !ALIAS_REGEX.test(trimmed)) {
      setProfileError('Alias can only use letters, numbers, spaces, _ and -.');
      return;
    }
    const saved = await saveProfileSettings({
      alias: trimmed,
      avatarType,
      avatarSeed: avatarType === 'identicon' ? identiconSeed : undefined,
      themePreference,
      language,
    });
    setI18nLanguage(language);
    if (isSupabaseConfigured && session?.user?.id) {
      await upsertRemoteProfile(session.user.id, saved);
      setProfileSource('supabase');
      if (rewardsSource === 'supabase' && rewardsSummary) {
        await upsertRewardsSummary(session.user.id, rewardsSummary);
      }
      if (rewardsSource === 'supabase' && rewardsActivity.length > 0) {
        await insertRewardsActivity(session.user.id, rewardsActivity);
      }
    }
    setAlias(saved.alias);
    setProfileMessage('Profile preferences saved.');
  };

  const validateNewPassword = (value: string) => {
    if (value.length < PASSWORD_MIN) {
      return `Password must be at least ${PASSWORD_MIN} characters.`;
    }
    return null;
  };

  const handleSignUp = async () => {
    setAuthMessage(null);
    setAuthError(null);
    const email = authEmail.trim();
    if (!EMAIL_REGEX.test(email)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    const policyError = validateNewPassword(authPassword);
    if (policyError) {
      setAuthError(policyError);
      return;
    }
    setAuthLoading(true);
    try {
      const result = await signUpWithEmail(email, authPassword);
      if (result.session) {
        setAuthMessage('Account created. You are signed in.');
      } else {
        setAuthMessage('Account created. Check your email to confirm.');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async () => {
    setAuthMessage(null);
    setAuthError(null);
    const email = authEmail.trim();
    if (!EMAIL_REGEX.test(email)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    const policyError = validateNewPassword(authPassword);
    if (policyError) {
      setAuthError(policyError);
      return;
    }
    setAuthLoading(true);
    try {
      await signInWithEmail(email, authPassword);
      setAuthMessage('Signed in.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthMessage(null);
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signOut();
      setAuthMessage('Signed out.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateAccountPassword = async () => {
    setAuthMessage(null);
    setAuthError(null);
    if (!session) {
      setAuthError('Sign in to update your account password.');
      return;
    }
    const policyError = validateNewPassword(accountPassword);
    if (policyError) {
      setAuthError(policyError);
      return;
    }
    if (accountPassword !== accountConfirm) {
      setAuthError('Password entries do not match.');
      return;
    }
    setAuthLoading(true);
    try {
      await updateAccountPassword(accountPassword);
      setAccountPassword('');
      setAccountConfirm('');
      setAuthMessage('Account password updated.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to update password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setSecurityMessage(null);
    setSecurityError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError('Fill in all password fields.');
      return;
    }
    const policyError = validateNewPassword(newPassword);
    if (policyError) {
      setSecurityError(policyError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('New password entries do not match.');
      return;
    }
    try {
      const updated = await changeWalletPassword(currentPassword, newPassword);
      setWalletKey(updated);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSecurityMessage('Wallet password updated.');
    } catch (error) {
      if (error instanceof WalletPasswordError) {
        setSecurityError('Current password is incorrect.');
        return;
      }
      if (error instanceof WalletKeyNotFoundError) {
        setSecurityError('No local wallet key found.');
        return;
      }
      if (error instanceof WalletReencryptError) {
        setSecurityError('Unable to verify the new password.');
        return;
      }
      setSecurityError('Unexpected error updating password.');
    }
  };

  const handleCreateWalletKey = async () => {
    setSecurityMessage(null);
    setSecurityError(null);
    if (!setupPassword || !setupConfirm) {
      setSecurityError('Enter and confirm a password.');
      return;
    }
    const policyError = validateNewPassword(setupPassword);
    if (policyError) {
      setSecurityError(policyError);
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSecurityError('Password entries do not match.');
      return;
    }
    const created = await createInitialWalletKey(setupPassword);
    setWalletKey(created);
    if (avatarType === 'identicon') {
      setAvatarSeed(created.id);
      await saveProfileSettings({
        alias: alias.trim(),
        avatarType,
        avatarSeed: created.id,
        themePreference,
        language,
      });
    }
    setSetupPassword('');
    setSetupConfirm('');
    setSecurityMessage('Encrypted wallet key created.');
  };

  const handleRefreshData = async () => {
    setDeveloperMessage(null);
    setDeveloperError(null);
    setDeveloperLoading(true);
    try {
      await loadAll(() => true);
      setDeveloperMessage('Profile data reloaded.');
      setShowDeveloperDialog(true);
    } catch {
      setDeveloperError('Unable to reload profile data.');
      setShowDeveloperDialog(true);
    } finally {
      setDeveloperLoading(false);
    }
  };

  const handleClearWallet = async () => {
    setDeveloperMessage(null);
    setDeveloperError(null);
    setDeveloperLoading(true);
    try {
      await forgetWallet();
      setWalletKey(null);
      setDeveloperMessage('Local wallet key removed.');
      setShowDeveloperDialog(true);
    } catch {
      setDeveloperError('Unable to clear wallet data.');
      setShowDeveloperDialog(true);
    } finally {
      setDeveloperLoading(false);
    }
  };

  const handleResetProfile = async () => {
    setDeveloperMessage(null);
    setDeveloperError(null);
    setDeveloperLoading(true);
    try {
      await clearProfileSettings();
      await loadAll(() => true);
      setDeveloperMessage('Profile settings reset.');
      setShowDeveloperDialog(true);
    } catch {
      setDeveloperError('Unable to reset profile settings.');
      setShowDeveloperDialog(true);
    } finally {
      setDeveloperLoading(false);
    }
  };

  const handleClearRewards = async () => {
    setDeveloperMessage(null);
    setDeveloperError(null);
    setDeveloperLoading(true);
    try {
      await clearRewardsCache();
      await loadAll(() => true);
      setDeveloperMessage('Rewards cache cleared.');
      setShowDeveloperDialog(true);
    } catch {
      setDeveloperError('Unable to clear rewards cache.');
      setShowDeveloperDialog(true);
    } finally {
      setDeveloperLoading(false);
    }
  };

  const handleDeveloperSignOut = async () => {
    setDeveloperMessage(null);
    setDeveloperError(null);
    setDeveloperLoading(true);
    try {
      await signOut();
      setDeveloperMessage('Signed out.');
      setShowDeveloperDialog(true);
    } catch (error) {
      setDeveloperError(error instanceof Error ? error.message : 'Unable to sign out.');
      setShowDeveloperDialog(true);
    } finally {
      setDeveloperLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeveloperMessage(null);
    setDeveloperError(null);
    setDeveloperLoading(true);
    try {
      await signOut();
      await Promise.all([forgetWallet(), clearProfileSettings(), clearRewardsCache()]);
      setWalletKey(null);
      await loadAll(() => true);
      setDeveloperMessage('Signed out and cleared local data. Remote deletion requires backend support.');
      setShowDeveloperDialog(true);
    } catch (error) {
      setDeveloperError(error instanceof Error ? error.message : 'Unable to delete account.');
      setShowDeveloperDialog(true);
    } finally {
      setDeveloperLoading(false);
    }
  };

  const rules = [
    'Secure messaging activity earns daily points.',
    'Verify wallet backups for bonus rewards.',
    'Keep profile settings updated for streak boosts.',
  ];

  if (view === 'personalization') {
    return (
      <PersonalizationTab
        scrollStyle={scrollStyle}
        cardStyle={cardStyle}
        onBack={() => setView('home')}
        alias={alias}
        onChangeAlias={setAlias}
        avatarType={avatarType}
        onChangeAvatarType={setAvatarType}
        identicon={identicon}
        themePreference={themePreference}
        onChangeThemePreference={async (option) => {
          setThemePreference(option);
          await setThemePrefCtx(option);
        }}
        profileError={profileError}
        profileMessage={profileMessage}
        onSave={handleSaveProfile}
      />
    );
  }

  if (view === 'auth') {
    return (
      <AuthTab
        scrollStyle={scrollStyle}
        cardStyle={cardStyle}
        onBack={() => setView('home')}
        session={session}
        authEmail={authEmail}
        authPassword={authPassword}
        accountPassword={accountPassword}
        accountConfirm={accountConfirm}
        authMessage={authMessage}
        authError={authError}
        authLoading={authLoading}
        onChangeAuthEmail={setAuthEmail}
        onChangeAuthPassword={setAuthPassword}
        onChangeAccountPassword={setAccountPassword}
        onChangeAccountConfirm={setAccountConfirm}
        onSignUp={handleSignUp}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onUpdateAccountPassword={handleUpdateAccountPassword}
      />
    );
  }

  if (view === 'security') {
    return (
      <SecurityTab
        scrollStyle={scrollStyle}
        cardStyle={cardStyle}
        onBack={() => setView('home')}
        walletKey={walletKey}
        setupPassword={setupPassword}
        setupConfirm={setupConfirm}
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        securityMessage={securityMessage}
        securityError={securityError}
        onChangeSetupPassword={setSetupPassword}
        onChangeSetupConfirm={setSetupConfirm}
        onChangeCurrentPassword={setCurrentPassword}
        onChangeNewPassword={setNewPassword}
        onChangeConfirmPassword={setConfirmPassword}
        onCreateWalletKey={handleCreateWalletKey}
        onChangePassword={handleChangePassword}
      />
    );
  }

  if (view === 'rewards') {
    return (
      <RewardsTab
        scrollStyle={scrollStyle}
        cardStyle={cardStyle}
        onBack={() => setView('home')}
        rewardsSummary={rewardsSummary}
        rewardsSource={rewardsSource}
        effectiveUserId={effectiveUserId}
        rules={rules}
        rewardsActivity={rewardsActivity}
      />
    );
  }

  if (view === 'localization') {
    return (
      <LocalizationTab
        scrollStyle={scrollStyle}
        cardStyle={cardStyle}
        onBack={() => setView('home')}
        language={language}
        onChangeLanguage={setLanguage}
        onSave={handleSaveProfile}
        message={profileMessage}
        error={profileError}
      />
    );
  }

  if (view === 'developer') {
    return (
      <>
        <DeveloperTab
          scrollStyle={scrollStyle}
          cardStyle={cardStyle}
          onBack={() => setView('home')}
          hasSession={Boolean(session)}
          isBusy={developerLoading}
          developerMessage={developerMessage}
          developerError={developerError}
          onRefreshData={handleRefreshData}
          onClearWallet={handleClearWallet}
          onResetProfile={handleResetProfile}
          onClearRewards={handleClearRewards}
          onSignOut={handleDeveloperSignOut}
          onDeleteAccount={handleDeleteAccount}
        />
        <StatusDialog
          visible={showDeveloperDialog && (!!developerMessage || !!developerError)}
          title={developerError ? 'Action failed' : 'Action completed'}
          message={developerError ?? developerMessage ?? ''}
          variant={developerError ? 'error' : 'success'}
          onClose={() => {
            setShowDeveloperDialog(false);
            setDeveloperMessage(null);
            setDeveloperError(null);
          }}
        />
      </>
    );
  }

  if (view === 'about') {
    return <AboutAppTab scrollStyle={scrollStyle} cardStyle={cardStyle} onBack={() => setView('home')} />;
  }

  return (
    <ProfileHomeTab
      scrollStyle={scrollStyle}
      cardStyle={cardStyle}
      profileSource={profileSource}
      onOpenPersonalization={() => setView('personalization')}
      onOpenAuth={() => setView('auth')}
      onOpenSecurity={() => setView('security')}
      onOpenRewards={() => setView('rewards')}
      onOpenLocalization={() => setView('localization')}
      onOpenDeveloper={() => setView('developer')}
      onOpenAbout={() => setView('about')}
      buildLabel="dev build 0.08"
    />
  );
}
