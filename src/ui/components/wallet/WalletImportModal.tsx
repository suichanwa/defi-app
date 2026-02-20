import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import FlowMessage from './FlowMessage';
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
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setWords(Array(12).fill(''));
    } else if (mnemonicInput) {
      const parentWords = mnemonicInput.split(' ').filter(Boolean);
      if (parentWords.join(' ') !== words.filter(Boolean).join(' ')) {
        const newWords = Array(12).fill('');
        parentWords.forEach((w, i) => { if (i < 12) newWords[i] = w; });
        setWords(newWords);
      }
    }
  }, [visible, mnemonicInput]);

  const handleWordChange = (text: string, index: number) => {
    const pasted = text.trim().split(/\s+/);
    if (pasted.length > 1) {
      const newWords = [...words];
      pasted.forEach((w, i) => {
        if (index + i < 12) newWords[index + i] = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
      });
      setWords(newWords);
      onChangeMnemonic(newWords.filter(Boolean).join(' '));
      return;
    }
    const newWords = [...words];
    newWords[index] = text.replace(/[^a-zA-Z]/g, '').toLowerCase();
    setWords(newWords);
    onChangeMnemonic(newWords.filter(Boolean).join(' '));
  };

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
          <Text style={styles.modalSubtitle}>Enter or paste your 12 word recovery phrase.</Text>
          <View style={styles.mnemonicGrid}>
            {words.map((word, index) => (
              <View
                key={index}
                style={[
                  styles.mnemonicInputCell,
                  activeWordIndex === index && styles.mnemonicInputCellFocused,
                ]}
              >
                <Text style={styles.mnemonicIndex}>{index + 1}.</Text>
                <TextInput
                  value={word}
                  onChangeText={(text) => handleWordChange(text, index)}
                  onFocus={() => setActiveWordIndex(index)}
                  onBlur={() => setActiveWordIndex(null)}
                  style={styles.mnemonicInputField}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholderTextColor={colors.text + '40'}
                  returnKeyType={index === 11 ? 'done' : 'next'}
                />
              </View>
            ))}
          </View>
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
