import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWalletStyles } from '../../styles/WalletStyles';
import WalletHelpModal from './WalletHelpModal';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  flow: 'menu' | 'create-passcode' | 'create-recovery' | 'create-success' | 'unlock';
  status: 'loading' | 'missing' | 'locked' | 'unlocked';
  walletPassword: string;
  walletPasswordConfirm: string;
  unlockPassword: string;
  mnemonicInput: string;
  backupMnemonic: string | null;
  backupAcknowledged: boolean;
  backupSkipped: boolean;
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
  onFinishSetup: () => void;
  onSkipBackup: () => void;
  onBiometricUnlock: () => void;
  biometricsAvailable: boolean;
};

const PASSCODE_LENGTH = 6;

type PasscodeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  styles: ReturnType<typeof createWalletStyles>;
};

function PasscodeField({ label, value, onChange, autoFocus, styles }: PasscodeFieldProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.split('');
  const activeIndex = Math.min(value.length, PASSCODE_LENGTH - 1);

  return (
    <View style={styles.passcodeField}>
      <Text style={styles.passcodeLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.passcodeRow}
        onPress={() => inputRef.current?.focus()}
        activeOpacity={0.9}
      >
        {Array.from({ length: PASSCODE_LENGTH }).map((_, index) => {
          const isActive = value.length < PASSCODE_LENGTH && index === activeIndex;
          return (
            <View
              key={`passcode-${index}`}
              style={[
                styles.passcodeCell,
                index < PASSCODE_LENGTH - 1 && styles.passcodeCellSpacing,
                isActive && styles.passcodeCellActive,
              ]}
            >
              <View style={[styles.passcodeDot, digits[index] ? styles.passcodeDotFilled : styles.passcodeDotEmpty]} />
            </View>
          );
        })}
      </TouchableOpacity>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={PASSCODE_LENGTH}
        autoFocus={autoFocus}
        secureTextEntry
        style={styles.passcodeHiddenInput}
      />
    </View>
  );
}

type ScreenTransitionProps = {
  children: React.ReactNode;
  triggerKey: string;
};

function ScreenTransition({ children, triggerKey }: ScreenTransitionProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY, triggerKey]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

type BiometricUnlockButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  label?: string;
  styles: ReturnType<typeof createWalletStyles>;
  iconColor: string;
};

