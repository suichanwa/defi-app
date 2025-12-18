import React from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { walletStyles as styles } from '../../styles/WalletStyles';

type Props = {
  flow: 'menu' | 'create' | 'import' | 'unlock' | 'backup';
  status: 'loading' | 'missing' | 'locked' | 'unlocked';
  walletPassword: string;
  walletPasswordConfirm: string;
  unlockPassword: string;
  mnemonicInput: string;
  backupMnemonic: string | null;
  backupAcknowledged: boolean;
  confirmWord1: string;
  confirmWord2: string;
  confirmIndices: [number, number];
  flowError: string | null;
  flowMessage: string | null;
  isSubmitting: boolean;
  onChangeWalletPassword: (value: string) => void;
  onChangeWalletPasswordConfirm: (value: string) => void;
  onChangeUnlockPassword: (value: string) => void;
  onChangeMnemonic: (value: string) => void;
  onChangeConfirmWord1: (value: string) => void;
  onChangeConfirmWord2: (value: string) => void;
  onToggleBackup: () => void;
  onCreate: () => void;
  onImport: () => void;
  onUnlock: () => void;
  onConfirmBackup: () => void;
  onBackToMenu: () => void;
  onGoCreate: () => void;
  onGoImport: () => void;
  onLock: () => void;
};

export default function WalletSetupScreen({
  flow,
  status,
  walletPassword,
  walletPasswordConfirm,
  unlockPassword,
  mnemonicInput,
  backupMnemonic,
  backupAcknowledged,
  confirmWord1,
  confirmWord2,
  confirmIndices,
  flowError,
  flowMessage,
  isSubmitting,
  onChangeWalletPassword,
  onChangeWalletPasswordConfirm,
  onChangeUnlockPassword,
  onChangeMnemonic,
  onChangeConfirmWord1,
  onChangeConfirmWord2,
  onToggleBackup,
  onCreate,
  onImport,
  onUnlock,
  onConfirmBackup,
  onBackToMenu,
  onGoCreate,
  onGoImport,
  onLock,
}: Props) {
  if (status === 'loading') {
    return (
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>Checking wallet...</Text>
      </View>
    );
  }

  if (flow === 'backup' && backupMnemonic) {
    const words = backupMnemonic.split(' ');
    const [i1, i2] = confirmIndices;
    return (
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>Back up your seed phrase</Text>
        <Text style={styles.setupSubtitle}>Write these words down in order. Do not screenshot.</Text>
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
            color={backupAcknowledged ? '#16a34a' : '#1f2937'}
          />
          <Text style={styles.checkboxLabel}>I wrote it down safely.</Text>
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
        {flowError && <Text style={styles.errorText}>{flowError}</Text>}
        {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
        {isSubmitting && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={styles.loadingText}>Securing wallet...</Text>
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
          onPress={onLock}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          <Text style={styles.secondaryButtonText}>Lock wallet</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (flow === 'create') {
    return (
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>Create wallet</Text>
        <TextInput
          value={walletPassword}
          onChangeText={onChangeWalletPassword}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          secureTextEntry
        />
        <TextInput
          value={walletPasswordConfirm}
          onChangeText={onChangeWalletPasswordConfirm}
          placeholder="Confirm password"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          secureTextEntry
        />
        {flowError && <Text style={styles.errorText}>{flowError}</Text>}
        {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
        {isSubmitting && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={styles.loadingText}>Encrypting wallet...</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={onCreate}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>Create</Text>
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
    );
  }

  if (flow === 'import') {
    return (
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>Import wallet</Text>
        <TextInput
          value={mnemonicInput}
          onChangeText={onChangeMnemonic}
          placeholder="12 or 24 word phrase"
          placeholderTextColor="#94a3b8"
          style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
          multiline
          autoCapitalize="none"
        />
        <TextInput
          value={walletPassword}
          onChangeText={onChangeWalletPassword}
          placeholder="New password"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          secureTextEntry
        />
        <TextInput
          value={walletPasswordConfirm}
          onChangeText={onChangeWalletPasswordConfirm}
          placeholder="Confirm password"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          secureTextEntry
        />
        {flowError && <Text style={styles.errorText}>{flowError}</Text>}
        {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
        {isSubmitting && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={styles.loadingText}>Decrypting phrase...</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={onImport}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>Import</Text>
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
    );
  }

  if (status === 'locked' || flow === 'unlock') {
    return (
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>Unlock wallet</Text>
        <TextInput
          value={unlockPassword}
          onChangeText={onChangeUnlockPassword}
          placeholder="Password"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          secureTextEntry
        />
        {flowError && <Text style={styles.errorText}>{flowError}</Text>}
        {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
        {isSubmitting && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <Text style={styles.loadingText}>Unlocking wallet...</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={onUnlock}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>Unlock</Text>
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
    );
  }

  if (status === 'missing') {
    return (
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>Set up your wallet</Text>
        <Text style={styles.setupSubtitle}>Create a new wallet or import with a 12/24-word phrase.</Text>
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={onGoCreate}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>Create wallet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={onGoImport}
          activeOpacity={0.9}
          disabled={isSubmitting}
        >
          <Text style={styles.secondaryButtonText}>Import wallet</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}
