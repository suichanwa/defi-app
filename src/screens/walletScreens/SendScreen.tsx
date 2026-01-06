import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';

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

  const history = ['ETH', 'XRP', 'SOL', 'DODGE'];
  const coins = [
    { symbol: 'BTC', name: 'Bitcoin', amount: '0.01', value: '~$1000', color: '#f59e0b' },
    { symbol: 'SOL', name: 'Solana', amount: '20.5', value: '~$2510', color: '#8b5cf6' },
    { symbol: 'BNB', name: 'BNB Smart Chain', amount: '4.54', value: '~$8546', color: '#fbbf24' },
    { symbol: 'AVAX', name: 'Avalanche', amount: '0.01', value: '~$0.25', color: '#ef4444' },
    { symbol: 'ETH', name: 'Ethereum', amount: '0.01', value: '~$1000', color: '#6366f1' },
    { symbol: 'XRP', name: 'Ripple', amount: '0.01', value: '~$1000', color: '#0f172a' },
    { symbol: 'ARB', name: 'Arbitrum', amount: '0.01', value: '~$1000', color: '#0ea5e9' },
  ];

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
        <View style={styles.listCard}>
          {coins.map((coin, index) => (
            <TouchableOpacity
              key={coin.symbol}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('SendCrypto', {
                  symbol: coin.symbol,
                  name: coin.name,
                  balance: coin.amount,
                })
              }
              style={[styles.tokenRow, index !== coins.length - 1 && styles.tokenRowSpacing]}
            >
              <View style={[styles.tokenIcon, { backgroundColor: `${coin.color}22`, borderColor: coin.color }]}>
                <Text style={[localStyles.tokenIconText, { color: coin.color }]}>{coin.symbol[0]}</Text>
              </View>
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenName}>{coin.symbol}</Text>
                <Text style={styles.tokenSymbol}>{coin.name}</Text>
              </View>
              <View style={styles.tokenAmounts}>
                <Text style={styles.tokenBalance}>{coin.amount}</Text>
                <Text style={styles.tokenValue}>{coin.value}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

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
