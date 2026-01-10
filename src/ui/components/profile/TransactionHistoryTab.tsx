import React, { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createProfileStyles } from '@styles/ProfileStyles';
import type { TransactionHistoryItem } from '@hooks/useTransactionHistory';
import { useTheme } from '@theme/ThemeProvider';
import ProfileHeader from '@components/profile/ProfileHeader';

type TransactionHistoryTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  items: TransactionHistoryItem[];
  loading: boolean;
  error: string | null;
  message: string | null;
  onBack: () => void;
  onRefresh: () => void;
};

const formatAmount = (amount: number | null, direction: TransactionHistoryItem['direction']) => {
  if (amount === null) return 'Unknown amount';
  const sign = direction === 'sent' ? '-' : direction === 'received' ? '+' : '';
  return `${sign}${amount.toFixed(4)} SOL`;
};

const formatAddress = (value: string | null) => {
  if (!value) return 'Unknown address';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

export default function TransactionHistoryTab({
  scrollStyle,
  cardStyle,
  items,
  loading,
  error,
  message,
  onBack,
  onRefresh,
}: TransactionHistoryTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title="Transaction history" onBack={onBack} />

      <View style={cardStyle}>
        <View style={localStyles.headerRow}>
          <Text style={styles.cardTitle}>Recent activity</Text>
          <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="refresh" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.cardSubtitle}>Latest transactions for your active Solana wallet.</Text>
        {loading && (
          <View style={localStyles.loadingRow}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={[styles.metaText, { marginTop: 0 }]}>Loading transactions...</Text>
          </View>
        )}
        {error && <Text style={styles.errorText}>{error}</Text>}
        {!error && message && <Text style={styles.successText}>{message}</Text>}
      </View>

      {items.length === 0 && !loading ? (
        <View style={cardStyle}>
          <Text style={styles.cardTitle}>No transactions</Text>
          <Text style={styles.cardSubtitle}>Transactions will appear here after your first transfer.</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.signature} style={cardStyle}>
            <View style={localStyles.transactionRow}>
              <View style={localStyles.transactionInfo}>
                <Text style={localStyles.amountText}>{formatAmount(item.amount, item.direction)}</Text>
                <Text style={styles.metaText}>{formatAddress(item.counterparty)}</Text>
              </View>
              <Text style={[styles.metaText, { textTransform: 'uppercase' }]}>
                {item.status === 'failed' ? 'Failed' : item.direction === 'sent' ? 'Sent' : item.direction === 'received' ? 'Received' : 'Unknown'}
              </Text>
            </View>
            {item.timestamp && <Text style={styles.metaText}>{item.timestamp}</Text>}
            <Text style={styles.metaText}>Signature: {formatAddress(item.signature)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  transactionInfo: {
    flex: 1,
    paddingRight: 12,
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
