import React from 'react';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';
import PasscodeField from './PasscodeField';
import WalletLoadingOverlay from './WalletLoadingOverlay';

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
}: WalletUnlockCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <View style={localStyles.headerRow}>
        <View style={localStyles.headerSpacer} />
        <View style={localStyles.header}>
          <Text style={[styles.setupTitle, localStyles.title, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.setupSubtitle, localStyles.subtitle, { color: colors.muted }]}>
            Enter your passcode to unlock
          </Text>
        </View>
        {showStartFresh ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onStartFresh}
            disabled={isStartFreshDisabled}
            style={localStyles.startFreshButton}
          >
            <Text
              style={[
                localStyles.startFreshText,
                { color: isStartFreshDisabled ? colors.muted : '#ef4444' },
              ]}
            >
              Start fresh
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={localStyles.startFreshButton} />
        )}
      </View>

      <View style={localStyles.passcodeSection}>
        <PasscodeField
          label="Enter Passcode"
          value={unlockPassword}
          onChange={onChangeUnlockPassword}
          autoFocus={isUnlockActive}
          isActive={isUnlockActive}
          onActivate={onActivateUnlock}
          styles={styles}
        />
      </View>

      {flowError && (
        <View style={[localStyles.errorContainer, { backgroundColor: '#ef444410', borderLeftColor: '#ef4444' }]}>
          <MaterialCommunityIcons name="alert-circle" size={18} color="#ef4444" />
          <Text style={[localStyles.errorText, { color: '#ef4444' }]}>{flowError}</Text>
        </View>
      )}

      {isSubmitting && <WalletLoadingOverlay styles={styles} label="Unlocking..." />}
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    justifyContent: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 48,
  },
  header: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    minWidth: 82,
  },
  startFreshButton: {
    minWidth: 82,
    alignItems: 'flex-end',
    paddingTop: 10,
  },
  startFreshText: {
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  passcodeSection: {
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
