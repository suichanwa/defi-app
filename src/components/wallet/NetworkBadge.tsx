import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import { CHAIN, getSolanaClusterLabel } from '../../config/chain';
import { createWalletStyles } from '../../styles/WalletStyles';
import { useTheme } from '../../theme/ThemeProvider';

export default function NetworkBadge() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const label = CHAIN.kind === 'solana' ? getSolanaClusterLabel(CHAIN.cluster) : 'Mainnet';

  return (
    <View style={styles.networkBadge}>
      <Text style={styles.networkBadgeText}>{label}</Text>
    </View>
  );
}
