import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import PulseBadge from '@components/PulseBadge';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '../theme/ThemeProvider';
import { useWalletSession } from '../context/WalletSessionProvider';
import { ERC20_TOKENS } from '../config/tokens';
import { fetchNativeBalance, fetchTokenBalances } from '../services/balances';
import { CHAIN } from '../config/chain';
import WalletSetupScreen from '@components/wallet/WalletSetupScreen';
import NetworkBadge from '@components/wallet/NetworkBadge';
import { rpcErrorMessage, walletErrorMessage } from '../utils/walletErrors';
import ErrorDialog from '@components/common/ErrorDialog';
import { fetchSolBalance } from '../services/solanaBalances';
import {
  canUseBiometrics,
  getBiometricPassword,
  promptBiometric,
  saveBiometricPassword,
} from '../services/biometrics';
import AddScreen from './walletScreens/AddScreen';
import ReceiveScreen from './walletScreens/ReceiveScreen';
import SendScreen from './walletScreens/SendScreen';
import SwapScreen from './walletScreens/SwapScreen';
import SendCryptoScreen from './walletScreens/SendCryptoScreen';
import SendCryptoComplete from './walletScreens/SendCryptoComplete';
import QRReceiveScreen from './walletScreens/QRReceiveScreen';

type WalletStackParamList = {
  WalletHome: undefined;
  Add: undefined;
  Send: undefined;
  Receive: { address: string };
  Swap: undefined;
  SendCrypto: { symbol: string; name: string; balance: string };
  SendCryptoComplete: { symbol: string };
  QRReceive: { symbol: string; name: string; address: string };
};

type WalletAction = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  screen: keyof WalletStackParamList;
};

type TokenBalance = {
  name: string;
  symbol: string;
  amount: number;
  pair?: string;
  color: string;
  fixedPrice?: number;
};

const walletActions: WalletAction[] = [
  { label: 'Add', icon: 'plus-circle', screen: 'Add' },
  { label: 'Send', icon: 'send', screen: 'Send' },
  { label: 'Receive', icon: 'qrcode-scan', screen: 'Receive' },
  { label: 'Swap', icon: 'swap-horizontal', screen: 'Swap' },
];

const defaultTokens: TokenBalance[] = [
  {
    name: CHAIN.nativeToken.name,
    symbol: CHAIN.nativeToken.symbol,
    amount: 0,
    pair: CHAIN.nativeToken.priceSymbol,
    color: CHAIN.nativeToken.color,
  },
  ...(CHAIN.kind === 'ethereum'
    ? ERC20_TOKENS.map<TokenBalance>((t) => ({
        name: t.name,
        symbol: t.symbol,
        amount: 0,
        pair: t.priceSymbol,
        color: t.symbol === 'USDC' ? '#0ea5e9' : '#f59e0b',
      }))
    : []),
];

const Stack = createStackNavigator<WalletStackParamList>();

