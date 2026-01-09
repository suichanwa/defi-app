import React, { useMemo, useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useCopyToClipboard } from '@hooks/useCopyToClipboard';
import { useQRReceive } from '@context/QRReceiveProvider';
import { useNavVisibility } from '@context/NavVisibilityProvider';
import { useWalletSession } from '@context/WalletSessionProvider';

type WalletStackParamList = {
  Receive: { address: string };
  QRReceive: { symbol: string; name: string; address: string };
};

type ReceiveRouteProp = RouteProp<WalletStackParamList, 'Receive'>;

export default function ReceiveScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const route = useRoute<ReceiveRouteProp>();
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'Receive'>>();
  const address = route.params?.address ?? null;
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');
  const { copyText } = useCopyToClipboard();
  const { setQRData } = useQRReceive();
  const { setNavHidden } = useNavVisibility();
  const { wallets, activeWalletId } = useWalletSession();
  const walletList = wallets.length
    ? wallets
    : address
      ? [
          {
            id: address,
            label: 'Active wallet',
          },
        ]
      : [];
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(
    activeWalletId ?? walletList[0]?.id ?? null,
  );
  const selectedAddress = walletList.find((wallet) => wallet.id === selectedWalletId)?.id ?? address ?? null;

  React.useEffect(() => {
    setNavHidden(true);
    return () => setNavHidden(false);
  }, [setNavHidden]);

  const tokens = [
    { symbol: 'BTC', name: 'Bitcoin', color: '#f59e0b' },
    { symbol: 'ETH', name: 'Ethereum', color: '#6366f1' },
    { symbol: 'BNB', name: 'BNB Smart Chain', color: '#fbbf24' },
    { symbol: 'XRP', name: 'Ripple', color: '#0f172a' },
    { symbol: 'SOL', name: 'Solana', color: '#8b5cf6' },
  ];

  const formatAddress = (value: string | null) => {
    if (!value) return 'Address unavailable';
    if (value.length <= 10) return value;
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  };

  return (
    <View style={localStyles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        <View style={localStyles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            style={[localStyles.backButton, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receive</Text>
          <View style={localStyles.headerSpacer} />
        </View>
        <Text style={styles.headerSubtitle}>Choose the asset to receive funds.</Text>

        {walletList.length > 0 && (
          <View style={localStyles.walletSection}>
            <Text style={[localStyles.walletLabel, { color: colors.text }]}>Receive to</Text>
            <View style={localStyles.walletRow}>
              {walletList.map((wallet) => {
                const isActive = wallet.id === selectedWalletId;
                return (
                  <TouchableOpacity
                    key={wallet.id}
                    activeOpacity={0.8}
                    style={[
                      localStyles.walletChip,
                      { borderColor: colors.border, backgroundColor: colors.card },
                      isActive && { borderColor: colors.accent, backgroundColor: `${colors.accent}12` },
                    ]}
                    onPress={() => setSelectedWalletId(wallet.id)}
                  >
                    <Text style={[localStyles.walletChipText, { color: colors.text }]}>
                      {wallet.label ?? 'Wallet'}
                    </Text>
                    <Text style={[localStyles.walletChipSubtext, { color: colors.muted }]}>
                      {formatAddress(wallet.id)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={localStyles.list}>
          {tokens.map((token) => {
            const isActive = token.symbol === selectedSymbol;
            return (
              <TouchableOpacity
                key={token.symbol}
                activeOpacity={0.8}
                onPress={() => setSelectedSymbol(token.symbol)}
                style={[
                  localStyles.listItem,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isActive && { borderColor: colors.accent },
                ]}
              >
                <View style={[localStyles.iconCircle, { backgroundColor: `${token.color}22` }]}>
                  <Text style={[localStyles.iconText, { color: token.color }]}>{token.symbol[0]}</Text>
                </View>
                <View style={localStyles.assetInfo}>
                  <Text style={[localStyles.assetName, { color: colors.text }]}>{token.name}</Text>
                  <Text style={[localStyles.assetAddress, { color: colors.muted }]}>
                    {formatAddress(selectedAddress)}
                  </Text>
                </View>
                <View style={localStyles.actions}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[localStyles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() =>
                        selectedAddress &&
                        (() => {
                          const payload = { symbol: token.symbol, name: token.name, address: selectedAddress };
                          setQRData(payload);
                          navigation.navigate('QRReceive', payload);
                        })()
                      }
                    >
                      <MaterialCommunityIcons name="qrcode-scan" size={20} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[localStyles.actionButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                      onPress={() =>
                        copyText(selectedAddress ?? '', {
                          scope: 'wallet',
                          animation: 'slide',
                          successMessage: 'Copied to clipboard',
                          errorMessage: 'Unable to copy',
                        })
                      }
                    >
                      <MaterialCommunityIcons name="content-copy" size={20} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  list: {
    gap: 12,
    marginTop: 8,
  },
  walletSection: {
    marginTop: 12,
    marginBottom: 16,
    gap: 8,
  },
  walletLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  walletRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  walletChip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    minWidth: 140,
  },
  walletChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  walletChipSubtext: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
    fontWeight: '800',
  },
  assetInfo: {
    flex: 1,
    marginLeft: 12,
  },
  assetName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  assetAddress: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
