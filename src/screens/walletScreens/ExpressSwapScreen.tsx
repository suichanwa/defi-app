import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useNavVisibility } from '@context/NavVisibilityProvider';

import { ScreenHeader } from '@components/common';

type WalletStackParamList = {
  WalletHome: undefined;
  Add: undefined;
  Send: undefined;
  Receive: { address: string };
  Swap: undefined;
  ExpressSwap: undefined;
  ExpressSwapSuccess: undefined;
  SendCrypto: { symbol: string; name: string; balance: string };
  SendCryptoComplete: { symbol: string };
  QRReceive: { symbol: string; name: string; address: string };
};

type TokenOption = {
  symbol: string;
  name: string;
  color: string;
  usdPrice: number;
};

const TOKENS: TokenOption[] = [
  { symbol: 'BTC', name: 'Bitcoin', color: '#f59e0b', usdPrice: 42000 },
  { symbol: 'XRP', name: 'XRP', color: '#38bdf8', usdPrice: 0.52 },
];

const FEE_RATE = 0.001;

const parseAmount = (value: string) => {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const formatAmount = (value: number) => {
  if (!Number.isFinite(value)) return '';
  const fixed = value < 1 ? value.toFixed(6) : value.toFixed(4);
  return fixed.replace(/\.?0+$/, '');
};

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return '$0.00';
  const rounded = Math.round(value * 100) / 100;
  return `$${rounded.toFixed(2)}`;
};

