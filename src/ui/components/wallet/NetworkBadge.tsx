import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
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
  const isSolana = chain.kind === 'solana';
  const label = isSolana ? getSolanaClusterLabel(chain.cluster) : 'Ethereum';

  const iconName = isSolana ? 'flash-outline' : 'ethereum';
  const iconColor = isSolana ? '#10b981' : '#6366f1';

  const content = (
    <View style={localStyles.contentRow}>
      <MaterialCommunityIcons name={iconName} size={14} color={iconColor} />
      <Text style={styles.networkBadgeText}>{label}</Text>
      {onPress && <Ionicons name="chevron-down" size={12} color={colors.muted} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.networkBadge, localStyles.badgeTouchable]}
        onPress={onPress}
        activeOpacity={0.75}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.networkBadge}>{content}</View>;
}

const localStyles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeTouchable: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
});
