import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated as RNAnimated, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '../components/PulseBadge';
import { walletStyles as styles } from '../styles/WalletStyles';
import { useTheme } from '../theme/ThemeProvider';
import { useWalletSession } from '../context/WalletSessionProvider';
import { ERC20_TOKENS } from '../config/tokens';
import { fetchNativeBalance, fetchTokenBalances } from '../services/balances';

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
  const { status, address, unlock, createWallet, importWallet, backupCompleted, confirmBackup, lock } =
    useWalletSession();

  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [chainTokens, setChainTokens] = useState<TokenBalance[]>(defaultTokens);
  const [flow, setFlow] = useState<'menu' | 'create' | 'import' | 'unlock' | 'backup'>('menu');
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
    } catch (err) {
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
      } catch (e) {
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
    try {
      const { mnemonic } = await createWallet(walletPassword);
      const normalized = normalizeMnemonic(mnemonic);
      startBackupConfirm(normalized);
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet created. Back up your seed phrase.');
    } catch (e) {
      setFlowError('Unable to create wallet.');
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
    try {
      await importWallet(phrase, walletPassword);
      startBackupConfirm(phrase);
      setMnemonicInput('');
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet imported. Back up your seed phrase.');
    } catch (e) {
      setFlowError('Unable to import wallet. Check phrase and try again.');
    }
  };

  const handleUnlock = async () => {
    resetFlowMessages();
    try {
      await unlock(unlockPassword);
      setFlowMessage('Wallet unlocked.');
      setUnlockPassword('');
    } catch (e) {
      setFlowError('Incorrect password.');
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
    await confirmBackup();
    setBackupMnemonic(null);
    setFlowMessage('Seed phrase confirmed.');
    setFlow('menu');
  };

  const renderSetup = () => {
    if (status === 'loading') {
      return (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Checking wallet...</Text>
        </View>
      );
    }

    if (flow === 'backup' && backupMnemonic) {
      const words = backupMnemonic.split(' ');
      const [i1, i2] = confirmIndices;
      return (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Back up your seed phrase</Text>
          <Text style={styles.setupSubtitle}>Write these words down in order. Do not screenshot.</Text>
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
            onPress={() => setBackupAcknowledged((v) => !v)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={backupAcknowledged ? 'checkbox-outline' : 'square-outline'}
              size={20}
              color={backupAcknowledged ? '#16a34a' : '#1f2937'}
            />
            <Text style={styles.checkboxLabel}>I wrote it down safely.</Text>
          </TouchableOpacity>
          <Text style={styles.setupSubtitle}>Confirm words #{i1 + 1} and #{i2 + 1}</Text>
          <TextInput
            value={confirmWord1}
            onChangeText={setConfirmWord1}
            placeholder={`Word ${i1 + 1}`}
            placeholderTextColor="#94a3b8"
            style={styles.input}
            autoCapitalize="none"
          />
          <TextInput
            value={confirmWord2}
            onChangeText={setConfirmWord2}
            placeholder={`Word ${i2 + 1}`}
            placeholderTextColor="#94a3b8"
            style={styles.input}
            autoCapitalize="none"
          />
          {flowError && <Text style={styles.errorText}>{flowError}</Text>}
          {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmBackup} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>I’ve backed this up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => lock()} activeOpacity={0.9}>
            <Text style={styles.secondaryButtonText}>Lock wallet</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'missing') {
      return (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Set up your wallet</Text>
          <Text style={styles.setupSubtitle}>Create a new wallet or import with a 12/24-word phrase.</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setFlow('create')} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Create wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setFlow('import')} activeOpacity={0.9}>
            <Text style={styles.secondaryButtonText}>Import wallet</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (flow === 'create') {
      return (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Create wallet</Text>
          <TextInput
            value={walletPassword}
            onChangeText={setWalletPassword}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
          />
          <TextInput
            value={walletPasswordConfirm}
            onChangeText={setWalletPasswordConfirm}
            placeholder="Confirm password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
          />
          {flowError && <Text style={styles.errorText}>{flowError}</Text>}
          {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreate} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Create</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setFlow('menu')} activeOpacity={0.9}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (flow === 'import') {
      return (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Import wallet</Text>
          <TextInput
            value={mnemonicInput}
            onChangeText={setMnemonicInput}
            placeholder="12 or 24 word phrase"
            placeholderTextColor="#94a3b8"
            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
            multiline
            autoCapitalize="none"
          />
          <TextInput
            value={walletPassword}
            onChangeText={setWalletPassword}
            placeholder="New password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
          />
          <TextInput
            value={walletPasswordConfirm}
            onChangeText={setWalletPasswordConfirm}
            placeholder="Confirm password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
          />
          {flowError && <Text style={styles.errorText}>{flowError}</Text>}
          {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={handleImport} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setFlow('menu')} activeOpacity={0.9}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'locked') {
      return (
        <View style={styles.setupCard}>
          <Text style={styles.setupTitle}>Unlock wallet</Text>
          <TextInput
            value={unlockPassword}
            onChangeText={setUnlockPassword}
            placeholder="Password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
          />
          {flowError && <Text style={styles.errorText}>{flowError}</Text>}
          {flowMessage && <Text style={styles.successText}>{flowMessage}</Text>}
          <TouchableOpacity style={styles.primaryButton} onPress={handleUnlock} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Unlock</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setFlow('menu')} activeOpacity={0.9}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  if (status !== 'unlocked' || backupMnemonic) {
    return (
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        {renderSetup()}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
      <View style={styles.deviceCutout} />

      <View style={styles.cardWrapper}>
        <View style={styles.sideAccentLeft} />
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.pill}>Main</Text>
            <Text style={styles.walletTitle}>Main Wallet</Text>
          </View>
          <Text style={styles.balance}>{formatCurrency(displayTotal)}</Text>
          {address && <Text style={styles.metaText}>Address: {address}</Text>}

          <View style={styles.actionsRow}>
            {actions.map((action) => (
              <TouchableOpacity key={action.label} style={styles.actionButton} activeOpacity={0.85}>
                <View style={styles.actionIcon}>
                  <MaterialCommunityIcons name={action.icon} size={26} color="#4f46e5" />
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
          <PulseBadge size={10} color={fetchingChain ? '#f97316' : '#22c55e'} durationMs={1400} />
          <Text style={styles.metaText}>{fetchingChain ? 'Syncing on-chain balances...' : 'Real-time prices'}</Text>
          {lastUpdated && <Text style={styles.metaText}>- Updated {lastUpdated}</Text>}
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
              <Text style={styles.tokenBalance}>{token.amount.toFixed(token.amount < 1 ? 6 : 4)} {token.symbol}</Text>
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
