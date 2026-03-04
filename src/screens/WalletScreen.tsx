import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '../theme/ThemeProvider';
import { useChain } from '../context/ChainProvider';
import { useWalletSession } from '../context/WalletSessionProvider';
import type { WalletRecordMeta } from '../types/wallet';
import WalletSetupScreen from '@components/wallet/WalletSetupScreen';
import { walletErrorMessage } from '../utils/walletErrors';
import ErrorDialog from '@components/common/ErrorDialog';
import { requestSolAirdrop } from '../services/solanaAirdrop';
import useApiError from '../hooks/useApiError';
import useWalletRefresh from '../hooks/useWalletRefresh';
import {
  canUseBiometrics,
  getBiometricPassword,
  promptBiometric,
  saveBiometricPassword,
} from '../services/biometrics';
import AddScreen from './walletScreens/AddWalletScreen';
import ReceiveScreen from './walletScreens/ReceiveScreen';
import SendScreen from './walletScreens/SendScreen';
import SwapScreen from './walletScreens/SwapScreen';
import SendCryptoScreen from './walletScreens/SendCryptoScreen';
import SendCryptoComplete from './walletScreens/SendCryptoComplete';
import QRReceiveScreen from './walletScreens/QRReceiveScreen';
import ExpressSwapScreen from './walletScreens/ExpressSwapScreen';
import ExpressSwapSuccessScreen from './walletScreens/ExpressSwapSuccessScreen';
import WalletCardSettingsScreen from './walletScreens/WalletCardSettingsScreen';
import WalletSettingsScreen from './walletScreens/WalletSettingsScreen';
import WalletTokensTab from './walletScreens/Tokens/WalletTokensTab';
import WalletNFTsTab from './walletScreens/NFTs/WalletNFTsTab';
import WalletHeaderSection from './walletScreens/components/WalletHeaderSection';
import WalletCardCarousel, { WalletActionItem } from './walletScreens/components/WalletCardCarousel';
import WalletSearchBar from './walletScreens/components/WalletSearchBar';
import WalletTabSelector, { WalletTab } from './walletScreens/components/WalletTabSelector';
import WalletTokenSearchOverlay from './walletScreens/components/WalletTokenSearchOverlay';
import { clearProfileSettings } from '@services/profileStore';
import { clearRewardsCache } from '@services/rewardsStore';
import { signOut as authSignOut } from '@services/auth';
import { appFeatures } from '@config/appFeatures';
import { useNavVisibility } from '@context/NavVisibilityProvider';

type WalletStackParamList = {
  WalletHome: undefined;
  Add: undefined;
  Send: undefined;
  Receive: { address: string };
  Swap: undefined;
  ExpressSwap: undefined;
  ExpressSwapSuccess: undefined;
  SendCrypto: { symbol: string; name: string; balance: string };
  SendCryptoComplete: { symbol: string; amount: string; toAddress: string; signature: string };
  QRReceive: { symbol: string; name: string; address: string };
  WalletCardSettings: { walletId: string };
  WalletSettings: { walletId: string };
};

type WalletAction = WalletActionItem & {
  screen: keyof WalletStackParamList;
};

const walletActions: WalletAction[] = [
  { label: 'Add', icon: 'plus-circle', screen: 'Add' },
  { label: 'Send', icon: 'send', screen: 'Send' },
  { label: 'Receive', icon: 'qrcode-scan', screen: 'Receive' },
  { label: 'Swap', icon: 'swap-horizontal', screen: 'Swap' },
];

const Stack = createStackNavigator<WalletStackParamList>();

