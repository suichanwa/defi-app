import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';
import FlowMessage from './FlowMessage';
import PasscodeField from './PasscodeField';
import WalletLoadingOverlay from './WalletLoadingOverlay';

type WalletCreatePasscodeCardProps = {
  styles: ReturnType<typeof createWalletStyles>;
  walletPassword: string;
  walletPasswordConfirm: string;
  flowError: string | null;
  flowMessage: string | null;
  isSubmitting: boolean;
  renderProgress: () => React.ReactNode;
  onChangeWalletPassword: (value: string) => void;
  onChangeWalletPasswordConfirm: (value: string) => void;
  onCreate: () => void;
  onBackToMenu: () => void;
  isPrimaryActive: boolean;
  isConfirmActive: boolean;
  onActivatePrimary: () => void;
  onActivateConfirm: () => void;
};

export default function WalletCreatePasscodeCard({
  styles,
  walletPassword,
  walletPasswordConfirm,
  flowError,
  flowMessage,
  isSubmitting,
  renderProgress,
  onChangeWalletPassword,
  onChangeWalletPasswordConfirm,
  onCreate,
  onBackToMenu,
  isPrimaryActive,
  isConfirmActive,
  onActivatePrimary,
  onActivateConfirm,
}: WalletCreatePasscodeCardProps) {
  const { colors } = useTheme();

  const handlePasswordChange = (value: string) => {
    console.log('=== WalletCreatePasscodeCard: Password Changed ===');
    console.log('New value:', value);
    console.log('Length:', value.length);
    console.log('Type:', typeof value);
    onChangeWalletPassword(value);
  };

  const handlePasswordConfirmChange = (value: string) => {
    console.log('=== WalletCreatePasscodeCard: Password Confirm Changed ===');
    console.log('New value:', value);
    console.log('Length:', value.length);
    console.log('Type:', typeof value);
    onChangeWalletPasswordConfirm(value);
  };

  const handleActivatePrimary = () => {
    console.log('=== WalletCreatePasscodeCard: Activating Primary Field ===');
    onActivatePrimary();
  };

  const handleActivateConfirm = () => {
    console.log('=== WalletCreatePasscodeCard: Activating Confirm Field ===');
    onActivateConfirm();
  };

  const handleCreatePress = () => {
    console.log('=== WalletCreatePasscodeCard: Create Button Pressed ===');
    console.log('walletPassword:', walletPassword, 'length:', walletPassword.length);
    console.log('walletPasswordConfirm:', walletPasswordConfirm, 'length:', walletPasswordConfirm.length);
    console.log('isSubmitting:', isSubmitting);
    console.log('isPrimaryActive:', isPrimaryActive);
    console.log('isConfirmActive:', isConfirmActive);
    console.log('Calling onCreate...');
    onCreate();
  };

  console.log('=== WalletCreatePasscodeCard Render ===');
  console.log('Props:', {
    walletPassword,
    walletPasswordLength: walletPassword.length,
    walletPasswordConfirm,
    walletPasswordConfirmLength: walletPasswordConfirm.length,
    flowError,
    flowMessage,
    isSubmitting,
    isPrimaryActive,
    isConfirmActive,
  });

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.setupTitle, localStyles.title]}>Create a wallet</Text>
      <Text style={[styles.setupSubtitle, localStyles.subtitle]}>
        Set a 6-digit passcode. You'll use it to log in next time.
      </Text>
      {renderProgress()}
      
      <View style={localStyles.passcodeSection}>
        <PasscodeField
          label="Enter Passcode"
          value={walletPassword}
          onChange={handlePasswordChange}
          autoFocus={isPrimaryActive}
          isActive={isPrimaryActive}
          onActivate={handleActivatePrimary}
          error={flowError}
          styles={styles}
        />
        <PasscodeField
          label="Confirm Passcode"
          value={walletPasswordConfirm}
          onChange={handlePasswordConfirmChange}
          autoFocus={isConfirmActive}
          isActive={isConfirmActive}
          onActivate={handleActivateConfirm}
          error={flowError}
          styles={styles}
        />
      </View>
      
      <FlowMessage styles={styles} error={flowError} message={flowMessage} />
      
      <View style={localStyles.buttonGroup}>
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleCreatePress}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>Create wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={onBackToMenu}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
      
      {isSubmitting && <WalletLoadingOverlay styles={styles} label="Creating wallet..." />}
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
  passcodeSection: {
    marginBottom: 32,
  },
  buttonGroup: {
    gap: 12,
    marginTop: 24,
  },
});
