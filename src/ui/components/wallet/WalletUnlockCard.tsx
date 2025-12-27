import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';
import FlowMessage from './FlowMessage';
import PasscodeField from './PasscodeField';
import NumericKeyboard from './NumericKeyboard';

type WalletUnlockCardProps = {
  styles: ReturnType<typeof createWalletStyles>;
  unlockPassword: string;
  flowError: string | null;
  flowMessage: string | null;
  isSubmitting: boolean;
  onChangeUnlockPassword: (value: string) => void;
  onUnlock: () => void;
  iconColor: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onBiometricUnlock: () => void;
  biometricsAvailable: boolean;
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
  iconColor,
  onDigit,
  onDelete,
  onClear,
  onBiometricUnlock,
  biometricsAvailable,
  isUnlockActive,
  onActivateUnlock,
}: WalletUnlockCardProps) {
  return (
    <View style={styles.setupCard}>
      <Text style={styles.setupTitle}>Log in</Text>
      <Text style={styles.setupSubtitle}>Enter your 6-digit passcode.</Text>
      <PasscodeField
        label="Passcode"
        value={unlockPassword}
        onChange={onChangeUnlockPassword}
        autoFocus={isUnlockActive}
        isActive={isUnlockActive}
        onActivate={onActivateUnlock}
        styles={styles}
      />
      <NumericKeyboard
        styles={styles}
        iconColor={iconColor}
        onDigit={onDigit}
        onDelete={onDelete}
        onClear={onClear}
        onBiometric={onBiometricUnlock}
        biometricsAvailable={biometricsAvailable}
      />
      <FlowMessage styles={styles} error={flowError} message={flowMessage} />
      {isSubmitting && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#4f46e5" />
          <Text style={styles.loadingText}>Logging in...</Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
        onPress={onUnlock}
        activeOpacity={0.9}
        disabled={isSubmitting}
      >
        <Text style={styles.primaryButtonText}>Log in</Text>
      </TouchableOpacity>
    </View>
  );
}