export default function ExpressSwapScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'ExpressSwap'>>();
  const { setNavHidden } = useNavVisibility();

  const [fromToken, setFromToken] = useState<TokenOption>(TOKENS[0]);
  const [toToken, setToToken] = useState<TokenOption>(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [lastEdited, setLastEdited] = useState<'from' | 'to'>('from');
  const [feeAmount, setFeeAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [balances, setBalances] = useState<Record<string, number>>({
    BTC: 0.58,
    XRP: 2400,
  });

  const resetSwapState = useCallback(() => {
    setFromToken(TOKENS[0]);
    setToToken(TOKENS[1]);
    setFromAmount('');
    setToAmount('');
    setLastEdited('from');
    setFeeAmount(0);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    setNavHidden(true);
    return () => {
      setNavHidden(false);
    };
  }, [setNavHidden]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        resetSwapState();
      };
    }, [resetSwapState]),
  );

  const rate = useMemo(() => fromToken.usdPrice / toToken.usdPrice, [fromToken, toToken]);
  const parsedFrom = useMemo(() => parseAmount(fromAmount), [fromAmount]);
  const parsedTo = useMemo(() => parseAmount(toAmount), [toAmount]);
  const fromBalance = balances[fromToken.symbol] ?? 0;

  useEffect(() => {
    if (lastEdited === 'from') {
      if (!parsedFrom) {
        if (toAmount !== '') {
          setToAmount('');
        }
        setFeeAmount(0);
        return;
      }
      const nextTo = formatAmount(parsedFrom * rate);
      if (nextTo !== toAmount) {
        setToAmount(nextTo);
      }
      setFeeAmount(parsedFrom * FEE_RATE);
    } else {
      if (!parsedTo) {
        if (fromAmount !== '') {
          setFromAmount('');
        }
        setFeeAmount(0);
        return;
      }
      const nextFrom = formatAmount(parsedTo / rate);
      if (nextFrom !== fromAmount) {
        setFromAmount(nextFrom);
      }
      setFeeAmount((parsedTo / rate) * FEE_RATE);
    }
  }, [fromAmount, lastEdited, parsedFrom, parsedTo, rate, toAmount]);

  const isAmountValid = parsedFrom !== null;
  const isInsufficient = isAmountValid && parsedFrom + feeAmount > fromBalance;
  const confirmDisabled = !isAmountValid || isInsufficient || isSubmitting;
  const feeUsdValue = feeAmount * fromToken.usdPrice;

  const swapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount('');
    setToAmount('');
    setLastEdited('from');
    setFeeAmount(0);
  };

  const handleConfirm = async () => {
    if (confirmDisabled || !parsedFrom) return;
    const parsedToValue = parseAmount(toAmount) ?? 0;
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    setBalances((prev) => ({
      ...prev,
      [fromToken.symbol]: Math.max(0, (prev[fromToken.symbol] ?? 0) - (parsedFrom + feeAmount)),
      [toToken.symbol]: (prev[toToken.symbol] ?? 0) + parsedToValue,
    }));
    navigation.navigate('ExpressSwapSuccess');
  };

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, localStyles.scrollContent]}>
        <ScreenHeader
          onBack={() => navigation.goBack()}
          title="Express Swap"
        />

        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tabBase, styles.tabActive]} activeOpacity={0.9}>
            <Text style={styles.tabActiveText}>Express</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabBase, styles.tabInactive]} activeOpacity={0.9} disabled>
            <Text style={styles.tabInactiveText}>P2P</Text>
          </TouchableOpacity>
        </View>

        <View style={[localStyles.assetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[localStyles.cardLabel, { color: colors.muted }]}>From</Text>
          <View style={localStyles.cardRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={localStyles.tokenPill}
              onPress={swapTokens}
            >
              <View style={[localStyles.tokenIcon, { backgroundColor: `${fromToken.color}1a`, borderColor: fromToken.color }]}>
                <Ionicons name="ellipse" size={16} color={fromToken.color} />
              </View>
              <Text style={[localStyles.tokenSymbol, { color: colors.text }]}>{fromToken.symbol}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.muted} />
            </TouchableOpacity>
            <TextInput
              value={fromAmount}
              onChangeText={(value) => {
                setLastEdited('from');
                setFromAmount(value);
              }}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={[localStyles.amountInput, { color: colors.text }]}
            />
          </View>
          <Text style={[localStyles.balanceText, { color: colors.muted }]}>
            Balance: {fromBalance.toFixed(4)} {fromToken.symbol}
          </Text>
        </View>

        <View style={localStyles.swapArrowWrap}>
          <View style={[localStyles.swapArrow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Ionicons name="swap-vertical" size={18} color={colors.muted} />
          </View>
        </View>

        <View style={[localStyles.assetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[localStyles.cardLabel, { color: colors.muted }]}>To</Text>
          <View style={localStyles.cardRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={localStyles.tokenPill}
              onPress={swapTokens}
            >
              <View style={[localStyles.tokenIcon, { backgroundColor: `${toToken.color}1a`, borderColor: toToken.color }]}>
                <Ionicons name="ellipse" size={16} color={toToken.color} />
              </View>
              <Text style={[localStyles.tokenSymbol, { color: colors.text }]}>{toToken.symbol}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.muted} />
            </TouchableOpacity>
            <TextInput
              value={toAmount}
              onChangeText={(value) => {
                setLastEdited('to');
                setToAmount(value);
              }}
              placeholder="0"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
              style={[localStyles.amountInput, { color: colors.text }]}
            />
          </View>
          <Text style={[localStyles.balanceText, { color: colors.muted }]}>
            Est. rate: 1 {fromToken.symbol} = {formatAmount(rate)} {toToken.symbol}
          </Text>
        </View>

        {isInsufficient && <Text style={[styles.errorText, localStyles.inlineError]}>Insufficient funds</Text>}

        <View style={[localStyles.feeRow, { borderColor: colors.border }]}>
          <View>
            <Text style={[localStyles.feeLabel, { color: colors.text }]}>Convert fee 0.1%</Text>
            <Text style={[localStyles.feeValue, { color: colors.muted }]}>~ {formatCurrency(feeUsdValue)}</Text>
          </View>
          <Text style={[localStyles.feeAmount, { color: colors.text }]}>
            {feeAmount ? `${formatAmount(feeAmount)} ${fromToken.symbol}` : '-'}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            localStyles.confirmButton,
            {
              backgroundColor: confirmDisabled ? colors.border : colors.warning,
            },
          ]}
          disabled={confirmDisabled}
          onPress={handleConfirm}
        >
          <Text style={[localStyles.confirmText, { color: confirmDisabled ? colors.muted : '#ffffff' }]}>
            {isSubmitting ? 'Processing...' : 'Confirm'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  headerSpacer: {
    width: 36,
  },
  assetCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: '700',
  },
  amountInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 20,
    fontWeight: '700',
    padding: 0,
  },
  balanceText: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },
  swapArrowWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },
  swapArrow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  inlineError: {
    marginTop: 16,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 16,
  },
  feeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  feeValue: {
    fontSize: 12,
    marginTop: 4,
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
