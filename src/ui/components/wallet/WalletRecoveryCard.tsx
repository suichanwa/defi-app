import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import FlowMessage from './FlowMessage';

type WalletRecoveryCardProps = {
  styles: ReturnType<typeof createWalletStyles>;
  colors: { accent: string; text: string };
  words: string[];
  confirmIndices: [number, number];
  confirmWord1: string;
  confirmWord2: string;
  flowError: string | null;
  flowMessage: string | null;
  isSubmitting: boolean;
  backupAcknowledged: boolean;
  onToggleBackup: () => void;
  onChangeConfirmWord1: (value: string) => void;
  onChangeConfirmWord2: (value: string) => void;
  onConfirmBackup: () => void;
  onSkipBackup: () => void;
  renderProgress: () => React.ReactNode;
};

export default function WalletRecoveryCard({
  styles,
  colors,
  words,
  confirmIndices,
  confirmWord1,
  confirmWord2,
  flowError,
  flowMessage,
  isSubmitting,
  backupAcknowledged,
  onToggleBackup,
  onChangeConfirmWord1,
  onChangeConfirmWord2,
  onConfirmBackup,
  onSkipBackup,
  renderProgress,
}: WalletRecoveryCardProps) {
  const [i1, i2] = confirmIndices;

  return (
    <View style={styles.setupCard}>
      <Text style={styles.setupTitle}>Recovery phrase</Text>
      <Text style={styles.setupSubtitle}>Write these words down in order. Do not screenshot.</Text>
      {renderProgress()}
      <View style={styles.mnemonicGrid}>
        {words.map((w, idx) => (
          <View key={`${w}-${idx}`} style={styles.mnemonicWord}>
            <Text style={styles.mnemonicIndex}>{idx + 1}.</Text>
            <Text style={styles.mnemonicText}>{w}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.checkboxRow, backupAcknowledged && styles.checkboxRowChecked]}
        onPress={onToggleBackup}
        activeOpacity={0.8}
      >
        <Ionicons
          name={backupAcknowledged ? 'checkbox-outline' : 'square-outline'}
          size={20}
          color={backupAcknowledged ? colors.accent : colors.text}
        />
        <Text style={[styles.checkboxLabel, backupAcknowledged && styles.checkboxLabelChecked]}>
          I wrote it down safely.
        </Text>
      </TouchableOpacity>
      <Text style={styles.setupSubtitle}>Confirm words #{i1 + 1} and #{i2 + 1}</Text>
      <TextInput
        value={confirmWord1}
        onChangeText={onChangeConfirmWord1}
        placeholder={`Word ${i1 + 1}`}
        placeholderTextColor="#94a3b8"
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        value={confirmWord2}
        onChangeText={onChangeConfirmWord2}
        placeholder={`Word ${i2 + 1}`}
        placeholderTextColor="#94a3b8"
        style={styles.input}
        autoCapitalize="none"
      />
      <FlowMessage styles={styles} error={flowError} message={flowMessage} />
      {isSubmitting && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#4f46e5" />
          <Text style={styles.loadingText}>Finalizing setup...</Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
        onPress={onConfirmBackup}
        activeOpacity={0.9}
        disabled={isSubmitting}
      >
        <Text style={styles.primaryButtonText}>I've backed this up</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
        onPress={onSkipBackup}
        activeOpacity={0.9}
        disabled={isSubmitting}
      >
        <Text style={styles.secondaryButtonText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
}
