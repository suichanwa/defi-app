import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import PulseBadge from '@components/PulseBadge';
import NetworkBadge from '@components/wallet/NetworkBadge';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';
import type { ChainConfig } from '@config/chain';

type WalletHeaderSectionProps = {
  chain: ChainConfig;
  fetchingChain: boolean;
  address: string | null;
  isAirdropLoading: boolean;
  onToggleNetwork: () => void;
  onAirdrop: () => void;
};

export default function WalletHeaderSection({
  chain,
  fetchingChain,
  address,
  isAirdropLoading,
  onToggleNetwork,
  onAirdrop,
}: WalletHeaderSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const pillsMaxWidth = Math.min(200, Math.floor(width * 0.48));

  return (
    <View style={styles.headerRow}>
      <View style={localStyles.titleBlock}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <Text style={styles.headerSubtitle}>On-chain balances with live pricing.</Text>
      </View>
      <View style={[localStyles.headerPills, { maxWidth: pillsMaxWidth }]}>
        <NetworkBadge onPress={onToggleNetwork} />
        {chain.kind === 'solana' && chain.cluster === 'devnet' && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={[localStyles.airdropButton, { borderColor: colors.border }]}
            onPress={onAirdrop}
            disabled={isAirdropLoading || !address}
          >
            <Text style={[localStyles.airdropButtonText, { color: colors.text }]}>
              {isAirdropLoading ? 'Airdropping...' : 'Airdrop 1 SOL'}
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.statusPill}>
          <PulseBadge size={8} color={fetchingChain ? '#f97316' : '#22c55e'} durationMs={1400} />
          <Text style={styles.statusText}>{fetchingChain ? 'Syncing' : 'Live'}</Text>
        </View>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  titleBlock: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  headerPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
  },
  airdropButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 140,
  },
  airdropButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