function BiometricUnlockButton({
  onPress,
  disabled = false,
  label = 'Use fingerprint',
  styles,
  iconColor,
}: BiometricUnlockButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.secondaryButton, styles.fingerprintButton, disabled && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
    >
      <Ionicons name="finger-print" size={18} color={iconColor} style={styles.fingerprintIcon} />
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function WalletSetupScreen({
  flow,
  status,
  walletPassword,
  walletPasswordConfirm,
  unlockPassword,
  mnemonicInput,
  backupMnemonic,
  backupAcknowledged,
  backupSkipped,
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
  onFinishSetup,
  onSkipBackup,
  onBiometricUnlock,
  biometricsAvailable,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const [showHelp, setShowHelp] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const lastAutoUnlock = useRef('');

  const sanitizePasscode = (value: string) => value.replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
  const handlePasscodeChange = (value: string) => onChangeWalletPassword(sanitizePasscode(value));
  const handlePasscodeConfirmChange = (value: string) => onChangeWalletPasswordConfirm(sanitizePasscode(value));
  const handleUnlockChange = (value: string) => onChangeUnlockPassword(sanitizePasscode(value));

  const openImportModal = () => {
    onGoImport();
    setShowImportModal(true);
  };

  const closeImportModal = () => setShowImportModal(false);

  const handleGoCreate = () => {
    setShowImportModal(false);
    onGoCreate();
  };

  useEffect(() => {
    const canAutoUnlock = status === 'locked' || flow === 'unlock';
    if (!canAutoUnlock || isSubmitting) return;
    if (unlockPassword.length < PASSCODE_LENGTH) {
      lastAutoUnlock.current = '';
      return;
    }
    if (unlockPassword.length === PASSCODE_LENGTH && lastAutoUnlock.current !== unlockPassword) {
      lastAutoUnlock.current = unlockPassword;
      onUnlock();
    }
  }, [flow, isSubmitting, onUnlock, status, unlockPassword]);

  const renderProgress = (step: number) => {
    const percent = Math.round((step / 3) * 100);
    const progressWidth = `${percent}%` as const;
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.progressLabel}>Step {step} of 3</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
      </View>
    );
  };

  if (status === 'loading') {
    return (
      <ScreenTransition triggerKey={`${status}-${flow}`}>
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Checking wallet...</Text>
        </View>
      </ScreenTransition>
    );
  }

  if (flow === 'create-recovery' && backupMnemonic) {
    const words = backupMnemonic.split(' ');
    const [i1, i2] = confirmIndices;
    return (
      <ScreenTransition triggerKey={`${status}-${flow}`}>
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Recovery phrase</Text>
          <Text style={styles.setupSubtitle}>Write these words down in order. Do not screenshot.</Text>
          {renderProgress(2)}
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
          {flowError && <Text style={styles.errorText}>{flowError}</Text>}
          {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
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
      </ScreenTransition>
    );
  }

  if (flow === 'create-passcode') {
    return (
      <ScreenTransition triggerKey={`${status}-${flow}`}>
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Create a wallet</Text>
          <Text style={styles.setupSubtitle}>
            Set a 6-digit passcode. You'll use it to log in next time.
          </Text>
          {renderProgress(1)}
          <PasscodeField
            label="Passcode"
            value={walletPassword}
            onChange={handlePasscodeChange}
            autoFocus
            styles={styles}
          />
          <PasscodeField
            label="Confirm passcode"
            value={walletPasswordConfirm}
            onChange={handlePasscodeConfirmChange}
            styles={styles}
          />
          {flowError && <Text style={styles.errorText}>{flowError}</Text>}
          {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
          {isSubmitting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text style={styles.loadingText}>Creating wallet...</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={onCreate}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>Create wallet</Text>
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
      </ScreenTransition>
    );
  }

  if (flow === 'create-success') {
    return (
      <ScreenTransition triggerKey={`${status}-${flow}`}>
        <View style={[styles.setupCard, styles.successCard]}>
          {renderProgress(3)}
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
          {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={onFinishSetup} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Go to wallet</Text>
          </TouchableOpacity>
        </View>
      </ScreenTransition>
    );
  }

  if (status === 'locked' || flow === 'unlock') {
    return (
      <ScreenTransition triggerKey={`${status}-${flow}`}>
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Log in</Text>
          <Text style={styles.setupSubtitle}>Enter your 6-digit passcode.</Text>
          <PasscodeField
            label="Passcode"
            value={unlockPassword}
            onChange={handleUnlockChange}
            autoFocus
            styles={styles}
          />
          {flowError && <Text style={styles.errorText}>{flowError}</Text>}
          {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
          {isSubmitting && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text style={styles.loadingText}>Logging in...</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={onUnlock}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>Log in</Text>
          </TouchableOpacity>
          {biometricsAvailable && (
            <BiometricUnlockButton
              onPress={onBiometricUnlock}
              disabled={isSubmitting}
              styles={styles}
              iconColor={colors.text}
            />
          )}
        </View>
      </ScreenTransition>
    );
  }

  if (status === 'missing') {
    return (
      <ScreenTransition triggerKey={`${status}-${flow}`}>
        <View style={styles.setupCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.setupTitle}>Add a wallet</Text>
            <TouchableOpacity
              onPress={() => setShowHelp(true)}
              accessibilityLabel="Wallet setup help"
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={22} color="#4f46e5" />
            </TouchableOpacity>
          </View>
          <Text style={styles.setupSubtitle}>Create a new wallet or log in to an existing one.</Text>
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleGoCreate}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>Create wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={openImportModal}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            <Text style={styles.secondaryButtonText}>Import existing wallet</Text>
          </TouchableOpacity>
          <WalletHelpModal visible={showHelp} onClose={() => setShowHelp(false)} />
          <Modal visible={showImportModal} transparent animationType="fade" onRequestClose={closeImportModal}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Import wallet</Text>
                  <TouchableOpacity onPress={closeImportModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                  onChange={handlePasscodeChange}
                  styles={styles}
                />
                <PasscodeField
                  label="Confirm passcode"
                  value={walletPasswordConfirm}
                  onChange={handlePasscodeConfirmChange}
                  styles={styles}
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
                  onPress={closeImportModal}
                  activeOpacity={0.9}
                  disabled={isSubmitting}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </View>
      </ScreenTransition>
    );
  }

  return null;
}
