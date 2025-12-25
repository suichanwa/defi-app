import React from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import PasscodeField from './PasscodeField';
import NumericKeyboard from './NumericKeyboard';

type WalletImportModalProps = {
  visible: boolean;
  styles: ReturnType<typeof createWalletStyles>;
  colors: { text: string };
  mnemonicInput: string;
  walletPassword: string;
  walletPasswordConfirm: string;
  flowError: string | null;
  flowMessage: string | null;
  isSubmitting: boolean;
  onChangeMnemonic: (value: string) => void;
  onChangeWalletPassword: (value: string) => void;
  onChangeWalletPasswordConfirm: (value: string) => void;
  onImport: () => void;
  onClose: () => void;
  iconColor: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
  isPrimaryActive: boolean;
  isConfirmActive: boolean;
  onActivatePrimary: () => void;
  onActivateConfirm: () => void;
};

export default function WalletImportModal({
  visible,
  styles,
  colors,
  mnemonicInput,
  walletPassword,
  walletPasswordConfirm,
  flowError,
  flowMessage,
  isSubmitting,
  onChangeMnemonic,
  onChangeWalletPassword,
  onChangeWalletPasswordConfirm,
  onImport,
  onClose,
  iconColor,
  onDigit,
  onDelete,
  onClear,
  isPrimaryActive,
  isConfirmActive,
  onActivatePrimary,
  onActivateConfirm,
}: WalletImportModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalCard} showsVerticalScrollIndicator={false}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import wallet</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Paste your 12 or 24 word recovery phrase.</Text>
          <TextInput
            value={mnemonicInput}
            onChangeText={onChangeMnemonic}
            placeholder="Recovery phrase"
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.modalInput]}
            multiline
            autoCapitalize="none"
          />
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
          {flowError && <Text style={styles.errorText}>{flowError}</Text>}
          {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
          {isSubmitting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text style={styles.loadingText}>Importing wallet...</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={onImport}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>Import wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={onClose}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
