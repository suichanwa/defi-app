import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';
import FlowMessage from './FlowMessage';
import PasscodeField from './PasscodeField';
import NumericKeyboard from './NumericKeyboard';
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
  iconColor: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
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
  iconColor,
  onDigit,
  onDelete,
  onClear,
  isPrimaryActive,
  isConfirmActive,
  onActivatePrimary,
  onActivateConfirm,
}: WalletCreatePasscodeCardProps) {
  return (
    <View style={styles.setupCard}>
      <Text style={styles.setupTitle}>Create a wallet</Text>
      <Text style={styles.setupSubtitle}>Set a 6-digit passcode. You'll use it to log in next time.</Text>
      {renderProgress()}
      <PasscodeField
        label="Passcode"
        value={walletPassword}
        onChange={onChangeWalletPassword}
        autoFocus={isPrimaryActive}
        isActive={isPrimaryActive}
        onActivate={onActivatePrimary}
        styles={styles}
      />
      <PasscodeField
        label="Confirm passcode"
        value={walletPasswordConfirm}
        onChange={onChangeWalletPasswordConfirm}
        autoFocus={isConfirmActive}
        isActive={isConfirmActive}
        onActivate={onActivateConfirm}
        styles={styles}
      />
      <NumericKeyboard
        styles={styles}
        iconColor={iconColor}
        onDigit={onDigit}
        onDelete={onDelete}
        onClear={onClear}
      />
      <FlowMessage styles={styles} error={flowError} message={flowMessage} />
      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
        onPress={onCreate}
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
      {isSubmitting && <WalletLoadingOverlay styles={styles} label="Creating wallet..." />}
    </View>
  );
}
