import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import {
  AboutAppTab,
  AuthTab,
  ChangelogTab,
  DeveloperTab,
  ExperimentalTab,
  LocalizationTab,
  PersonalizationTab,
  ProfileHomeTab,
  ProfileTabTransition,
  RewardsTab,
  SecurityTab,
  TransactionHistoryTab,
} from '@components/profile';
import { StatusDialog } from '@components/common';
import { REWARD_RULES } from '@constants/profile.constants';
import { useWalletSession } from '@context/WalletSessionProvider';
import { useProfileAuth } from '@hooks/useProfileAuth';
import { useProfilePreferences } from '@hooks/useProfilePreferences';
import { useRewards } from '@hooks/useRewards';
import { useTransactionHistory } from '@hooks/useTransactionHistory';
import { useWalletSecurity } from '@hooks/useWalletSecurity';
import { useTheme } from '@theme/ThemeProvider';
import { buildIdenticon } from '@utils/identicon';
import type { LocalSession } from '@hooks/useProfileAuth';
import { APP_VARIANT, appFeatures } from '@config/appFeatures';

type ProfileView =
  | 'home'
  | 'personalization'
  | 'security'
  | 'rewards'
  | 'transactionHistory'
  | 'auth'
  | 'developer'
  | 'localization'
  | 'experimental'
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
  const { forgetWallet, address } = useWalletSession();
  const auth = useProfileAuth();
  const profile = useProfilePreferences({ theme, session: auth.state.session });
  const rewards = useRewards({ session: auth.state.session });
  const transactionHistory = useTransactionHistory({ address });
  const security = useWalletSecurity({
    alias: profile.state.alias,
    avatarType: profile.state.avatarType,
    themePreference: profile.state.themePreference,
    language: profile.state.language,
    onWalletKeyCreated: profile.actions.setAvatarSeed,
  });

  const identiconSeed = security.walletKey?.id ?? profile.state.avatarSeed;
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
          walletKey={security.walletKey}
          setupPassword={security.setupFields.fields.setupPassword}
          setupConfirm={security.setupFields.fields.setupConfirm}
          currentPassword={security.changeFields.fields.currentPassword}
          newPassword={security.changeFields.fields.newPassword}
          confirmPassword={security.changeFields.fields.confirmPassword}
          securityMessage={security.status.message}
          securityError={security.status.error}
          onChangeSetupPassword={(value) => security.setupFields.setField('setupPassword', value)}
          onChangeSetupConfirm={(value) => security.setupFields.setField('setupConfirm', value)}
          onChangeCurrentPassword={(value) => security.changeFields.setField('currentPassword', value)}
          onChangeNewPassword={(value) => security.changeFields.setField('newPassword', value)}
          onChangeConfirmPassword={(value) => security.changeFields.setField('confirmPassword', value)}
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
    case 'transactionHistory':
      content = (
        <TransactionHistoryTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          items={transactionHistory.items}
          loading={transactionHistory.status.loading}
          error={transactionHistory.status.error}
          message={transactionHistory.status.message}
          onBack={() => setView('home')}
          onRefresh={transactionHistory.refresh}
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
    case 'experimental':
      content = (
        <ExperimentalTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          onBack={() => setView('home')}
          cardNamesEnabled={profile.state.experimental?.cardNamesEnabled ?? false}
          onToggleCardNames={profile.actions.setCardNamesEnabled}
          onSave={profile.actions.save}
          message={profile.status.message}
          error={profile.status.error}
        />
      );
      break;
    case 'developer':
      content = appFeatures.showDeveloperTab ? (
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
      ) : (
        <ProfileHomeTab
          scrollStyle={profile.styles.scrollStyle}
          cardStyle={profile.styles.cardStyle}
          profileSource={profile.state.profileSource}
          onOpenPersonalization={() => setView('personalization')}
          onOpenAuth={() => setView('auth')}
          onOpenSecurity={() => setView('security')}
          onOpenRewards={() => setView('rewards')}
          onOpenTransactionHistory={() => setView('transactionHistory')}
          onOpenLocalization={() => setView('localization')}
          onOpenExperimental={() => setView('experimental')}
          onOpenAbout={() => setView('about')}
          onOpenChangelog={() => setView('changelog')}
          showDeveloper={false}
          buildLabel={`${APP_VARIANT} build`}
        />
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
          onOpenTransactionHistory={() => setView('transactionHistory')}
          onOpenLocalization={() => setView('localization')}
          onOpenExperimental={() => setView('experimental')}
          onOpenDeveloper={appFeatures.showDeveloperTab ? () => setView('developer') : undefined}
          showDeveloper={appFeatures.showDeveloperTab}
          onOpenAbout={() => setView('about')}
          onOpenChangelog={() => setView('changelog')}
          buildLabel={`${APP_VARIANT} build`}
        />
      );
  }

  return (
    <ProfileTabTransition viewKey={view}>
      {content}
    </ProfileTabTransition>
  );
}
