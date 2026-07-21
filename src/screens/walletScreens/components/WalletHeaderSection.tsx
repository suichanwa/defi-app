import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
  airdropCooldownMsRemaining?: number;
  onToggleNetwork: () => void;
  onAirdrop: () => void;
};

export default function WalletHeaderSection({
  chain,
  fetchingChain,
  address,
  isAirdropLoading,
  airdropCooldownMsRemaining = 0,
  onToggleNetwork,
  onAirdrop,
}: WalletHeaderSectionProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 400;
  const cooldownSeconds = Math.ceil(airdropCooldownMsRemaining / 1000);
  const isCooldownActive = cooldownSeconds > 0;

  const airdropButton =
    chain.kind === 'solana' && chain.cluster === 'devnet' ? (
      <TouchableOpacity
        testID="wallet-airdrop-button"
        activeOpacity={0.75}
        style={[
          localStyles.airdropButton,
          {
            borderColor: colors.border,
            backgroundColor: isCooldownActive || isAirdropLoading || !address
              ? colors.border
              : colors.card,
            opacity: isCooldownActive || isAirdropLoading || !address ? 0.6 : 1,
          },
        ]}
        onPress={onAirdrop}
        disabled={isAirdropLoading || !address || isCooldownActive}
      >
        <View style={localStyles.airdropContent}>
          <MaterialCommunityIcons
            name="gift-outline"
            size={14}
            color={isCooldownActive || isAirdropLoading || !address ? colors.muted : colors.text}
          />
          <Text
            style={[
              localStyles.airdropButtonText,
              {
                color: isCooldownActive || isAirdropLoading || !address
                  ? colors.muted
                  : colors.text,
              },
            ]}
          >
            {isAirdropLoading ? 'Airdropping...' : isCooldownActive ? `${cooldownSeconds}s` : '1 SOL'}
          </Text>
        </View>
      </TouchableOpacity>
    ) : null;

  const statusPill = (
    <View style={styles.statusPill}>
      <PulseBadge size={8} color={fetchingChain ? '#f97316' : '#22c55e'} durationMs={1400} />
      <Text style={styles.statusText}>{fetchingChain ? 'Syncing' : 'Live'}</Text>
    </View>
  );

  if (isSmallScreen) {
    return (
      <View style={localStyles.compactRoot}>
        <View style={localStyles.topRow}>
          <Text style={styles.screenTitle}>Wallet</Text>
          {statusPill}
        </View>
        <View style={localStyles.bottomPillsRow}>
          <NetworkBadge onPress={onToggleNetwork} />
          {airdropButton}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.headerRow}>
      <View style={localStyles.titleBlock}>
        <Text style={styles.screenTitle}>Wallet</Text>
      </View>
      <View style={localStyles.headerPills}>
        <NetworkBadge onPress={onToggleNetwork} />
        {airdropButton}
        {statusPill}
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  compactRoot: {
    marginBottom: 20,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  titleBlock: {
    justifyContent: 'center',
    paddingRight: 12,
  },
  headerPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  airdropButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  airdropContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  airdropButtonText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
