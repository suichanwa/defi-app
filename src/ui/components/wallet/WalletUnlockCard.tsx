import React from 'react';
import { ActivityIndicator, Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import FlowMessage from './FlowMessage';
import PasscodeField from './PasscodeField';

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
  onBiometricUnlock,
  biometricsAvailable,
  isUnlockActive,
}: WalletUnlockCardProps) {
  return (
    <View style={styles.setupCard}>
      <View style={{ alignItems: 'center', marginBottom: 24 }}>
        <Image
          source={require('../../../../assets/appicon/WalletLogo.png')}
          style={{
            width: 80,
            height: 80,
            borderRadius: 16,
          }}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.setupTitle}>Log in</Text>
      <Text style={styles.setupSubtitle}>Enter your 6-digit passcode.</Text>
      <PasscodeField
        label="Passcode"
        value={unlockPassword}
        onChange={onChangeUnlockPassword}
        autoFocus={isUnlockActive}
        styles={styles}
      />
      {biometricsAvailable && (
        <TouchableOpacity
          style={{
            alignSelf: 'center',
            marginTop: 16,
            padding: 12,
            borderRadius: 12,
            backgroundColor: '#f1f5f9',
          }}
          onPress={onBiometricUnlock}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="fingerprint" size={32} color={iconColor} />
        </TouchableOpacity>
      )}
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
