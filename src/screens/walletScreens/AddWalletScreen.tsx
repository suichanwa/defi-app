import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import WalletSetupScreen from '@components/wallet/WalletSetupScreen';
import { useWalletSession } from '@context/WalletSessionProvider';
import { walletErrorMessage } from '@utils/walletErrors';
import { useNavVisibility } from '@context/NavVisibilityProvider';

export default function AddScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const { createWallet, importWallet, confirmBackup } = useWalletSession();
  const { setNavHidden } = useNavVisibility();

  const [flow, setFlow] = useState<'menu' | 'create-passcode' | 'create-recovery' | 'create-success' | 'unlock'>(
    'menu',
  );
  const [walletPassword, setWalletPassword] = useState('');
  const [walletPasswordConfirm, setWalletPasswordConfirm] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [backupMnemonic, setBackupMnemonic] = useState<string | null>(null);
  const [backupAcknowledged, setBackupAcknowledged] = useState(false);
  const [backupSkipped, setBackupSkipped] = useState(false);
  const [confirmWord1, setConfirmWord1] = useState('');
  const [confirmWord2, setConfirmWord2] = useState('');
  const [confirmIndices, setConfirmIndices] = useState<[number, number]>([1, 5]);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFlowOpen, setIsFlowOpen] = useState(false);
  const [initialImportOpen, setInitialImportOpen] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(true);
      return () => setNavHidden(false);
    }, [setNavHidden]),
  );

  const resetFlowMessages = () => {
    setFlowError(null);
    setFlowMessage(null);
  };

  const resetSetupInputs = () => {
    setWalletPassword('');
    setWalletPasswordConfirm('');
    setUnlockPassword('');
    setMnemonicInput('');
    setBackupMnemonic(null);
    setBackupAcknowledged(false);
    setBackupSkipped(false);
    setConfirmWord1('');
    setConfirmWord2('');
    setFlowError(null);
    setFlowMessage(null);
    setIsSubmitting(false);
  };

  const normalizeMnemonic = (phrase: string) =>
    phrase
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .join(' ');

  const passcodePolicy = (value: string) => {
    if (!/^\d{6}$/.test(value)) return 'Passcode must be exactly 6 digits.';
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
    if (idx2 === idx1) {
      idx2 = (idx2 + 3) % words.length;
    }
    setConfirmIndices([idx1, idx2]);
    setBackupMnemonic(mnemonic);
    setBackupAcknowledged(false);
    setBackupSkipped(false);
    setConfirmWord1('');
    setConfirmWord2('');
    setFlow('create-recovery');
  };

  const openCreateFlow = () => {
    resetSetupInputs();
    setInitialImportOpen(false);
    setFlow('create-passcode');
    setIsFlowOpen(true);
  };

  const openImportFlow = () => {
    resetSetupInputs();
    setInitialImportOpen(true);
    setFlow('menu');
    setIsFlowOpen(true);
  };

  const closeFlow = () => {
    setIsFlowOpen(false);
    setInitialImportOpen(false);
    resetSetupInputs();
    setFlow('menu');
  };

  const handleCreate = async () => {
    console.log('=== handleCreate called ===');
    console.log('walletPassword:', walletPassword, 'length:', walletPassword.length);
    console.log('walletPassword type:', typeof walletPassword);
    console.log('walletPasswordConfirm:', walletPasswordConfirm, 'length:', walletPasswordConfirm.length);
    
    resetFlowMessages();
    
    // Validate passcode length
    if (walletPassword.length !== 6) {
      console.log('Error: Passcode length not 6');
      setFlowError('Passcode must be exactly 6 digits.');
      return;
    }
    
    // Validate passcode is numeric
    const policy = passcodePolicy(walletPassword);
    if (policy) {
      console.log('Error: Policy violation:', policy);
      setFlowError(policy);
      return;
    }
    
    // Validate confirm passcode
    if (walletPasswordConfirm.length !== 6) {
      console.log('Error: Confirm passcode length not 6');
      setFlowError('Please enter confirmation passcode.');
      return;
    }
    
    // Validate passcodes match
    if (walletPassword !== walletPasswordConfirm) {
      console.log('Error: Passcodes do not match');
      setFlowError('Passcodes do not match.');
      return;
    }
    
    console.log('All validations passed, creating wallet...');
    console.log('About to call createWallet with password type:', typeof walletPassword);
    setIsSubmitting(true);
    try {
      const { mnemonic } = await createWallet(walletPassword);
      console.log('Wallet created successfully');
      const normalized = normalizeMnemonic(mnemonic);
      startBackupConfirm(normalized);
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet created. Back up your recovery phrase.');
    } catch (error) {
      console.error('Error creating wallet:', error);
      console.error('Error type:', typeof error);
      console.error('Error instanceof Error:', error instanceof Error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
      }
      setFlowError(walletErrorMessage(error, 'create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async () => {
    resetFlowMessages();
    const phrase = normalizeMnemonic(mnemonicInput);
    const words = phrase.split(' ');
    if (!phrase) {
      setFlowError('Enter your 12 or 24 word phrase.');
      return;
    }
    if (![12, 24].includes(words.length)) {
      setFlowError('Mnemonic must be 12 or 24 words.');
      return;
    }
    
    if (walletPassword.length !== 6) {
      setFlowError('Passcode must be exactly 6 digits.');
      return;
    }
    
    const policy = passcodePolicy(walletPassword);
    if (policy) {
      setFlowError(policy);
      return;
    }
    
    // Validate confirm passcode
    if (walletPasswordConfirm.length !== 6) {
      setFlowError('Please enter confirmation passcode.');
      return;
    }
    
    if (walletPassword !== walletPasswordConfirm) {
      setFlowError('Passcodes do not match.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await importWallet(phrase, walletPassword);
      await confirmBackup();
      setMnemonicInput('');
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet imported.');
      setFlow('create-success');
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'import'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmBackup = async () => {
    if (!backupMnemonic) {
      setFlow('menu');
      return;
    }
    const words = backupMnemonic.split(' ');
    const [i1, i2] = confirmIndices;
    if (!backupAcknowledged) {
      setFlowError('Confirm you wrote it down.');
      return;
    }
    if (words[i1] !== confirmWord1.trim().toLowerCase() || words[i2] !== confirmWord2.trim().toLowerCase()) {
      setFlowError('Words do not match. Try again.');
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmBackup();
      setBackupMnemonic(null);
      setBackupSkipped(false);
      setFlowMessage('Recovery phrase confirmed.');
      setFlow('create-success');
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Unable to confirm recovery phrase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipBackup = async () => {
    if (isSubmitting) return;
    resetFlowMessages();
    if (!backupMnemonic) {
      setFlow('menu');
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmBackup();
      setBackupMnemonic(null);
      setBackupSkipped(true);
      setFlowMessage('Recovery phrase skipped.');
      setFlow('create-success');
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Unable to skip recovery phrase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishSetup = () => {
    closeFlow();
  };

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, localStyles.scrollContent]}>
        <Text style={[localStyles.title, { color: colors.text }]}>Add Wallet</Text>
        <Text style={[localStyles.subtitle, { color: colors.muted }]}>Create a new wallet or import an existing one.</Text>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[localStyles.primaryButton, { backgroundColor: colors.accent }]}
          onPress={openCreateFlow}
        >
          <Text style={localStyles.primaryButtonText}>Create wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[localStyles.secondaryButton, { borderColor: colors.border }]}
          onPress={openImportFlow}
        >
          <Text style={[localStyles.secondaryButtonText, { color: colors.text }]}>Import wallet</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={isFlowOpen} animationType="slide" onRequestClose={closeFlow}>
        <View style={[localStyles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={localStyles.modalHeader}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[localStyles.closeButton, { borderColor: colors.border }]}
              onPress={closeFlow}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
            <Text style={[localStyles.modalTitle, { color: colors.text }]}>New wallet</Text>
            <View style={localStyles.modalSpacer} />
          </View>
          <ScrollView contentContainerStyle={localStyles.modalContent}>
            <WalletSetupScreen
              flow={flow as any}
              status="missing"
              walletPassword={walletPassword}
              walletPasswordConfirm={walletPasswordConfirm}
              unlockPassword={unlockPassword}
              mnemonicInput={mnemonicInput}
              backupMnemonic={backupMnemonic}
              backupAcknowledged={backupAcknowledged}
              backupSkipped={backupSkipped}
              confirmWord1={confirmWord1}
              confirmWord2={confirmWord2}
              confirmIndices={confirmIndices}
              flowError={flowError}
              flowMessage={flowMessage}
              isSubmitting={isSubmitting}
              onChangeWalletPassword={setWalletPassword}
              onChangeWalletPasswordConfirm={setWalletPasswordConfirm}
              onChangeUnlockPassword={setUnlockPassword}
              onChangeMnemonic={setMnemonicInput}
              onChangeConfirmWord1={setConfirmWord1}
              onChangeConfirmWord2={setConfirmWord2}
              onToggleBackup={() => setBackupAcknowledged((v) => !v)}
              onCreate={handleCreate}
              onImport={handleImport}
              onUnlock={() => {}}
              onConfirmBackup={handleConfirmBackup}
              onBackToMenu={closeFlow}
              onGoCreate={() => {
                resetFlowMessages();
                setFlow('create-passcode');
              }}
              onGoImport={() => {
                resetFlowMessages();
              }}
              onFinishSetup={handleFinishSetup}
              onSkipBackup={handleSkipBackup}
              initialImportOpen={initialImportOpen}
            />
          </ScrollView>
        </View>
      </Modal>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  modalSpacer: {
    width: 36,
  },
  modalContent: {
    flexGrow: 1,
  },
});
