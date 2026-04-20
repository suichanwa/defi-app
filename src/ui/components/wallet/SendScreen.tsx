import React, { useMemo } from 'react';
import { ActivityIndicator, Animated, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { createWalletStyles } from '@styles/WalletStyles';
import FlowMessage from './FlowMessage';
import { useTheme } from '@theme/ThemeProvider';
import { useWalletCardAnimation } from '../../../animations/walletAnimations';

type Props = {
  chainName: string;
  nativeSymbol: string;
  sendTo: string;
  sendAmount: string;
  sendFeeNative: string | null;
  sendStep: 'form' | 'confirm' | 'pending';
  isSubmitting: boolean;
  flowError: string | null;
  flowMessage: string | null;
  onChangeTo: (value: string) => void;
  onChangeAmount: (value: string) => void;
  onReview: () => void;
  onSend: () => void;
  onEdit: () => void;
};

export default function SendScreen({
  chainName,
  nativeSymbol,
  sendTo,
  sendAmount,
  sendFeeNative,
  sendStep,
  isSubmitting,
  flowError,
  flowMessage,
  onChangeTo,
  onChangeAmount,
  onReview,
  onSend,
  onEdit,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const { animatedStyle } = useWalletCardAnimation([sendStep]);
  const navigation = useNavigation();

  return (
    <Animated.View style={[styles.setupCard, animatedStyle]}>
      <View style={localStyles.headerRow}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.7}
          style={[localStyles.backButton, { borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>
      <Text style={styles.setupTitle}>Send {chainName}</Text>
      <Text style={styles.setupSubtitle}>Transfer native coin to another address.</Text>
      {sendStep === 'form' && (
        <>
          <TextInput
            value={sendTo}
            onChangeText={onChangeTo}
            placeholder="Recipient address"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            value={sendAmount}
            onChangeText={onChangeAmount}
            placeholder={`Amount (${nativeSymbol})`}
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="decimal-pad"
          />
          <FlowMessage styles={styles} error={flowError} />
          {isSubmitting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text style={styles.loadingText}>Estimating fees...</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={onReview}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>Review send</Text>
          </TouchableOpacity>
        </>
      )}

      {sendStep === 'confirm' && (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>To</Text>
            <Text style={styles.summaryValue}>{sendTo}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>
              {sendAmount} {nativeSymbol}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated fee</Text>
            <Text style={styles.summaryValue}>
              {sendFeeNative ? `${Number(sendFeeNative).toFixed(6)} ${nativeSymbol}` : '-'}
            </Text>
          </View>
          <FlowMessage styles={styles} error={flowError} />
          {isSubmitting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text style={styles.loadingText}>Submitting transaction...</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={onSend}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>Send now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={onEdit}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </TouchableOpacity>
        </>
      )}

      {sendStep === 'pending' && (
        <>
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={styles.loadingText}>Waiting for confirmation...</Text>
          </View>
          <FlowMessage styles={styles} message={flowMessage} />
        </>
      )}
    </Animated.View>
  );
}

const localStyles = {
  headerRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'flex-start' as const,
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
};
