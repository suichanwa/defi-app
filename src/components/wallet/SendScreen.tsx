import React from 'react';
import { ActivityIndicator, Animated, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { walletStyles as styles } from '../../styles/WalletStyles';
import { useWalletCardAnimation } from '../../animations/walletAnimations';

type Props = {
  chainName: string;
  sendTo: string;
  sendAmount: string;
  sendFeeEth: string | null;
  sendStep: 'form' | 'confirm' | 'pending';
  isSubmitting: boolean;
  flowError: string | null;
  flowMessage: string | null;
  onChangeTo: (value: string) => void;
  onChangeAmount: (value: string) => void;
  onReview: () => void;
  onSend: () => void;
  onEdit: () => void;
  onBack: () => void;
};

export default function SendScreen({
  chainName,
  sendTo,
  sendAmount,
  sendFeeEth,
  sendStep,
  isSubmitting,
  flowError,
  flowMessage,
  onChangeTo,
  onChangeAmount,
  onReview,
  onSend,
  onEdit,
  onBack,
}: Props) {
  const { animatedStyle } = useWalletCardAnimation([sendStep]);

  return (
    <Animated.View style={[styles.setupCard, animatedStyle]}>
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
            placeholder="Amount (ETH)"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            keyboardType="decimal-pad"
          />
          {flowError && <Text style={styles.errorText}>{flowError}</Text>}
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
          <TouchableOpacity
            style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={onBack}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
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
            <Text style={styles.summaryValue}>{sendAmount} ETH</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Estimated fee</Text>
            <Text style={styles.summaryValue}>{sendFeeEth ? `${Number(sendFeeEth).toFixed(6)} ETH` : '-'}</Text>
          </View>
          {flowError && <Text style={styles.errorText}>{flowError}</Text>}
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
          {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
        </>
      )}
    </Animated.View>
  );
}
