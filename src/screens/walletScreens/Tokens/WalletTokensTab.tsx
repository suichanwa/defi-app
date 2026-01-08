import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';

type TokenBalance = {
  name: string;
  symbol: string;
  amount: number;
  pair?: string;
  color: string;
  fixedPrice?: number;
};

type WalletTokensTabProps = {
  tokens: TokenBalance[];
  prices: Record<string, number>;
  loading: boolean;
  formatCurrency: (value: number) => string;
};

export default function WalletTokensTab({ tokens, prices, loading, formatCurrency }: WalletTokensTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);

  return (
    <View style={styles.listCard}>
      {tokens.map((token, index) => (
        <View key={token.symbol} style={[styles.tokenRow, index !== tokens.length - 1 && styles.tokenRowSpacing]}>
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
  );
}
