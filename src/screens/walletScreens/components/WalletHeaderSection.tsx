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
  const pillsMaxWidth = Math.min(200, Math.floor(width * 0.48));
  const cooldownSeconds = Math.ceil(airdropCooldownMsRemaining / 1000);
  const isCooldownActive = cooldownSeconds > 0;

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
            testID="wallet-airdrop-button"
            activeOpacity={0.7}
            style={[
              localStyles.airdropButton, 
              { 
                borderColor: colors.border,
                backgroundColor: isCooldownActive || isAirdropLoading || !address 
                  ? colors.border 
                  : colors.background,
                opacity: isCooldownActive || isAirdropLoading || !address ? 0.6 : 1,
              }
            ]}
            onPress={onAirdrop}
            disabled={isAirdropLoading || !address || isCooldownActive}
          >
            <Text style={[
              localStyles.airdropButtonText, 
              { 
                color: isCooldownActive || isAirdropLoading || !address 
                  ? colors.muted 
                  : colors.text 
              }
            ]}>
              {isAirdropLoading
                ? 'Airdropping...'
                : isCooldownActive
                ? `Try again in ${cooldownSeconds}s`
                : 'Airdrop 1 SOL'}
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
    paddingHorizontal: 14,      // Increased from 12
    paddingVertical: 8,         // Increased from 6
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 100,             // Added minimum width
    minHeight: 32,             // Added minimum height for better touch target
    alignItems: 'center',      // Center text
    justifyContent: 'center',  // Center text
  },
  airdropButtonText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',       // Ensure text is centered
  },
});
