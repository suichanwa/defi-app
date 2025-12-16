import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from './src/components/PulseBadge';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'wallet' | 'profile' | 'chat'>('home');
  const [lastHomePress, setLastHomePress] = useState(0);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const chatTransition = useSharedValue(0);

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

  const handleHomePress = () => {
    const now = Date.now();
    if (now - lastHomePress < 400) {
      setActiveTab('chat');
    } else {
      setActiveTab('home');
    }
    setLastHomePress(now);
  };

  useEffect(() => {
    chatTransition.value = withTiming(activeTab === 'chat' ? 1 : 0, { duration: 280 });
  }, [activeTab, chatTransition]);

  const homeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - chatTransition.value,
    transform: [{ translateX: -12 * chatTransition.value }],
  }));

  const chatAnimatedStyle = useAnimatedStyle(() => ({
    opacity: chatTransition.value,
    transform: [{ translateX: 12 * (1 - chatTransition.value) }],
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <Animated.View
        style={[styles.screenLayer, homeAnimatedStyle]}
        pointerEvents={activeTab === 'chat' ? 'none' : 'auto'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.deviceCutout} />

          <View style={styles.cardWrapper}>
            <View style={styles.sideAccentLeft} />
            <View style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <Text style={styles.pill}>Main</Text>
                <Text style={styles.walletTitle}>Main Wallet</Text>
              </View>
              <Text style={styles.balance}>{formatCurrency(totalValueUSD)}</Text>

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
              <Text style={styles.metaText}>
                {loading
                  ? 'Updating prices...'
                  : lastUpdated
                  ? `Live prices - Updated ${lastUpdated}`
                  : 'Loading prices...'}
              </Text>
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
              <View
                key={token.symbol}
                style={[styles.tokenRow, index !== tokens.length - 1 && styles.tokenRowSpacing]}
              >
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
      </Animated.View>

      <Animated.View
        style={[styles.screenLayer, styles.chatLayer, chatAnimatedStyle]}
        pointerEvents={activeTab === 'chat' ? 'auto' : 'none'}
      >
        <View style={styles.chatContainer}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Support Chat</Text>
            <Text style={styles.chatSubtitle}>AI + concierge</Text>
          </View>
          <View style={styles.chatBubbleRemote}>
            <Text style={styles.chatBubbleTextRemote}>Hey! How can I help with your crypto today?</Text>
          </View>
          <View style={styles.chatBubbleLocal}>
            <Text style={styles.chatBubbleTextLocal}>Show me my latest transactions.</Text>
          </View>
          <View style={styles.chatInputBar}>
            <TextInput
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              style={styles.chatInput}
              editable={false}
            />
            <MaterialCommunityIcons name="send" size={22} color="#4f46e5" />
          </View>
        </View>
      </Animated.View>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, (activeTab === 'home' || activeTab === 'chat') && styles.navItemActive]}
          onPress={handleHomePress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="home-outline"
            size={26}
            color={activeTab === 'home' || activeTab === 'chat' ? '#4f46e5' : '#111827'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'wallet' && styles.navItemActive]}
          onPress={() => setActiveTab('wallet')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="wallet-outline"
            size={26}
            color={activeTab === 'wallet' ? '#4f46e5' : '#111827'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.8}
        >
          <Ionicons name="person-circle-outline" size={28} color={activeTab === 'profile' ? '#4f46e5' : '#111827'} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  errorText: {
    color: '#b91c1c',
    marginTop: 8,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  screenLayer: {
    flex: 1,
  },
  chatLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
  },
  metaText: {
    color: '#6b7280',
    fontSize: 13,
    marginLeft: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    marginRight: 6,
  },
  scrollContent: {
    paddingBottom: 120,
    paddingHorizontal: 20,
  },
  deviceCutout: {
    alignSelf: 'center',
    height: 36,
    width: 160,
    borderRadius: 18,
    backgroundColor: '#0f172a',
    marginTop: 12,
    marginBottom: 16,
  },
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideAccentLeft: {
    width: 18,
    height: 160,
    backgroundColor: '#22c55e',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    marginRight: 8,
  },
  sideAccentRight: {
    width: 18,
    height: 160,
    backgroundColor: '#f59e0b',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginLeft: 8,
  },
  walletCard: {
    flex: 1,
    backgroundColor: '#4f46e5',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#111827',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pill: {
    backgroundColor: '#3b32d2',
    color: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 12,
  },
  walletTitle: {
    color: '#e0e7ff',
    fontSize: 14,
  },
  balance: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 6,
  },
  actionLabel: {
    color: '#e0e7ff',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#111827',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  searchIcon: {
    marginLeft: 8,
  },
  tabRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
  tabBase: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4f46e5',
  },
  tabInactive: {
    backgroundColor: '#e5e7eb',
  },
  tabSpacing: {
    marginRight: 12,
  },
  tabActiveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tabInactiveText: {
    color: '#1f2937',
    fontWeight: '700',
  },
  listCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 12,
    marginTop: 16,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tokenRowSpacing: {
    marginBottom: 10,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  tokenInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tokenName: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  tokenSymbol: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  tokenAmounts: {
    alignItems: 'flex-end',
  },
  tokenBalance: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
  tokenValue: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#111827',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  navItem: {
    padding: 6,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#e0e7ff',
  },
  chatContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  chatHeader: {
    marginBottom: 16,
  },
  chatTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  chatSubtitle: {
    color: '#6b7280',
    marginTop: 4,
  },
  chatBubbleRemote: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    maxWidth: '85%',
  },
  chatBubbleLocal: {
    alignSelf: 'flex-end',
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    maxWidth: '85%',
  },
  chatBubbleTextRemote: {
    color: '#1f2937',
  },
  chatBubbleTextLocal: {
    color: '#ffffff',
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 'auto',
    backgroundColor: '#f8fafc',
  },
  chatInput: {
    flex: 1,
    color: '#111827',
    marginRight: 12,
  },
});
