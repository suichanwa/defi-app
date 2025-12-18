import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated as RNAnimated, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { ethers } from 'ethers';
import PulseBadge from '../components/PulseBadge';
import { walletStyles as styles } from '../styles/WalletStyles';
import { useTheme } from '../theme/ThemeProvider';
import { useWalletSession } from '../context/WalletSessionProvider';
import { ERC20_TOKENS } from '../config/tokens';
import { fetchNativeBalance, fetchTokenBalances } from '../services/balances';
import { CHAIN } from '../config/chain';
import { getProvider } from '../services/provider';
import WalletSetupScreen from '../components/wallet/WalletSetupScreen';
import ReceiveScreen from '../components/wallet/ReceiveScreen';
import SendScreen from '../components/wallet/SendScreen';

type Action = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

type TokenBalance = {
  name: string;
  symbol: string;
  amount: number;
  pair?: string;
  color: string;
  fixedPrice?: number;
};

const actions: Action[] = [
  { label: 'Receive', icon: 'qrcode-scan' },
  { label: 'Send', icon: 'send' },
];

const defaultTokens: TokenBalance[] = [
  { name: 'Ethereum', symbol: 'ETH', amount: 0, pair: 'ETHUSDT', color: '#6b8cef' },
  ...ERC20_TOKENS.map<TokenBalance>((t) => ({
    name: t.name,
    symbol: t.symbol,
    amount: 0,
    pair: t.priceSymbol,
    color: t.symbol === 'USDC' ? '#0ea5e9' : '#f59e0b',
  })),
];

