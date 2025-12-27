import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import FlowMessage from './FlowMessage';

type WalletSuccessCardProps = {
  styles: ReturnType<typeof createWalletStyles>;
  colors: { success: string; warning: string; successText: string; warningText: string };
  backupSkipped: boolean;
  flowMessage: string | null;
  onFinishSetup: () => void;
  renderProgress: () => React.ReactNode;
};

export default function WalletSuccessCard({
  styles,
  colors,
  backupSkipped,
  flowMessage,
  onFinishSetup,
  renderProgress,
}: WalletSuccessCardProps) {
  return (
    <View style={[styles.setupCard, styles.successCard]}>
      {renderProgress()}
      <View style={styles.successHero}>
        <View style={styles.successIconWrap}>
          <Ionicons name="checkmark-circle" size={56} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Wallet ready</Text>
        <Text style={styles.successSubtitle}>
          You're all set. Your wallet is ready and secured with your passcode.
        </Text>
      </View>
      <View style={[styles.successInfoRow, backupSkipped && styles.successInfoRowSkipped]}>
        <Ionicons
          name={backupSkipped ? 'alert-circle' : 'shield-checkmark'}
          size={18}
          color={backupSkipped ? colors.warning : colors.successText}
        />
        <Text style={[styles.successInfoText, backupSkipped && styles.successInfoTextSkipped]}>
          {backupSkipped ? 'Recovery phrase skipped' : 'Recovery phrase confirmed'}
        </Text>
      </View>
      <FlowMessage styles={styles} message={flowMessage} />
      <TouchableOpacity style={styles.primaryButton} onPress={onFinishSetup} activeOpacity={0.9}>
        <Text style={styles.primaryButtonText}>Go to wallet</Text>
      </TouchableOpacity>
    </View>
  );
}
