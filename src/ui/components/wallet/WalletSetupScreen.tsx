import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import WalletHelpModal from './WalletHelpModal';
import WalletLoadingCard from './WalletLoadingCard';
import WalletCreatePasscodeCard from './WalletCreatePasscodeCard';
import WalletUnlockCard from './WalletUnlockCard';
import WalletRecoveryCard from './WalletRecoveryCard';
import WalletSuccessCard from './WalletSuccessCard';
import WalletImportModal from './WalletImportModal';
import { useTheme } from '@theme/ThemeProvider';

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
  initialImportOpen?: boolean;
};

type PasscodeFieldId = 'primary' | 'confirm' | 'unlock';

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
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [opacity, translateY, triggerKey]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
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
  initialImportOpen,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const [showHelp, setShowHelp] = useState(false);
  const [showImportModal, setShowImportModal] = useState(Boolean(initialImportOpen));
  const lastAutoUnlock = useRef('');
  const lastAutoCreate = useRef('');
  const [activePasscodeField, setActivePasscodeField] = useState<PasscodeFieldId | null>(null);
  const PASSCODE_LENGTH = 6;

  const sanitizePasscode = (value: string) => value.replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
  const handlePasscodeChange = (value: string) => {
    const next = sanitizePasscode(value);
    onChangeWalletPassword(next);
    if (next.length === PASSCODE_LENGTH && (flow === 'create-passcode' || showImportModal)) {
      setActivePasscodeField('confirm');
    }
  };
  const handlePasscodeConfirmChange = (value: string) => {
    const next = sanitizePasscode(value);
    onChangeWalletPasswordConfirm(next);
  };
  const handleUnlockChange = (value: string) => {
    const next = sanitizePasscode(value);
    onChangeUnlockPassword(next);
  };

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
    if (initialImportOpen) {
      setShowImportModal(true);
    }
  }, [initialImportOpen]);

  useEffect(() => {
    if (flow === 'create-passcode') {
      setActivePasscodeField('primary');
      return;
    }
    if (flow === 'unlock' || status === 'locked') {
      setActivePasscodeField('unlock');
      return;
    }
    if (showImportModal) {
      setActivePasscodeField('primary');
      return;
    }
    setActivePasscodeField(null);
  }, [flow, showImportModal, status]);

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

  useEffect(() => {
    if (flow !== 'create-passcode' || isSubmitting) return;
    if (walletPassword.length < PASSCODE_LENGTH || walletPasswordConfirm.length < PASSCODE_LENGTH) {
      lastAutoCreate.current = '';
      return;
    }
    if (walletPassword !== walletPasswordConfirm) {
      lastAutoCreate.current = '';
      return;
    }
    if (lastAutoCreate.current === walletPasswordConfirm) return;
    lastAutoCreate.current = walletPasswordConfirm;
    onCreate();
  }, [flow, isSubmitting, onCreate, walletPassword, walletPasswordConfirm]);

  const effectivePasscodeField =
    activePasscodeField ??
    (flow === 'unlock' || status === 'locked'
      ? 'unlock'
      : flow === 'create-passcode' || showImportModal
      ? 'primary'
      : null);

  const activePasscodeValue = (() => {
    switch (effectivePasscodeField) {
      case 'confirm':
        return walletPasswordConfirm;
      case 'unlock':
        return unlockPassword;
      case 'primary':
      default:
        return walletPassword;
    }
  })();

  const applyPasscodeValue = (next: string) => {
    if (!effectivePasscodeField) return;
    if (!activePasscodeField) {
      setActivePasscodeField(effectivePasscodeField);
    }
    if (effectivePasscodeField === 'confirm') {
      handlePasscodeConfirmChange(next);
      return;
    }
    if (effectivePasscodeField === 'unlock') {
      handleUnlockChange(next);
      return;
    }
    handlePasscodeChange(next);
  };

  const handleKeypadDigit = (digit: string) => {
    if (!effectivePasscodeField) return;
    if (activePasscodeValue.length >= PASSCODE_LENGTH) return;
    applyPasscodeValue(`${activePasscodeValue}${digit}`);
  };

  const handleKeypadDelete = () => {
    if (!effectivePasscodeField) return;
    if (activePasscodeValue.length === 0) return;
    applyPasscodeValue(activePasscodeValue.slice(0, -1));
  };

  const handleKeypadClear = () => {
    if (!effectivePasscodeField) return;
    if (activePasscodeValue.length === 0) return;
    applyPasscodeValue('');
  };

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
        <WalletLoadingCard styles={styles} />
      </ScreenTransition>
    );
  }

  if (flow === 'create-recovery' && backupMnemonic) {
    const words = backupMnemonic.split(' ');
    return (
      <ScreenTransition triggerKey={`${status}-${flow}`}>
        <WalletRecoveryCard
          styles={styles}
          colors={{ accent: colors.accent, text: colors.text }}
          words={words}
          confirmIndices={confirmIndices}
          confirmWord1={confirmWord1}
          confirmWord2={confirmWord2}
          flowError={flowError}
          flowMessage={flowMessage}
          isSubmitting={isSubmitting}
          backupAcknowledged={backupAcknowledged}
          onToggleBackup={onToggleBackup}
          onChangeConfirmWord1={onChangeConfirmWord1}
          onChangeConfirmWord2={onChangeConfirmWord2}
          onConfirmBackup={onConfirmBackup}
          onSkipBackup={onSkipBackup}
          renderProgress={() => renderProgress(2)}
        />
      </ScreenTransition>
    );
  }

  if (flow === 'create-passcode') {
    return (
      <ScreenTransition triggerKey={`${status}-${flow}`}>
        <WalletCreatePasscodeCard
          styles={styles}
          walletPassword={walletPassword}
          walletPasswordConfirm={walletPasswordConfirm}
          flowError={flowError}
          flowMessage={flowMessage}
          isSubmitting={isSubmitting}
          renderProgress={() => renderProgress(1)}
          onChangeWalletPassword={handlePasscodeChange}
          onChangeWalletPasswordConfirm={handlePasscodeConfirmChange}
          onCreate={onCreate}
          onBackToMenu={onBackToMenu}
          isPrimaryActive={effectivePasscodeField === 'primary'}
          isConfirmActive={effectivePasscodeField === 'confirm'}
          onActivatePrimary={() => setActivePasscodeField('primary')}
          onActivateConfirm={() => setActivePasscodeField('confirm')}
        />
      </ScreenTransition>
    );
  }

  if (flow === 'create-success') {
    return (
      <ScreenTransition triggerKey={`${status}-${flow}`}>
        <WalletSuccessCard
          styles={styles}
          colors={{
            success: colors.success,
            warning: colors.warning,
            successText: colors.successText,
            warningText: colors.warningText,
          }}
          backupSkipped={backupSkipped}
          flowMessage={flowMessage}
          onFinishSetup={onFinishSetup}
          renderProgress={() => renderProgress(3)}
        />
      </ScreenTransition>
    );
  }

  if (status === 'locked' || flow === 'unlock') {
    return (
      <ScreenTransition triggerKey={`${status}-${flow}`}>
        <WalletUnlockCard
          styles={styles}
          unlockPassword={unlockPassword}
          flowError={flowError}
          flowMessage={flowMessage}
          isSubmitting={isSubmitting}
          onChangeUnlockPassword={handleUnlockChange}
          onUnlock={onUnlock}
          isUnlockActive={effectivePasscodeField === 'unlock'}
          onActivateUnlock={() => setActivePasscodeField('unlock')}
        />
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
          <WalletImportModal
            visible={showImportModal}
            styles={styles}
            colors={{ text: colors.text }}
            mnemonicInput={mnemonicInput}
            walletPassword={walletPassword}
            walletPasswordConfirm={walletPasswordConfirm}
            flowError={flowError}
            flowMessage={flowMessage}
            isSubmitting={isSubmitting}
            onChangeMnemonic={onChangeMnemonic}
            onChangeWalletPassword={handlePasscodeChange}
            onChangeWalletPasswordConfirm={handlePasscodeConfirmChange}
            onImport={onImport}
            onClose={closeImportModal}
            iconColor={colors.text}
            onDigit={handleKeypadDigit}
            onDelete={handleKeypadDelete}
            onClear={handleKeypadClear}
            isPrimaryActive={effectivePasscodeField === 'primary'}
            isConfirmActive={effectivePasscodeField === 'confirm'}
            onActivatePrimary={() => setActivePasscodeField('primary')}
            onActivateConfirm={() => setActivePasscodeField('confirm')}
          />
        </View>
      </ScreenTransition>
    );
  }

  return null;
}