export default function WalletScreen() {
  const { colors } = useTheme();
  const { status, address, wallet, unlock, createWallet, importWallet, backupCompleted, confirmBackup, lock } =
    useWalletSession();

  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [chainTokens, setChainTokens] = useState<TokenBalance[]>(defaultTokens);
  const [flow, setFlow] = useState<'menu' | 'create' | 'import' | 'unlock' | 'backup' | 'receive' | 'send'>('menu');
  const [walletPassword, setWalletPassword] = useState('');
  const [walletPasswordConfirm, setWalletPasswordConfirm] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [backupMnemonic, setBackupMnemonic] = useState<string | null>(null);
  const [backupAcknowledged, setBackupAcknowledged] = useState(false);
  const [confirmWord1, setConfirmWord1] = useState('');
  const [confirmWord2, setConfirmWord2] = useState('');
  const [confirmIndices, setConfirmIndices] = useState<[number, number]>([1, 5]);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [fetchingChain, setFetchingChain] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendStep, setSendStep] = useState<'form' | 'confirm' | 'pending'>('form');
  const [sendFeeEth, setSendFeeEth] = useState<string | null>(null);
  const [sendTxHash, setSendTxHash] = useState<string | null>(null);

  const totalValueAnimated = useRef(new RNAnimated.Value(0)).current;
  const [displayTotal, setDisplayTotal] = useState(0);

  const trackedPairs = useMemo(() => chainTokens.filter((t) => t.pair).map((t) => t.pair as string), [chainTokens]);

  const formatCurrency = (value: number) =>
    Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);

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
          : token.symbol === 'ETH'
          ? typeof prices['ETHUSDT'] === 'number'
            ? prices['ETHUSDT']
            : undefined
          : undefined;
      if (typeof livePrice !== 'number') return sum;
      return sum + livePrice * token.amount;
    }, 0);
  }, [prices, chainTokens]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 1_000);
    return () => clearInterval(interval);
  }, [trackedPairs]);

  useEffect(() => {
    totalValueAnimated.setValue(totalValueUSD);
    const id = totalValueAnimated.addListener(({ value }) => setDisplayTotal(value));
    return () => totalValueAnimated.removeListener(id);
  }, [totalValueAnimated, totalValueUSD]);

  useEffect(() => {
    RNAnimated.timing(totalValueAnimated, {
      toValue: totalValueUSD,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [totalValueUSD, totalValueAnimated]);

  useEffect(() => {
    if (status === 'missing') {
      setFlow('menu');
    } else if (status === 'locked') {
      setFlow('unlock');
    } else if (status === 'unlocked' && !backupCompleted && !backupMnemonic) {
      setFlow((prev) => (prev === 'backup' ? prev : 'menu'));
    }
  }, [status, backupCompleted, backupMnemonic]);

  useEffect(() => {
    const loadOnChain = async () => {
      if (status !== 'unlocked' || !address) return;
      setFetchingChain(true);
      try {
        const [native, erc20] = await Promise.all([
          fetchNativeBalance(address),
          fetchTokenBalances(address, ERC20_TOKENS),
        ]);
        const nextTokens: TokenBalance[] = defaultTokens.map((token) => {
          if (token.symbol === 'ETH') {
            return { ...token, amount: Number(native) };
          }
          const match = erc20[token.symbol];
          return { ...token, amount: match ? Number(match) : 0 };
        });
        setChainTokens(nextTokens);
      } catch {
        setFlowError('Unable to load on-chain balances.');
      } finally {
        setFetchingChain(false);
      }
    };
    loadOnChain();
  }, [status, address]);

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

  const passwordPolicy = (value: string) => {
    if (!value || value.length < 8) return 'Password must be at least 8 characters.';
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
    setConfirmWord1('');
    setConfirmWord2('');
    setFlow('backup');
  };

  const handleCreate = async () => {
    resetFlowMessages();
    const policy = passwordPolicy(walletPassword);
    if (policy) {
      setFlowError(policy);
      return;
    }
    if (walletPassword !== walletPasswordConfirm) {
      setFlowError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { mnemonic } = await createWallet(walletPassword);
      const normalized = normalizeMnemonic(mnemonic);
      startBackupConfirm(normalized);
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet created. Back up your seed phrase.');
    } catch {
      setFlowError('Unable to create wallet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImport = async () => {
    resetFlowMessages();
    const phrase = normalizeMnemonic(mnemonicInput);
    const words = phrase.split(' ');
    if (![12, 24].includes(words.length)) {
      setFlowError('Mnemonic must be 12 or 24 words.');
      return;
    }
    const policy = passwordPolicy(walletPassword);
    if (policy) {
      setFlowError(policy);
      return;
    }
    if (walletPassword !== walletPasswordConfirm) {
      setFlowError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await importWallet(phrase, walletPassword);
      startBackupConfirm(phrase);
      setMnemonicInput('');
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet imported. Back up your seed phrase.');
    } catch {
      setFlowError('Unable to import wallet. Check phrase and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    resetFlowMessages();
    setIsSubmitting(true);
    try {
      await unlock(unlockPassword);
      setFlowMessage('Wallet unlocked.');
      setUnlockPassword('');
    } catch {
      setFlowError('Incorrect password.');
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
    await confirmBackup();
    setBackupMnemonic(null);
    setFlowMessage('Seed phrase confirmed.');
    setFlow('menu');
    setIsSubmitting(false);
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setFlowMessage('Address copied.');
  };

  const handleShareAddress = async () => {
    if (!address) return;
    await Share.share({
      message: `My ${CHAIN.name} address:\n${address}`,
    });
  };

  const handlePrepareSend = async () => {
    resetFlowMessages();
    setSendFeeEth(null);
    setSendTxHash(null);
    if (!wallet || !address) {
      setFlowError('Unlock your wallet first.');
      return;
    }
    if (!ethers.utils.isAddress(sendTo.trim())) {
      setFlowError('Enter a valid recipient address.');
      return;
    }
    if (!sendAmount || Number(sendAmount) <= 0) {
      setFlowError('Enter a valid amount.');
      return;
    }
    setIsSubmitting(true);
    try {
      const provider = getProvider();
      const value = ethers.utils.parseEther(sendAmount);
      const gasLimit = await provider.estimateGas({ to: sendTo.trim(), value, from: address });
      const feeData = await provider.getFeeData();
      const feePerGas = feeData.maxFeePerGas ?? feeData.gasPrice;
      if (!feePerGas) {
        setFlowError('Unable to estimate network fee.');
        return;
      }
      const fee = gasLimit.mul(feePerGas);
      setSendFeeEth(ethers.utils.formatEther(fee));
      setSendStep('confirm');
    } catch {
      setFlowError('Unable to estimate fees. Check the address and amount.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async () => {
    resetFlowMessages();
    if (!wallet || !address) {
      setFlowError('Unlock your wallet first.');
      return;
    }
    setIsSubmitting(true);
    setSendStep('pending');
    try {
      const provider = getProvider();
      const value = ethers.utils.parseEther(sendAmount);
      const feeData = await provider.getFeeData();
      const tx = {
        to: sendTo.trim(),
        value,
        maxFeePerGas: feeData.maxFeePerGas ?? undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
        gasPrice: feeData.maxFeePerGas ? undefined : feeData.gasPrice ?? undefined,
      };
      const signed = await wallet.connect(provider).sendTransaction(tx);
      setSendTxHash(signed.hash);
      setFlowMessage('Transaction sent. Waiting for confirmation...');
      await provider.waitForTransaction(signed.hash);
      setFlowMessage('Transaction confirmed.');
      setSendStep('form');
      setSendTo('');
      setSendAmount('');
      setFlow('menu');
    } catch {
      setFlowError('Transaction failed. Please try again.');
      setSendStep('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== 'unlocked' || backupMnemonic || flow === 'receive' || flow === 'send') {
    return (
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        {flow === 'receive' ? (
          <ReceiveScreen
            chainName={CHAIN.name}
            address={address}
            flowMessage={flowMessage}
            onCopy={handleCopyAddress}
            onShare={handleShareAddress}
            onBack={() => setFlow('menu')}
          />
        ) : flow === 'send' ? (
          <SendScreen
            chainName={CHAIN.name}
            sendTo={sendTo}
            sendAmount={sendAmount}
            sendFeeEth={sendFeeEth}
            sendStep={sendStep}
            isSubmitting={isSubmitting}
            flowError={flowError}
            flowMessage={flowMessage}
            onChangeTo={setSendTo}
            onChangeAmount={setSendAmount}
            onReview={handlePrepareSend}
            onSend={handleSend}
            onEdit={() => setSendStep('form')}
            onBack={() => setFlow('menu')}
          />
        ) : (
          <WalletSetupScreen
            flow={flow}
            status={status}
            walletPassword={walletPassword}
            walletPasswordConfirm={walletPasswordConfirm}
            unlockPassword={unlockPassword}
            mnemonicInput={mnemonicInput}
            backupMnemonic={backupMnemonic}
            backupAcknowledged={backupAcknowledged}
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
            onBackToMenu={() => setFlow('menu')}
            onGoCreate={() => {
              resetFlowMessages();
              setFlow('create');
            }}
            onGoImport={() => {
              resetFlowMessages();
              setFlow('import');
            }}
            onLock={lock}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Wallet</Text>
          <Text style={styles.headerSubtitle}>On-chain balances with live pricing.</Text>
        </View>
        <View style={styles.statusPill}>
          <PulseBadge size={8} color={fetchingChain ? '#f97316' : '#22c55e'} durationMs={1400} />
          <Text style={styles.statusText}>{fetchingChain ? 'Syncing' : 'Live'}</Text>
        </View>
      </View>

      <View style={styles.cardWrapper}>
        <View style={styles.sideAccentLeft} />
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.pill}>Primary</Text>
            <Text style={styles.walletTitle}>Main Wallet</Text>
          </View>
          <Text style={styles.balanceLabel}>Total value</Text>
          <Text style={styles.balance}>{formatCurrency(displayTotal)}</Text>
          {address && <Text style={styles.addressText}>{address}</Text>}

          <View style={styles.actionsRow}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionButton}
                activeOpacity={0.85}
                onPress={() => {
                  if (action.label === 'Receive') {
                    setFlow('receive');
                    setFlowMessage(null);
                  }
                  if (action.label === 'Send') {
                    resetFlowMessages();
                    setSendStep('form');
                    setFlow('send');
                  }
                }}
              >
                <View style={styles.actionIcon}>
                  <MaterialCommunityIcons name={action.icon} size={20} color="#111827" />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.sideAccentRight} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput placeholder="Search" placeholderTextColor="#9ca3af" style={styles.searchInput} />
        <MaterialCommunityIcons name="link-variant" size={22} color="#111827" style={styles.searchIcon} />
        <MaterialCommunityIcons name="magnify" size={22} color="#111827" style={styles.searchIcon} />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Prices: {lastUpdated ? `Updated ${lastUpdated}` : 'Loading...'}</Text>
        </View>
      )}

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBase, styles.tabActive, styles.tabSpacing]}>
          <Text style={styles.tabActiveText}>Tokens</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBase, styles.tabInactive, styles.tabSpacing]}>
          <Text style={styles.tabInactiveText}>NFT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBase, styles.tabInactive]}>
          <Text style={styles.tabInactiveText}>More</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        {chainTokens.map((token, index) => (
          <View key={token.symbol} style={[styles.tokenRow, index !== chainTokens.length - 1 && styles.tokenRowSpacing]}>
            <View style={[styles.tokenIcon, { backgroundColor: `${token.color}22`, borderColor: token.color }]}>
              <Ionicons name="ellipse" size={14} color={token.color} />
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
                      : token.symbol === 'ETH' && typeof prices['ETHUSDT'] === 'number'
                      ? prices['ETHUSDT']
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
