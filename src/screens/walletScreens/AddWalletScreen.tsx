import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useWalletSession } from '@context/WalletSessionProvider';
import { walletErrorMessage } from '@utils/walletErrors';
import { useNavVisibility } from '@context/NavVisibilityProvider';

type AddMode = 'create' | 'import';
type FlowStep = 'mode' | 'credentials' | 'recovery' | 'success';

type WalletStackParamList = {
  WalletHome: undefined;
  Add: { initialMode?: AddMode } | undefined;
  Send: undefined;
  Receive: { address: string };
  Swap: undefined;
  SendCrypto: { symbol: string; name: string; balance: string };
  SendCryptoComplete: { symbol: string; amount: string; toAddress: string; signature: string };
};

const PASSCODE_REGEX = /^\d{6}$/;

export default function AddScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'Add'>>();
  const route = useRoute<RouteProp<WalletStackParamList, 'Add'>>();
  const { createWallet, importWallet, confirmBackup, wallets } = useWalletSession();
  const { setNavHidden } = useNavVisibility();
  const initialMode = route.params?.initialMode;

  const [mode, setMode] = useState<AddMode | null>(initialMode ?? null);
  const [step, setStep] = useState<FlowStep>(initialMode ? 'credentials' : 'mode');
  const [walletPassword, setWalletPassword] = useState('');
  const [walletPasswordConfirm, setWalletPasswordConfirm] = useState('');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [createdMnemonic, setCreatedMnemonic] = useState<string | null>(null);
  const [confirmIndices, setConfirmIndices] = useState<[number, number]>([1, 5]);
  const [confirmWord1, setConfirmWord1] = useState('');
  const [confirmWord2, setConfirmWord2] = useState('');
  const [backupAcknowledged, setBackupAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(true);
      return () => setNavHidden(false);
    }, [setNavHidden]),
  );

  const existingWalletIds = useMemo(() => new Set(wallets.map((wallet) => wallet.id)), [wallets]);

  const normalizeMnemonic = (phrase: string) =>
    phrase
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .join(' ');

  const resetMessages = () => {
    setFlowError(null);
    setFlowMessage(null);
  };

  const validateCredentials = () => {
    if (!PASSCODE_REGEX.test(walletPassword)) {
      return 'Passcode must be exactly 6 digits.';
    }
    if (!PASSCODE_REGEX.test(walletPasswordConfirm)) {
      return 'Confirm passcode must be exactly 6 digits.';
    }
    if (walletPassword !== walletPasswordConfirm) {
      return 'Passcodes do not match.';
    }
    if (mode === 'import') {
      const phrase = normalizeMnemonic(mnemonicInput);
      const words = phrase.split(' ');
      if (!phrase) {
        return 'Enter your 12 or 24 word phrase.';
      }
      if (![12, 24].includes(words.length)) {
        return 'Mnemonic must be 12 or 24 words.';
      }
    }
    return null;
  };

  const startBackupConfirm = (mnemonic: string) => {
    const words = mnemonic.split(' ');
    if (words.length < 6) {
      setFlowError('Unexpected mnemonic length.');
      return;
    }
    const idx1 = Math.floor(Math.random() * words.length);
    let idx2 = Math.floor(Math.random() * words.length);
    if (idx2 === idx1) idx2 = (idx2 + 3) % words.length;
    setConfirmIndices([idx1, idx2]);
    setConfirmWord1('');
    setConfirmWord2('');
    setBackupAcknowledged(false);
    setCreatedMnemonic(mnemonic);
    setStep('recovery');
  };

  const handleSubmitCredentials = async () => {
    if (!mode || isSubmitting) return;
    resetMessages();
    const validationError = validateCredentials();
    if (validationError) {
      setFlowError(validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        const result = await createWallet(walletPassword);
        const normalized = normalizeMnemonic(result.mnemonic);
        startBackupConfirm(normalized);
        setWalletPassword('');
        setWalletPasswordConfirm('');
        setFlowMessage(
          existingWalletIds.has(result.address)
            ? 'Wallet already existed and is now active.'
            : 'Wallet created. Confirm your recovery phrase.',
        );
        console.info('add_wallet_success');
        return;
      }

      const phrase = normalizeMnemonic(mnemonicInput);
      const { address } = await importWallet(phrase, walletPassword);
      await confirmBackup();
      setFlowMessage(
        existingWalletIds.has(address)
          ? 'Wallet already existed and is now active.'
          : 'Wallet imported and added to your cards.',
      );
      setStep('success');
      console.info('import_wallet_success');
    } catch (error) {
      console.info('add_wallet_failure');
      setFlowError(walletErrorMessage(error, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRecovery = async () => {
    if (!createdMnemonic || isSubmitting) return;
    resetMessages();
    const words = createdMnemonic.split(' ');
    const [i1, i2] = confirmIndices;

    if (!backupAcknowledged) {
      setFlowError('Confirm you wrote the recovery phrase down.');
      return;
    }
    if (words[i1] !== confirmWord1.trim().toLowerCase() || words[i2] !== confirmWord2.trim().toLowerCase()) {
      setFlowError('Words do not match. Try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await confirmBackup();
      setFlowMessage('Wallet created and added to your cards.');
      setStep('success');
      console.info('add_wallet_success');
    } catch (error) {
      console.info('add_wallet_failure');
      setFlowError(walletErrorMessage(error, 'create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipRecovery = async () => {
    if (isSubmitting || !createdMnemonic) return;
    resetMessages();
    setIsSubmitting(true);
    try {
      await confirmBackup();
      setFlowMessage('Wallet added. Recovery confirmation was skipped.');
      setStep('success');
      console.info('add_wallet_success');
    } catch (error) {
      console.info('add_wallet_failure');
      setFlowError(walletErrorMessage(error, 'create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackFromStep = () => {
    if (isSubmitting) return;
    resetMessages();
    if (step === 'mode') {
      navigation.goBack();
      return;
    }
    if (step === 'credentials') {
      if (initialMode) {
        navigation.goBack();
      } else {
        setMode(null);
        setStep('mode');
      }
      return;
    }
    if (step === 'recovery') {
      setStep('credentials');
      return;
    }
    if (step === 'success') {
      navigation.navigate('WalletHome');
    }
  };

  const renderModeStep = () => (
    <View style={localStyles.section}>
      <Text style={[localStyles.title, { color: colors.text }]}>Add Wallet</Text>
      <Text style={[localStyles.subtitle, { color: colors.muted }]}>
        Create a new wallet or import an existing one.
      </Text>
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.primaryButton, localStyles.buttonSpacing]}
        onPress={() => {
          resetMessages();
          setMode('create');
          setStep('credentials');
          console.info('empty_state_create_tap');
        }}
      >
        <Text style={styles.primaryButtonText}>Create wallet</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.secondaryButton}
        onPress={() => {
          resetMessages();
          setMode('import');
          setStep('credentials');
          console.info('empty_state_import_tap');
        }}
      >
        <Text style={styles.secondaryButtonText}>Import wallet</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCredentialsStep = () => (
    <View style={localStyles.section}>
      <Text style={[localStyles.title, { color: colors.text }]}>
        {mode === 'create' ? 'Create Wallet' : 'Import Wallet'}
      </Text>
      <Text style={[localStyles.subtitle, { color: colors.muted }]}>
        {mode === 'create'
          ? 'Set a 6-digit passcode for this wallet.'
          : 'Enter your phrase and set a 6-digit passcode for this wallet.'}
      </Text>
      {mode === 'import' && (
        <TextInput
          value={mnemonicInput}
          onChangeText={setMnemonicInput}
          placeholder="12 or 24 word phrase"
          placeholderTextColor={colors.muted}
          style={[styles.input, localStyles.mnemonicInput, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
      )}
      <TextInput
        value={walletPassword}
        onChangeText={setWalletPassword}
        placeholder="Passcode (6 digits)"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text }]}
        keyboardType="number-pad"
        maxLength={6}
        secureTextEntry
      />
      <TextInput
        value={walletPasswordConfirm}
        onChangeText={setWalletPasswordConfirm}
        placeholder="Confirm passcode"
        placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text }]}
        keyboardType="number-pad"
        maxLength={6}
        secureTextEntry
      />
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmitCredentials}
        disabled={isSubmitting}
      >
        <Text style={styles.primaryButtonText}>{isSubmitting ? 'Processing...' : 'Continue'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecoveryStep = () => {
    const words = createdMnemonic?.split(' ') ?? [];
    const [i1, i2] = confirmIndices;
    return (
      <View style={localStyles.section}>
        <Text style={[localStyles.title, { color: colors.text }]}>Confirm Recovery Phrase</Text>
        <Text style={[localStyles.subtitle, { color: colors.muted }]}>
          Save these words offline. Then verify the requested words.
        </Text>
        <View style={styles.mnemonicGrid}>
          {words.map((word, index) => (
            <View key={`word-${index}`} style={styles.mnemonicWord}>
              <Text style={styles.mnemonicIndex}>{index + 1}.</Text>
              <Text style={styles.mnemonicText}>{word}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.checkboxRow, backupAcknowledged && styles.checkboxRowChecked]}
          onPress={() => setBackupAcknowledged((prev) => !prev)}
        >
          <Ionicons
            name={backupAcknowledged ? 'checkbox' : 'square-outline'}
            size={20}
            color={backupAcknowledged ? colors.accent : colors.muted}
          />
          <Text style={[styles.checkboxLabel, backupAcknowledged && styles.checkboxLabelChecked]}>
            I wrote down the recovery phrase.
          </Text>
        </TouchableOpacity>
        <TextInput
          value={confirmWord1}
          onChangeText={setConfirmWord1}
          placeholder={`Word #${i1 + 1}`}
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          value={confirmWord2}
          onChangeText={setConfirmWord2}
          placeholder={`Word #${i2 + 1}`}
          placeholderTextColor={colors.muted}
          style={[styles.input, { color: colors.text }]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleConfirmRecovery}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Saving...' : 'Confirm phrase'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSkipRecovery}
          disabled={isSubmitting}
        >
          <Text style={styles.secondaryButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSuccessStep = () => (
    <View style={localStyles.section}>
      <Text style={[localStyles.title, { color: colors.text }]}>Wallet Ready</Text>
      <Text style={[localStyles.subtitle, { color: colors.muted }]}>
        {flowMessage ?? 'Wallet has been added to your cards.'}
      </Text>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.primaryButton}
        onPress={() => navigation.navigate('WalletHome')}
      >
        <Text style={styles.primaryButtonText}>Back to Wallets</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, localStyles.scrollContent]} keyboardShouldPersistTaps="handled">
        <View style={localStyles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            style={[localStyles.backButton, { borderColor: colors.border }]}
            onPress={handleBackFromStep}
            disabled={isSubmitting}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[localStyles.headerTitle, { color: colors.text }]}>Add Wallet</Text>
          <View style={localStyles.headerSpacer} />
        </View>

        {flowError && <Text style={styles.errorText}>{flowError}</Text>}
        {flowMessage && step !== 'success' && <Text style={[styles.messageText, styles.messageInfo]}>{flowMessage}</Text>}

        {step === 'mode' && renderModeStep()}
        {step === 'credentials' && renderCredentialsStep()}
        {step === 'recovery' && renderRecoveryStep()}
        {step === 'success' && renderSuccessStep()}
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 36,
  },
  section: {
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonSpacing: {
    marginBottom: 12,
  },
  mnemonicInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
});