function WalletHomeScreen({ navigation }: { navigation: StackNavigationProp<WalletStackParamList, 'WalletHome'> }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const { chain, chainKey, setChainKey } = useChain();
  const { status, address, wallets, activeWalletId, switchWallet, registerActivity } = useWalletSession();
  const { setNavHidden } = useNavVisibility();
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(0, width - 40);
  const [isAirdropLoading, setIsAirdropLoading] = useState(false);
  const [airdropMessage, setAirdropMessage] = useState<string | null>(null);
  const [airdropTick, setAirdropTick] = useState(0);
  const { errorMessage, errorTitle, errorVariant, isErrorVisible, handleError, clearError } = useApiError();
  const handleActivateWallet = async (walletId: string) => {
    if (walletId && walletId !== activeWalletId) {
      try {
        await switchWallet(walletId);
      } catch (error) {
        handleError(error, {
          defaultMessage: 'Unable to activate this wallet. Try unlocking it again.',
        });
      }
    }
  };

  const walletList = useMemo<WalletRecordMeta[]>(() => {
    if (wallets.length) return wallets;
    if (address) {
      return [
        {
          id: address,
          createdAt: '',
          updatedAt: '',
          walletType: chain.kind === 'solana' ? 'solana' : 'ethereum',
          label: undefined,
          color: undefined,
        },
      ];
    }
    return [];
  }, [wallets, address, chain.kind]);

  const activeIndex = useMemo(() => {
    if (!walletList.length) return 0;
    const index = walletList.findIndex((record) => record.id === activeWalletId);
    return index >= 0 ? index : 0;
  }, [walletList, activeWalletId]);

  const {
    prices,
    loadingPrices,
    priceError,
    lastUpdated,
    lastChainUpdated,
    chainTokens,
    fetchingChain,
    rpcError,
    onScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollEnd,
  } = useWalletRefresh(chain, status, address, airdropTick, 15000);
  const [activeTab, setActiveTab] = useState<WalletTab>('tokens');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(false);
    }, [setNavHidden]),
  );

  const totalValueAnimated = useRef(new Animated.Value(0)).current;
  const [displayTotal, setDisplayTotal] = useState(0);

  const formatCurrency = (value: number) => {
    if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
      return Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    }
    const rounded = Math.round(value * 100) / 100;
    return `$${rounded.toFixed(2)}`;
  };

  const totalValueUSD = useMemo(() => {
    return chainTokens.reduce((sum, token) => {
      const livePrice =
        token.pair && typeof prices[token.pair] === 'number'
          ? prices[token.pair]
          : token.fixedPrice !== undefined
          ? token.fixedPrice
          : undefined;
      if (typeof livePrice !== 'number') return sum;
      return sum + livePrice * token.amount;
    }, 0);
  }, [prices, chainTokens]);

  useEffect(() => {
    totalValueAnimated.setValue(totalValueUSD);
    const id = totalValueAnimated.addListener(({ value }) => setDisplayTotal(value));
    return () => totalValueAnimated.removeListener(id);
  }, [totalValueAnimated, totalValueUSD]);

  useEffect(() => {
    Animated.timing(totalValueAnimated, {
      toValue: totalValueUSD,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [totalValueUSD, totalValueAnimated]);

  useEffect(() => {
    setAirdropMessage(null);
  }, [chain]);

  const handleToggleNetwork = async () => {
    if (chainKey === 'solanaDevnet') {
      await setChainKey('solanaMainnet');
      return;
    }
    if (chainKey === 'solanaMainnet') {
      await setChainKey('solanaDevnet');
    }
  };

  const handleAirdrop = async () => {
    if (!address || chain.kind !== 'solana' || chain.cluster !== 'devnet') return;
    setIsAirdropLoading(true);
    setAirdropMessage(null);
    try {
      await requestSolAirdrop(address, 1);
      setAirdropMessage('Airdrop requested. Balance will update shortly.');
      setAirdropTick((prev) => prev + 1);
    } catch (error) {
      handleError(error, {
        defaultMessage: 'Airdrop failed. Try again.',
        rateLimitMessage: 'Airdrop rate limited. Please wait a moment and try again.',
      });
    } finally {
      setIsAirdropLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
      onScrollBeginDrag={onScrollBeginDrag}
      onScrollEndDrag={onScrollEndDrag}
      onMomentumScrollEnd={onMomentumScrollEnd}
      onTouchStart={registerActivity}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <WalletHeaderSection
        chain={chain}
        fetchingChain={fetchingChain}
        address={address}
        isAirdropLoading={isAirdropLoading}
        onToggleNetwork={handleToggleNetwork}
        onAirdrop={handleAirdrop}
      />
      {airdropMessage && <Text style={[styles.messageText, styles.messageInfo]}>{airdropMessage}</Text>}
      <ErrorDialog
        visible={isErrorVisible}
        title={errorTitle}
        message={errorMessage}
        variant={errorVariant}
        onClose={clearError}
      />

      <WalletCardCarousel
        walletList={walletList}
        activeWalletId={activeWalletId}
        activeIndex={activeIndex}
        cardWidth={cardWidth}
        displayTotal={displayTotal}
        formatCurrency={formatCurrency}
        actions={walletActions}
        onActionPress={(action) => {
          if (action.screen === 'Receive' && address) {
            navigation.navigate('Receive', { address });
          } else {
            navigation.navigate(action.screen as any);
          }
        }}
        onEditWallet={(walletId) => navigation.navigate('WalletCardSettings', { walletId })}
        onSettingsWallet={(walletId) => navigation.navigate('WalletSettings', { walletId })}
        onActivateWallet={handleActivateWallet}
      />

      <WalletSearchBar onFocus={() => setIsSearchOpen(true)} />
      <WalletTokenSearchOverlay visible={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {priceError ? (
        <Text style={styles.errorText}>{priceError}</Text>
      ) : (
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Prices: {lastUpdated ? `Updated ${lastUpdated}` : 'Loading...'}</Text>
          <Text style={styles.metaText}>
            Balances: {lastChainUpdated ? `Updated ${lastChainUpdated}` : 'Waiting...'}
          </Text>
        </View>
      )}
      {rpcError && <Text style={styles.errorText}>{rpcError}</Text>}

      <WalletTabSelector activeTab={activeTab} onChangeTab={setActiveTab} />

      {activeTab === 'tokens' && (
        <WalletTokensTab tokens={chainTokens} prices={prices} loading={loadingPrices} formatCurrency={formatCurrency} />
      )}
      {activeTab === 'nfts' && <WalletNFTsTab ownerAddress={address} />}
      {activeTab === 'activity' && (
        <View style={styles.listCard}>
          <Text style={styles.metaText}>No activity yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

export default function WalletScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const {
    status,
    address,
    wallet,
    unlock,
    createWallet,
    importWallet,
    confirmBackup,
    forgetWallet,
  } = useWalletSession();

  const [flow, setFlow] = useState<
    'menu' | 'create-passcode' | 'create-recovery' | 'create-success' | 'unlock'
  >('menu');
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
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const biometricInFlightRef = useRef(false);
  const resetInFlightRef = useRef(false);

  const animatePasscodeUnlock = async (passcode: string) => {
    setUnlockPassword('');
    for (let i = 1; i <= passcode.length; i += 1) {
      setUnlockPassword(passcode.slice(0, i));
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  };

  useEffect(() => {
    if (status === 'missing') {
      setFlow('menu');
    } else if (status === 'locked') {
      setFlow('unlock');
    }
  }, [status]);


  useEffect(() => {
    let cancelled = false;
    
    const tryBiometricUnlock = async () => {
      if (status !== 'locked') return;
      if (biometricInFlightRef.current) return;
      if (resetInFlightRef.current) return;

      try {
        const canUse = await canUseBiometrics();
        if (!canUse || cancelled) return;
        const stored = await getBiometricPassword();
        if (!stored || cancelled) return;
        biometricInFlightRef.current = true;
        setIsSubmitting(true);
        startSlowMessage('Yeah, this might take a moment...');
        await animatePasscodeUnlock(stored);
        await unlock(stored);
        if (!cancelled && !resetInFlightRef.current) {
          setFlow('menu');
          setUnlockPassword('');
        }
      } catch {
        // Silent fail
      } finally {
        biometricInFlightRef.current = false;
        if (!resetInFlightRef.current) {
          clearSlowMessage();
          setIsSubmitting(false);
        }
      }
    };

    tryBiometricUnlock();
    
    return () => {
      cancelled = true;
    };
  }, [status, unlock]);

  const resetFlowMessages = () => {
    setFlowError(null);
    setFlowMessage(null);
  };


  const normalizeMnemonic = (phrase: string) =>
    phrase
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .join(' ');

  const passcodePolicy = (value: string) => {
    if (!/^\d{6}$/.test(value)) return 'Passcode must be 6 digits.';
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

  const handleCreate = async () => {
    console.log('=== WalletScreen: handleCreate START ===');
    console.log('walletPassword:', walletPassword, 'length:', walletPassword.length);
    console.log('walletPasswordConfirm:', walletPasswordConfirm, 'length:', walletPasswordConfirm.length);
    
    resetFlowMessages();
    
    console.log('Running passcodePolicy...');
    const policy = passcodePolicy(walletPassword);
    console.log('passcodePolicy result:', policy);
    
    if (policy) {
      console.log('ERROR: Policy validation failed:', policy);
      setFlowError(policy);
      setShowErrorDialog(true);
      return;
    }
    
    if (walletPassword !== walletPasswordConfirm) {
      console.log('ERROR: Passcodes do not match');
      setFlowError('Passcodes do not match.');
      setShowErrorDialog(true);
      return;
    }
    
    console.log('✅ Validation passed');
    console.log('Setting isSubmitting to true');
    setIsSubmitting(true);
    
    console.log('Starting slow message...');
    startSlowMessage('Yeah, this might take a moment...');
    
    console.log('Entering try block...');
    try {
      const passcode = walletPassword;
      console.log('About to call createWallet...');
      console.log('createWallet type:', typeof createWallet);
      console.log('createWallet:', createWallet);
      
      const result = await createWallet(passcode);
      
      console.log('✅ createWallet returned:', result);
      
      if (!result || !result.mnemonic) {
        console.error('❌ Invalid result from createWallet:', result);
        throw new Error('Wallet creation returned invalid data');
      }
      
      const { mnemonic } = result;
      console.log('✅ Mnemonic received, length:', mnemonic.split(' ').length);
      
      const normalized = normalizeMnemonic(mnemonic);
      setBackupSkipped(false);
      startBackupConfirm(normalized);
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet created. Back up your recovery phrase.');
      
      if (biometricsAvailable) {
        await saveBiometricPassword(passcode);
      }
      
      console.log('✅ Wallet creation complete');
    } catch (error) {
      console.error('❌ ERROR in handleCreate catch block');
      console.error('Error:', error);
      console.error('Error type:', typeof error);
      console.error('Error instanceof Error:', error instanceof Error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      setFlowError(walletErrorMessage(error, 'create'));
      setShowErrorDialog(true);
    } finally {
      console.log('handleCreate finally block');
      clearSlowMessage();
      setIsSubmitting(false);
    }
  };

  const handleImport = async () => {
    resetFlowMessages();
    const phrase = normalizeMnemonic(mnemonicInput);
    const words = phrase.split(' ');
    if (!phrase) {
      setFlowError('Enter your 12 or 24 word phrase.');
      setShowErrorDialog(true);
      return;
    }
    if (![12, 24].includes(words.length)) {
      setFlowError('Mnemonic must be 12 or 24 words.');
      setShowErrorDialog(true);
      return;
    }
    const policy = passcodePolicy(walletPassword);
    if (policy) {
      setFlowError(policy);
      setShowErrorDialog(true);
      return;
    }
    if (walletPassword !== walletPasswordConfirm) {
      setFlowError('Passcodes do not match.');
      setShowErrorDialog(true);
      return;
    }
    setIsSubmitting(true);
    startSlowMessage('Yeah, this might take a moment...');
    try {
      const passcode = walletPassword;
      await importWallet(phrase, passcode);
      await confirmBackup();
      setBackupMnemonic(null);
      setBackupSkipped(false);
      setMnemonicInput('');
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet imported.');
      setFlow('create-success');
      if (biometricsAvailable) {
        await saveBiometricPassword(passcode);
      }
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'import'));
      setShowErrorDialog(true);
    } finally {
      clearSlowMessage();
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    resetFlowMessages();
    const policy = passcodePolicy(unlockPassword);
    if (policy) {
      setFlowError(policy);
      setShowErrorDialog(true);
      return;
    }
    setIsSubmitting(true);
    startSlowMessage('Yeah, this might take a moment...');
    try {
      await unlock(unlockPassword);
      setFlow('menu');
      if (biometricsAvailable) {
        const existing = await getBiometricPassword({ requireAuthentication: false });
        if (!existing) {
          const confirmResult = await promptBiometric('Enable biometric unlock');
          if (confirmResult.success) {
            await saveBiometricPassword(unlockPassword);
          }
        }
      }
      setUnlockPassword('');
      resetFlowMessages();
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'unlock'));
      setShowErrorDialog(true);
    } finally {
      clearSlowMessage();
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
    await confirmBackup();
    setBackupMnemonic(null);
    setBackupSkipped(false);
    setFlowMessage('Recovery phrase confirmed.');
    setFlow('create-success');
    setIsSubmitting(false);
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
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishSetup = () => {
    resetFlowMessages();
    setBackupMnemonic(null);
    setBackupSkipped(false);
    setFlow('menu');
  };

  const startSlowMessage = (text: string) => {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      setFlowMessage((prev) => prev ?? text);
    }, 5000);
  };

  const clearSlowMessage = () => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  };

  useEffect(() => {
    canUseBiometrics().then(setBiometricsAvailable).catch(() => setBiometricsAvailable(false));
  }, []);

  const executeStartFresh = async () => {
    if (isSubmitting) return;
    resetInFlightRef.current = true;
    setIsSubmitting(true);
    clearSlowMessage();
    resetFlowMessages();
    setFlowError(null);
    setShowErrorDialog(false);
    try {
      await Promise.allSettled([authSignOut(), clearProfileSettings(), clearRewardsCache()]);
      await forgetWallet();
      setFlow('menu');
      setUnlockPassword('');
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setMnemonicInput('');
      setBackupMnemonic(null);
      setBackupAcknowledged(false);
      setBackupSkipped(false);
      setConfirmWord1('');
      setConfirmWord2('');
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'unlock'));
      setShowErrorDialog(true);
    } finally {
      resetInFlightRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleStartFresh = () => {
    Alert.alert(
      'Delete local data?',
      'This will remove all wallets and local account data from this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void executeStartFresh() },
      ],
    );
  };

  if (status !== 'unlocked' || backupMnemonic) {
    return (
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        <ErrorDialog
          visible={!!flowError && showErrorDialog}
          title="Wallet error"
          message={flowError ?? ''}
          onClose={() => {
            setShowErrorDialog(false);
            setFlowError(null);
          }}
        />
        <WalletSetupScreen
          flow={flow as any}
          status={status}
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
          onUnlock={handleUnlock}
          onStartFresh={handleStartFresh}
          showStartFresh={appFeatures.showStartFreshOnLockScreen}
          onConfirmBackup={handleConfirmBackup}
          onBackToMenu={() => {
            resetFlowMessages();
            setFlow('menu');
          }}
          onGoCreate={() => {
            resetFlowMessages();
            setFlow('create-passcode');
          }}
          onGoImport={() => {
            resetFlowMessages();
          }}
          onFinishSetup={handleFinishSetup}
          onSkipBackup={handleSkipBackup}
        />
      </ScrollView>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          cardStyleInterpolator: ({ current, layouts }) => ({
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          }),
        }}
      >
        <Stack.Screen name="WalletHome" component={WalletHomeScreen} />
        <Stack.Screen name="Add" component={AddScreen} />
        <Stack.Screen name="Send" component={SendScreen} />
        <Stack.Screen name="SendCrypto" component={SendCryptoScreen} />
        <Stack.Screen name="SendCryptoComplete" component={SendCryptoComplete} />
        <Stack.Screen name="Receive" component={ReceiveScreen} />
        <Stack.Screen name="QRReceive" component={QRReceiveScreen} />
        <Stack.Screen name="Swap" component={SwapScreen} />
        <Stack.Screen name="ExpressSwap" component={ExpressSwapScreen} />
        <Stack.Screen name="ExpressSwapSuccess" component={ExpressSwapSuccessScreen} />
        <Stack.Screen name="WalletCardSettings" component={WalletCardSettingsScreen} />
        <Stack.Screen name="WalletSettings" component={WalletSettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
