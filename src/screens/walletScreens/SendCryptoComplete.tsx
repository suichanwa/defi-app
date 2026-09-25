import React, { useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { ScreenContainer } from '@components/common';

type WalletStackParamList = {
  WalletHome: undefined;
  Add: undefined;
  Send: undefined;
  Receive: { address: string };
  Swap: undefined;
  SendCrypto: { symbol: string; name: string; balance: string };
  SendCryptoComplete: { symbol: string; amount: string; toAddress: string; signature: string };
};

type SendCompleteRoute = RouteProp<WalletStackParamList, 'SendCryptoComplete'>;

export default function SendCryptoComplete() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'SendCryptoComplete'>>();
  const route = useRoute<SendCompleteRoute>();
  const { symbol, amount, toAddress, signature } = route.params ?? {
    symbol: 'SOL',
    amount: '--',
    toAddress: '--',
    signature: '--',
  };

  const formatAddress = (value: string) => {
    if (!value || value === '--') return value;
    if (value.length <= 10) return value;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  };

  return (
    <ScreenContainer contentContainerStyle={localStyles.content}>
      <View style={localStyles.content}>
        <View style={[localStyles.iconCircle, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark" size={34} color="#ffffff" />
        </View>
        <Text style={[localStyles.title, { color: colors.text }]}>Withdraw complete</Text>
        <Text style={[localStyles.subtitle, { color: colors.muted }]}>Your transfer is confirmed on devnet.</Text>

        <View style={[localStyles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={localStyles.detailRow}>
            <Text style={[localStyles.detailLabel, { color: colors.muted }]}>Asset</Text>
            <Text style={[localStyles.detailValue, { color: colors.text }]}>{symbol}</Text>
          </View>
          <View style={localStyles.detailRow}>
            <Text style={[localStyles.detailLabel, { color: colors.muted }]}>Amount</Text>
            <Text style={[localStyles.detailValue, { color: colors.text }]}>
              {amount} {symbol}
            </Text>
          </View>
          <View style={localStyles.detailRow}>
            <Text style={[localStyles.detailLabel, { color: colors.muted }]}>To</Text>
            <Text style={[localStyles.detailValue, { color: colors.text }]}>{formatAddress(toAddress)}</Text>
          </View>
          <View style={localStyles.detailRow}>
            <Text style={[localStyles.detailLabel, { color: colors.muted }]}>Signature</Text>
            <Text style={[localStyles.detailValue, { color: colors.text }]}>{formatAddress(signature)}</Text>
          </View>
        </View>
      </View>

      <View style={localStyles.footer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryButton, localStyles.footerButton]}
          onPress={() => navigation.navigate('WalletHome')}
        >
          <Text style={styles.primaryButtonText}>Return to wallet</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  footerButton: {
    marginBottom: 0,
  },
});
