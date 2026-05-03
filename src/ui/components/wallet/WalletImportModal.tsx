import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import FlowMessage from './FlowMessage';
import PasscodeField from './PasscodeField';
import NumericKeyboard from './NumericKeyboard';
import { buildMnemonicWords, getMnemonicWordCount, normalizeMnemonicInput } from '@utils/solanaMnemonic';

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
  const [wordCount, setWordCount] = useState<12 | 24>(12);
  const [words, setWords] = useState<string[]>(Array(12).fill(''));
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!visible) {
      setWordCount(12);
      setWords(Array(12).fill(''));
    } else if (mnemonicInput) {
      const parentWordCount = getMnemonicWordCount(mnemonicInput);
      const parentWords = normalizeMnemonicInput(mnemonicInput).split(' ').filter(Boolean);
      const nextCount = parentWordCount === 24 ? 24 : wordCount;
      if (parentWords.join(' ') !== words.filter(Boolean).join(' ') || words.length !== nextCount) {
        setWordCount(nextCount);
        setWords(buildMnemonicWords(mnemonicInput, nextCount));
      }
    }
  }, [visible, mnemonicInput, wordCount, words]);

  const handleWordCountChange = (nextCount: 12 | 24) => {
    setWordCount(nextCount);
    setWords((currentWords) => {
      const nextWords = Array(nextCount).fill('');
      currentWords.slice(0, nextCount).forEach((word, index) => {
        nextWords[index] = word;
      });
      onChangeMnemonic(nextWords.filter(Boolean).join(' '));
      return nextWords;
    });
  };

  const handleWordChange = (text: string, index: number) => {
    const pasted = text.trim().split(/\s+/);
    if (pasted.length > 1) {
      const nextCount = pasted.length > 12 ? 24 : wordCount;
      const newWords = Array(nextCount).fill('');
      words.slice(0, nextCount).forEach((word, wordIndex) => {
        newWords[wordIndex] = word;
      });
      pasted.forEach((w, i) => {
        if (index + i < nextCount) newWords[index + i] = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
      });
      setWordCount(nextCount);
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
          <Text style={styles.modalSubtitle}>Enter or paste your 12 or 24 word recovery phrase.</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TouchableOpacity
              onPress={() => handleWordCountChange(12)}
              activeOpacity={0.9}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: wordCount === 12 ? colors.text : colors.text + '33',
                backgroundColor: wordCount === 12 ? colors.text + '14' : 'transparent',
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>12 words</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleWordCountChange(24)}
              activeOpacity={0.9}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: wordCount === 24 ? colors.text : colors.text + '33',
                backgroundColor: wordCount === 24 ? colors.text + '14' : 'transparent',
              }}
            >
              <Text style={{ color: colors.text, fontWeight: '600' }}>24 words</Text>
            </TouchableOpacity>
          </View>
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
                  returnKeyType={index === words.length - 1 ? 'done' : 'next'}
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
            error={flowError}
            styles={styles}
          />
          <PasscodeField
            label="Confirm passcode"
            value={walletPasswordConfirm}
            onChange={onChangeWalletPasswordConfirm}
            autoFocus={isConfirmActive}
            isActive={isConfirmActive}
            onActivate={onActivateConfirm}
            error={flowError}
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