function WalletHomeScreen({ navigation }: { navigation: StackNavigationProp<WalletStackParamList, 'WalletHome'> }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const { status, address } = useWalletSession();

  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [chainTokens, setChainTokens] = useState<TokenBalance[]>(defaultTokens);
  const [fetchingChain, setFetchingChain] = useState(false);

  const totalValueAnimated = useRef(new Animated.Value(0)).current;
  const [displayTotal, setDisplayTotal] = useState(0);

  const trackedPairs = useMemo(() => chainTokens.filter((t) => t.pair).map((t) => t.pair as string), [chainTokens]);

  const formatCurrency = (value: number) => {
    if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
      return Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    }
    const rounded = Math.round(value * 100) / 100;
    return `$${rounded.toFixed(2)}`;
  };

  const fetchPrices = async () => {
    if (trackedPairs.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(
        JSON.stringify(trackedPairs),
      )}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance status ${response.status}`);
      }
      const data: { symbol: string; price: string }[] = await response.json();
      const next: Record<string, number> = {};
      data.forEach((item) => {
        next[item.symbol] = Number(item.price);
      });
      setPrices(next);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError('Unable to load live prices right now.');
    } finally {
      setLoading(false);
    }
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
    if (status !== 'unlocked') return;
    fetchPrices();
    const interval = setInterval(fetchPrices, 1_000);
    return () => clearInterval(interval);
  }, [status, trackedPairs]);

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
    const loadOnChain = async () => {
      if (status !== 'unlocked' || !address) return;
      setFetchingChain(true);
      try {
        if (CHAIN.kind === 'solana') {
          const native = await fetchSolBalance(address);
          const nextTokens: TokenBalance[] = defaultTokens.map((token) =>
            token.symbol === CHAIN.nativeToken.symbol ? { ...token, amount: Number(native) } : token,
          );
          setChainTokens(nextTokens);
        } else {
          const [native, erc20] = await Promise.all([
            fetchNativeBalance(address),
            fetchTokenBalances(address, ERC20_TOKENS),
          ]);
          const nextTokens: TokenBalance[] = defaultTokens.map((token) => {
            if (token.symbol === CHAIN.nativeToken.symbol) {
              return { ...token, amount: Number(native) };
            }
            const match = erc20[token.symbol];
            return { ...token, amount: match ? Number(match) : 0 };
          });
          setChainTokens(nextTokens);
        }
        setRpcError(null);
      } catch (error) {
        const rpcMessage = rpcErrorMessage(error);
        setRpcError(rpcMessage ?? 'Unable to load on-chain balances.');
      } finally {
        setFetchingChain(false);
      }
    };
    loadOnChain();
  }, [status, address]);

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Wallet</Text>
          <Text style={styles.headerSubtitle}>On-chain balances with live pricing.</Text>
        </View>
        <View style={styles.headerPills}>
          <NetworkBadge />
          <View style={styles.statusPill}>
            <PulseBadge size={8} color={fetchingChain ? '#f97316' : '#22c55e'} durationMs={1400} />
            <Text style={styles.statusText}>{fetchingChain ? 'Syncing' : 'Live'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardWrapper}>
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.pill}>Primary</Text>
            <Text style={styles.walletTitle}>Main Wallet</Text>
          </View>
          <Text style={styles.balanceLabel}>Total value</Text>
          <Text style={styles.balance}>{formatCurrency(displayTotal)}</Text>
          {address && <Text style={styles.addressText}>{address}</Text>}

          <View style={styles.actionsRow}>
            {walletActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionButton}
                activeOpacity={0.7}
                onPress={() => {
                  if (action.screen === 'Receive' && address) {
                    navigation.navigate('Receive', { address });
                  } else {
                    navigation.navigate(action.screen as any);
                  }
                }}
              >
                <View style={styles.actionIcon}>
                  <MaterialCommunityIcons name={action.icon} size={22} color="#ffffff" />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} style={styles.searchIcon} />
        <TextInput 
          placeholder="Search tokens..." 
          placeholderTextColor={colors.muted}
          style={styles.searchInput} 
        />
        <MaterialCommunityIcons name="link-variant" size={20} color={colors.muted} style={styles.searchIcon} />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Prices: {lastUpdated ? `Updated ${lastUpdated}` : 'Loading...'}</Text>
        </View>
      )}
      {rpcError && <Text style={styles.errorText}>{rpcError}</Text>}

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBase, styles.tabActive]}>
          <Text style={styles.tabActiveText}>Tokens</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBase, styles.tabInactive]}>
          <Text style={styles.tabInactiveText}>NFTs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBase, styles.tabInactive]}>
          <Text style={styles.tabInactiveText}>Activity</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        {chainTokens.map((token, index) => (
          <View key={token.symbol} style={[styles.tokenRow, index !== chainTokens.length - 1 && styles.tokenRowSpacing]}>
            <View style={[styles.tokenIcon, { backgroundColor: `${token.color}22`, borderColor: token.color }]}>
              <Ionicons name="ellipse" size={16} color={token.color} />
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenName}>{token.name}</Text>
              <Text style={styles.tokenSymbol}>{token.symbol}</Text>
            </View>
            <View style={styles.tokenAmounts}>
              <Text style={styles.tokenBalance}>
                {token.amount.toFixed(token.amount < 1 ? 6 : 4)} {token.symbol}
              </Text>
              <Text style={styles.tokenValue}>
                {(() => {
                  const livePrice =
                    token.pair && typeof prices[token.pair] === 'number'
                      ? prices[token.pair]
                      : token.fixedPrice !== undefined
                      ? token.fixedPrice
                      : undefined;
                  if (typeof livePrice !== 'number') return loading ? 'Updating prices...' : '-';
                  return formatCurrency(livePrice * token.amount);
                })()}
              </Text>
            </View>
          </View>
        ))}
      </View>
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
    recoveryPhrase,
    backupCompleted,
    unlock,
    createWallet,
    importWallet,
    confirmBackup,
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

      biometricInFlightRef.current = true;
      setIsSubmitting(true);
      startSlowMessage('Yeah, this might take a moment...');
      try {
        const canUse = await canUseBiometrics();
        if (!canUse || cancelled) return;
        const stored = await getBiometricPassword();
        if (!stored || cancelled) return;
        await animatePasscodeUnlock(stored);
        await unlock(stored);
        if (!cancelled) {
          setFlow('menu');
          setUnlockPassword('');
        }
      } catch {
        // Silent fail
      } finally {
        biometricInFlightRef.current = false;
        clearSlowMessage();
        setIsSubmitting(false);
      }
    };

    tryBiometricUnlock();
    
    return () => {
      cancelled = true;
    };
  }, [status, unlock]);

  useEffect(() => {
    if (status !== 'unlocked' || backupCompleted || backupMnemonic) return;
    if (!recoveryPhrase) return;
    startBackupConfirm(normalizeMnemonic(recoveryPhrase));
  }, [status, backupCompleted, backupMnemonic, recoveryPhrase]);

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
    resetFlowMessages();
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
      const { mnemonic } = await createWallet(passcode);
      const normalized = normalizeMnemonic(mnemonic);
      setBackupSkipped(false);
      startBackupConfirm(normalized);
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet created. Back up your recovery phrase.');
      if (biometricsAvailable) {
        await saveBiometricPassword(passcode);
      }
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'create'));
      setShowErrorDialog(true);
    } finally {
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}
