import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';
import PasscodeField from './PasscodeField';
import WalletLoadingOverlay from './WalletLoadingOverlay';
import FlowMessage from './FlowMessage';

type WalletUnlockCardProps = {
  styles: ReturnType<typeof createWalletStyles>;
  unlockPassword: string;
  flowError: string | null;
  flowMessage: string | null;
  isSubmitting: boolean;
  onChangeUnlockPassword: (value: string) => void;
  onUnlock: () => void;
  isUnlockActive: boolean;
  onActivateUnlock: () => void;
  onStartFresh: () => void;
  isStartFreshDisabled?: boolean;
  showStartFresh?: boolean;
  walletNetworkLabel?: string;
  onToggleWalletNetwork?: () => void;
};

export default function WalletUnlockCard({
  styles,
  unlockPassword,
  flowError,
  flowMessage,
  isSubmitting,
  onChangeUnlockPassword,
  onUnlock,
  isUnlockActive,
  onActivateUnlock,
  onStartFresh,
  isStartFreshDisabled = false,
  showStartFresh = true,
  walletNetworkLabel,
  onToggleWalletNetwork,
}: WalletUnlockCardProps) {
  const { colors } = useTheme();
  const canSubmitUnlock = unlockPassword.length === 6 && !isSubmitting;

  const startFreshTitle = 'Start fresh wallet?';
  const startFreshBody =
    'This removes local wallet data from this device. You can recover later only with your recovery phrase.';

  const handleStartFreshConfirm = () => {
    // ponytail: react-native-web has no Alert implementation, so Alert.alert is a
    // no-op there and the button looks dead. window.confirm is the web equivalent.
    if (Platform.OS === 'web') {
      if (window.confirm(`${startFreshTitle}\n\n${startFreshBody}`)) {
        onStartFresh();
      }
      return;
    }

    Alert.alert(startFreshTitle, startFreshBody, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start fresh',
        style: 'destructive',
        onPress: onStartFresh,
      },
    ]);
  };

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <View style={localStyles.headerStack}>
        <View style={[localStyles.lockBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="lock-outline" size={16} color={colors.muted} />
          <Text style={[localStyles.lockBadgeText, { color: colors.muted }]}>Wallet locked</Text>
        </View>
        <Text style={[styles.setupTitle, localStyles.title, { color: colors.text }]}>Welcome back</Text>
        <Text style={[styles.setupSubtitle, localStyles.subtitle, { color: colors.muted }]}>
          Enter 6-digit passcode to unlock your wallet.
        </Text>
      </View>

      <View style={[localStyles.passcodeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {walletNetworkLabel && onToggleWalletNetwork ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onToggleWalletNetwork}
            style={[styles.networkBadge, localStyles.networkBadge, { backgroundColor: colors.background }]}
          >
            <Text style={styles.networkBadgeText}>{walletNetworkLabel}</Text>
          </TouchableOpacity>
        ) : null}
        <PasscodeField
          label="Enter Passcode"
          value={unlockPassword}
          onChange={onChangeUnlockPassword}
          autoFocus={isUnlockActive}
          isActive={isUnlockActive}
          onActivate={onActivateUnlock}
          error={flowError}
          styles={styles}
        />
        <Text style={[localStyles.hintText, { color: colors.muted }]}>Tip: tap circles to refocus input.</Text>
      </View>

      <FlowMessage styles={styles} error={flowError} message={flowMessage} />

      <TouchableOpacity
        style={[
          styles.primaryButton,
          localStyles.unlockButton,
          (!canSubmitUnlock || isSubmitting) && styles.buttonDisabled,
        ]}
        onPress={onUnlock}
        activeOpacity={0.9}
        disabled={!canSubmitUnlock || isSubmitting}
      >
        <Text style={styles.primaryButtonText}>{isSubmitting ? 'Unlocking...' : 'Unlock wallet'}</Text>
      </TouchableOpacity>

      {showStartFresh ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleStartFreshConfirm}
          disabled={isStartFreshDisabled}
          style={localStyles.startFreshButton}
          accessibilityRole="button"
          accessibilityLabel="Start fresh wallet"
        >
          <MaterialCommunityIcons
            name="restore"
            size={15}
            color={isStartFreshDisabled ? colors.muted : '#ef4444'}
          />
          <Text
            style={[
              localStyles.startFreshText,
              { color: isStartFreshDisabled ? colors.muted : '#ef4444' },
            ]}
          >
            Start fresh
          </Text>
        </TouchableOpacity>
      ) : null}

      {isSubmitting && <WalletLoadingOverlay styles={styles} label="Unlocking..." />}
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    justifyContent: 'flex-start',
  },
  headerStack: {
    alignItems: 'center',
    marginBottom: 24,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 14,
  },
  lockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    maxWidth: 300,
  },
  passcodeCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    marginBottom: 8,
  },
  networkBadge: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    marginTop: -4,
  },
  unlockButton: {
    marginTop: 12,
    marginBottom: 2,
  },
  startFreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 10,
  },
  startFreshText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
