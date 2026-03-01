import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useChain } from '@context/ChainProvider';
import { useWalletSession } from '@context/WalletSessionProvider';
import { ERC20_TOKENS } from '@config/tokens';
import { fetchNativeBalance, fetchTokenBalances } from '@services/balances';
import { fetchSolBalance } from '@services/solanaBalances';
import type { ChainConfig } from '@config/chain';

type WalletStackParamList = {
  WalletHome: undefined;
  Add: undefined;
  Send: undefined;
  Receive: { address: string };
  Swap: undefined;
  SendCrypto: { symbol: string; name: string; balance: string };
};

export default function SendScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const [search, setSearch] = useState('');
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'Send'>>();
  const { chain } = useChain();
  const { status, address } = useWalletSession();
  const [coins, setCoins] = useState(() => buildDefaultTokens(chain));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const history = ['ETH', 'XRP', 'SOL', 'DODGE'];
  const filteredCoins = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return coins;
    return coins.filter((coin) => {
      const symbol = coin.symbol.toLowerCase();
      const name = coin.name.toLowerCase();
      return symbol.includes(query) || name.includes(query);
    });
  }, [coins, search]);

  useEffect(() => {
    setCoins(buildDefaultTokens(chain));
  }, [chain]);

  useEffect(() => {
    const loadBalances = async () => {
      if (status !== 'unlocked' || !address) return;
      setLoading(true);
      setError(null);
      try {
        if (chain.kind === 'solana') {
          const native = await fetchSolBalance(address);
          setCoins((prev) =>
            prev.map((token) =>
              token.symbol === chain.nativeToken.symbol ? { ...token, amount: Number(native) } : token,
            ),
          );
        } else {
          const [native, erc20] = await Promise.all([
            fetchNativeBalance(address),
            fetchTokenBalances(address, ERC20_TOKENS),
          ]);
          setCoins((prev) =>
            prev.map((token) => {
              if (token.symbol === chain.nativeToken.symbol) {
                return { ...token, amount: Number(native) };
              }
              const match = erc20[token.symbol];
              return { ...token, amount: match ? Number(match) : 0 };
            }),
          );
        }
      } catch {
        setError('Unable to load balances right now.');
      } finally {
        setLoading(false);
      }
    };

    loadBalances();
  }, [status, address, chain]);

  const formatAmount = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    if (value >= 1) {
      return value.toLocaleString('en-US', { maximumFractionDigits: 4 });
    }
    return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
  };

  return (
    <View style={localStyles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        <Text style={styles.headerTitle}>Send</Text>
        <Text style={styles.headerSubtitle}>Pick a coin to send from your wallet.</Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <TextInput
            placeholder="Search Coins"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="copy-outline" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={localStyles.sectionRow}>
          <Text style={[localStyles.sectionTitle, { color: colors.text }]}>Search History</Text>
          <TouchableOpacity activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>
        <View style={localStyles.chipRow}>
          {history.map((item) => (
            <View key={item} style={[localStyles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[localStyles.chipText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={[localStyles.sectionTitle, { color: colors.text, marginTop: 16 }]}>Coin List</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}
        <View style={styles.listCard}>
          {filteredCoins.map((coin, index) => (
            <TouchableOpacity
              key={coin.symbol}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('SendCrypto', {
                  symbol: coin.symbol,
                  name: coin.name,
                  balance: formatAmount(coin.amount),
                })
              }
              style={[styles.tokenRow, index !== filteredCoins.length - 1 && styles.tokenRowSpacing]}
            >
              <View style={[styles.tokenIcon, { backgroundColor: `${coin.color}22`, borderColor: coin.color }]}>
                <Text style={[localStyles.tokenIconText, { color: coin.color }]}>{coin.symbol[0]}</Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>{coin.symbol}</Text>
                <Text style={styles.tokenSymbol}>{coin.name}</Text>
              </View>
              <View style={styles.tokenAmounts}>
                <Text style={styles.tokenBalance}>{formatAmount(coin.amount)}</Text>
                <Text style={styles.tokenValue}>{loading ? 'Loading...' : 'On-chain balance'}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {!filteredCoins.length && (
            <View style={styles.tokenRow}>
              <Text style={styles.tokenSymbol}>No matching coins found.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

type TokenBalance = {
  name: string;
  symbol: string;
  amount: number;
  color: string;
};

const buildDefaultTokens = (chain: ChainConfig): TokenBalance[] => [
  {
    name: chain.nativeToken.name,
    symbol: chain.nativeToken.symbol,
    amount: 0,
    color: chain.nativeToken.color,
  },
  ...(chain.kind === 'ethereum'
    ? ERC20_TOKENS.map<TokenBalance>((token) => ({
        name: token.name,
        symbol: token.symbol,
        amount: 0,
        color: token.symbol === 'USDC' ? '#0ea5e9' : '#f59e0b',
      }))
    : []),
];

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tokenIconText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
