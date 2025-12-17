import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, Animated as RNAnimated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '../components/PulseBadge';
import { walletStyles as styles } from '../styles/WalletStyles';

type Action = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

type Token = {
  name: string;
  symbol: string;
  amount: number;
  pair?: string;
  color: string;
  fixedPrice?: number;
};

const actions: Action[] = [
  { label: 'Buy', icon: 'plus' },
  { label: 'Send', icon: 'send' },
  { label: 'Receive', icon: 'qrcode-scan' },
  { label: 'Swap', icon: 'swap-horizontal' },
];

const tokens: Token[] = [
  { name: 'Bitcoin', symbol: 'BTC', amount: 0.42, pair: 'BTCUSDT', color: '#f7931a' },
  { name: 'Ethereum', symbol: 'ETH', amount: 2.35, pair: 'ETHUSDT', color: '#6b8cef' },
  { name: 'Binance', symbol: 'BNB', amount: 5.1, pair: 'BNBUSDT', color: '#f3ba2f' },
  { name: 'XRP', symbol: 'XRP', amount: 2200, pair: 'XRPUSDT', color: '#4c4c4c' },
  { name: 'Tether', symbol: 'USDT', amount: 1800, color: '#26a17b', fixedPrice: 1 },
];

export default function WalletScreen() {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const totalValueAnimated = useRef(new RNAnimated.Value(0)).current;
  const [displayTotal, setDisplayTotal] = useState(0);

  const trackedPairs = useMemo(
    () => tokens.filter((t) => t.pair).map((t) => t.pair as string),
    [],
  );

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

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 1_000);
    return () => clearInterval(interval);
  }, []);

  const totalValueUSD = useMemo(() => {
    return tokens.reduce((sum, token) => {
      const livePrice =
        token.pair && typeof prices[token.pair] === 'number'
          ? prices[token.pair]
          : token.fixedPrice !== undefined
          ? token.fixedPrice
          : undefined;
      if (typeof livePrice !== 'number') return sum;
      return sum + livePrice * token.amount;
    }, 0);
  }, [prices]);

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

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.deviceCutout} />

      <View style={styles.cardWrapper}>
        <View style={styles.sideAccentLeft} />
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.pill}>Main</Text>
            <Text style={styles.walletTitle}>Main Wallet</Text>
          </View>
          <Text style={styles.balance}>{formatCurrency(displayTotal)}</Text>

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
          <PulseBadge size={10} color="#22c55e" durationMs={1400} />
          <Text style={styles.metaText}>{loading ? 'Updating prices...' : 'Real-time prices'}</Text>
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
        {tokens.map((token, index) => (
          <View key={token.symbol} style={[styles.tokenRow, index !== tokens.length - 1 && styles.tokenRowSpacing]}>
            <View style={[styles.tokenIcon, { backgroundColor: `${token.color}22`, borderColor: token.color }]}>
              <Ionicons name="ellipse" size={14} color={token.color} />
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenName}>{token.name}</Text>
              <Text style={styles.tokenSymbol}>{token.symbol}</Text>
            </View>
            <View style={styles.tokenAmounts}>
              <Text style={styles.tokenBalance}>
                {token.amount.toFixed(token.amount < 1 ? 4 : 2)} {token.symbol}
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
