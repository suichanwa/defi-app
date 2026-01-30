import React, { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import useTokenSearch from '@hooks/useTokenSearch';

type WalletTokenSearchOverlayProps = {
  visible: boolean;
  onClose: () => void;
};

const formatPrice = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return '--';
  if (value >= 1) {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
};

export default function WalletTokenSearchOverlay({ visible, onClose }: WalletTokenSearchOverlayProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const { query, setQuery, filteredTokens, loading, error, refresh } = useTokenSearch(visible);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[localStyles.container, { backgroundColor: colors.background }]}>
        <View style={localStyles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            style={[localStyles.backButton, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[localStyles.title, { color: colors.text }]}>Search tokens</Text>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            style={[localStyles.refreshButton, { borderColor: colors.border }]}
            onPress={refresh}
          >
            <MaterialCommunityIcons name="refresh" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search tokens..."
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            style={styles.searchInput}
          />
          <TouchableOpacity activeOpacity={0.7} onPress={() => setQuery('')}>
            <MaterialCommunityIcons name="close-circle" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {loading && <Text style={styles.metaText}>Loading prices...</Text>}

        <ScrollView contentContainerStyle={localStyles.list}>
          {filteredTokens.map((token) => (
            <View
              key={token.symbol}
              style={[localStyles.tokenRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[localStyles.tokenIcon, { backgroundColor: `${colors.accent}22` }]}>
                <Text style={[localStyles.tokenIconText, { color: colors.accent }]}>{token.symbol[0]}</Text>
              </View>
              <View style={localStyles.tokenInfo}>
                <Text style={[localStyles.tokenSymbol, { color: colors.text }]}>{token.symbol}</Text>
                <Text style={[localStyles.tokenName, { color: colors.muted }]}>{token.name}</Text>
              </View>
              <Text style={[localStyles.tokenPrice, { color: colors.text }]}>${formatPrice(token.price)}</Text>
            </View>
          ))}
          {!loading && filteredTokens.length === 0 && (
            <View style={localStyles.emptyState}>
              <Text style={[localStyles.emptyText, { color: colors.muted }]}>No tokens found.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  list: {
    paddingBottom: 24,
    gap: 12,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenIconText: {
    fontSize: 16,
    fontWeight: '800',
  },
  tokenInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tokenSymbol: {
    fontSize: 15,
    fontWeight: '700',
  },
  tokenName: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  tokenPrice: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
