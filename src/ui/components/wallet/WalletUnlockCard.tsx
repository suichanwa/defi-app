import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';
import FlowMessage from './FlowMessage';
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
}: WalletUnlockCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <View style={localStyles.header}>
        <Text style={[styles.setupTitle, localStyles.title, { color: colors.text }]}>Welcome back</Text>
        <Text style={[styles.setupSubtitle, localStyles.subtitle, { color: colors.muted }]}>
          Enter your passcode to unlock
        </Text>
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
  header: {
    marginBottom: 48,
    alignItems: 'center',
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
