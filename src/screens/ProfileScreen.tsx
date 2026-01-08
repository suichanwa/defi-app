import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  AboutAppTab,
  AuthTab,
  ChangelogTab,
  DeveloperTab,
  LocalizationTab,
  PersonalizationTab,
  ProfileHomeTab,
  ProfileTabTransition,
  RewardsTab,
  SecurityTab,
} from '@components/profile';
import { StatusDialog } from '@components/common';
import { REWARD_RULES } from '@constants/profile.constants';
import { useWalletSession } from '@context/WalletSessionProvider';
import { useProfileAuth } from '@hooks/useProfileAuth';
import { useProfilePreferences } from '@hooks/useProfilePreferences';
import { useRewards } from '@hooks/useRewards';
import { useWalletSecurity } from '@hooks/useWalletSecurity';
import { useTheme } from '@theme/ThemeProvider';
import { buildIdenticon } from '@utils/identicon';
import type { LocalSession } from '@hooks/useProfileAuth';

type ProfileView =
  | 'home'
  | 'personalization'
  | 'security'
  | 'rewards'
  | 'auth'
  | 'developer'
  | 'localization'
  | 'about'
  | 'changelog';

export default function ProfileScreen() {
  const [view, setView] = useState<ProfileView>('home');
  const [developerDialog, setDeveloperDialog] = useState(false);
  const [developerStatus, setDeveloperStatus] = useState<{ message: string | null; error: string | null; loading: boolean }>({
    message: null,
    error: null,
    loading: false,
  });

  const theme = useTheme();
  const { forgetWallet } = useWalletSession();
  const auth = useProfileAuth();
  const profile = useProfilePreferences({ theme, session: auth.state.session });
  const rewards = useRewards({ session: auth.state.session });
  const security = useWalletSecurity({
    alias: profile.state.alias,
    avatarType: profile.state.avatarType,
    themePreference: profile.state.themePreference,
    language: profile.state.language,
    onWalletKeyCreated: profile.actions.setAvatarSeed,
  });

  const identiconSeed = security.state.walletKey?.id ?? profile.state.avatarSeed;
  const identicon = useMemo(() => buildIdenticon(identiconSeed || 'seed'), [identiconSeed]);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (view !== 'home') {
        setView('home');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [view]);

  const setDeveloperFeedback = (next: { message: string | null; error: string | null }) => {
    setDeveloperStatus((prev) => ({ ...prev, loading: false, ...next }));
    setDeveloperDialog(true);
  };

  const runDevAction = async (fn: () => Promise<void>, success: string) => {
    setDeveloperStatus({ message: null, error: null, loading: true });
    try {
      await fn();
      setDeveloperFeedback({ message: success, error: null });
    } catch (error) {
      setDeveloperFeedback({
        message: null,
        error: error instanceof Error ? error.message : 'Action failed.',
      });
    }
  };

  const handleRefreshData = async () => {
    await runDevAction(
      async () => {
        await Promise.all([profile.actions.reload(), rewards.actions.refresh(), security.actions.reload()]);
      },
      'Profile data reloaded.',
    );
  };

  const handleClearWallet = async () => {
    await runDevAction(
      async () => {
        await forgetWallet();
        await security.actions.clearWallet();
      },
      'Local wallet key removed.',
    );
  };

  const handleResetProfile = async () => {
    await runDevAction(() => profile.actions.reset(), 'Profile settings reset.');
  };

  const handleClearRewards = async () => {
    await runDevAction(() => rewards.actions.clearCache(), 'Rewards cache cleared.');
  };

  const handleDeveloperSignOut = async () => {
    await runDevAction(() => auth.actions.signOut(), 'Signed out.');
  };

  const handleDeleteAccount = async () => {
    await runDevAction(
      async () => {
        await auth.actions.signOut();
        await Promise.all([forgetWallet(), profile.actions.reset(), rewards.actions.clearCache()]);
        await security.actions.clearWallet();
      },
      'Signed out and cleared local data. Remote deletion requires backend support.',
    );
  };

  let content: React.ReactNode;

  switch (view) {
    case 'personalization':
      content = (
        <PersonalizationTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          onBack={() => setView('home')}
          alias={profile.state.alias}
          onChangeAlias={profile.actions.setAlias}
          avatarType={profile.state.avatarType}
          onChangeAvatarType={profile.actions.setAvatarType}
          avatarUri={profile.state.avatarUri}
          onPickAvatar={profile.actions.pickAvatar}
          onClearAvatar={() => {
            profile.actions.setAvatarUri(undefined);
            profile.actions.setAvatarType('none');
          }}
          identicon={identicon}
          themePreference={profile.state.themePreference}
          onChangeThemePreference={profile.actions.setThemePreference}
          profileError={profile.status.error}
          profileMessage={profile.status.message}
          onSave={profile.actions.save}
        />
      );
      break;
    case 'auth':
      content = (
        <AuthTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          onBack={() => setView('home')}
          session={auth.state.session}
          authEmail={auth.state.email}
          authPassword={auth.state.password}
          accountPassword={auth.state.accountPassword}
          accountConfirm={auth.state.accountConfirm}
          authMessage={auth.state.message}
          authError={auth.state.error}
          authLoading={auth.state.loading}
          onChangeAuthEmail={(value) => auth.actions.setField('email', value)}
          onChangeAuthPassword={(value) => auth.actions.setField('password', value)}
          onChangeAccountPassword={(value) => auth.actions.setField('accountPassword', value)}
          onChangeAccountConfirm={(value) => auth.actions.setField('accountConfirm', value)}
          onSignUp={auth.actions.signUp}
          onSignIn={auth.actions.signIn}
          onSignOut={auth.actions.signOut}
          onSignInAnonymously={auth.actions.signInAnonymously}
          onUpdateAccountPassword={auth.actions.updatePassword}
        />
      );
      break;
    case 'security':
      content = (
        <SecurityTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          onBack={() => setView('home')}
          walletKey={security.state.walletKey}
          setupPassword={security.state.setupPassword}
          setupConfirm={security.state.setupConfirm}
          currentPassword={security.state.currentPassword}
          newPassword={security.state.newPassword}
          confirmPassword={security.state.confirmPassword}
          securityMessage={security.status.message}
          securityError={security.status.error}
          onChangeSetupPassword={(value) => security.actions.setField('setupPassword', value)}
          onChangeSetupConfirm={(value) => security.actions.setField('setupConfirm', value)}
          onChangeCurrentPassword={(value) => security.actions.setField('currentPassword', value)}
          onChangeNewPassword={(value) => security.actions.setField('newPassword', value)}
          onChangeConfirmPassword={(value) => security.actions.setField('confirmPassword', value)}
          onCreateWalletKey={security.actions.createWalletKey}
          onChangePassword={security.actions.changePassword}
        />
      );
      break;
    case 'rewards':
      content = (
        <RewardsTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          onBack={() => setView('home')}
          rewardsSummary={rewards.state.rewardsSummary}
          rewardsSource={rewards.state.rewardsSource}
          effectiveUserId={rewards.state.effectiveUserId}
          rules={REWARD_RULES}
          rewardsActivity={rewards.state.rewardsActivity}
        />
      );
      break;
    case 'localization':
      content = (
        <LocalizationTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          onBack={() => setView('home')}
          language={profile.state.language}
          onChangeLanguage={profile.actions.setLanguage}
          onSave={profile.actions.save}
          message={profile.status.message}
          error={profile.status.error}
        />
      );
      break;
    case 'developer':
      content = (
        <>
          <DeveloperTab
            scrollStyle={profile.styles.scrollStyle}
            cardStyle={profile.styles.cardStyle}
            onBack={() => setView('home')}
            hasSession={Boolean(auth.state.session)}
            isBusy={developerStatus.loading}
            developerMessage={developerStatus.message}
            developerError={developerStatus.error}
            onRefreshData={handleRefreshData}
            onClearWallet={handleClearWallet}
            onResetProfile={handleResetProfile}
            onClearRewards={handleClearRewards}
            onSignOut={handleDeveloperSignOut}
            onDeleteAccount={handleDeleteAccount}
          />
          <StatusDialog
            visible={developerDialog && (!!developerStatus.message || !!developerStatus.error)}
            title={developerStatus.error ? 'Action failed' : 'Action completed'}
            message={developerStatus.error ?? developerStatus.message ?? ''}
            variant={developerStatus.error ? 'error' : 'success'}
            onClose={() => {
              setDeveloperDialog(false);
              setDeveloperStatus((prev) => ({ ...prev, message: null, error: null }));
            }}
          />
        </>
      );
      break;
    case 'about':
      content = (
        <AboutAppTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          onBack={() => setView('home')}
        />
      );
      break;
    case 'changelog':
      content = (
        <ChangelogTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          onBack={() => setView('home')}
        />
      );
      break;
    default:
      content = (
        <ProfileHomeTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          profileSource={profile.state.profileSource}
          onOpenPersonalization={() => setView('personalization')}
          onOpenAuth={() => setView('auth')}
          onOpenSecurity={() => setView('security')}
          onOpenRewards={() => setView('rewards')}
          onOpenLocalization={() => setView('localization')}
          onOpenDeveloper={() => setView('developer')}
          onOpenAbout={() => setView('about')}
          onOpenChangelog={() => setView('changelog')}
          buildLabel="dev build 0.19.0"
        />
      );
  }

  const disableTransitions = Platform.OS === 'android' && Constants.appOwnership === 'expo';

  return (
    <ProfileTabTransition viewKey={view} enabled={!disableTransitions}>
      {content}
    </ProfileTabTransition>
  );
}
