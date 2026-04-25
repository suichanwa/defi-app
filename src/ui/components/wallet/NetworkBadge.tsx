import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { getSolanaClusterLabel } from '@config/chain';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';
import { useChain } from '@context/ChainProvider';

type NetworkBadgeProps = {
  onPress?: () => void;
};

export default function NetworkBadge({ onPress }: NetworkBadgeProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const { chain } = useChain();
  const label = chain.kind === 'solana' ? getSolanaClusterLabel(chain.cluster) : 'Ethereum';

  if (onPress) {
    return (
      <TouchableOpacity style={styles.networkBadge} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.networkBadgeText}>{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.networkBadge}>
      <Text style={styles.networkBadgeText}>{label}</Text>
    </View>
  );
}
