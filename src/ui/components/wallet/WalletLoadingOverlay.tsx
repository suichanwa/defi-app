import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';

type WalletLoadingOverlayProps = {
  styles: ReturnType<typeof createWalletStyles>;
  label: string;
};

export default function WalletLoadingOverlay({ styles, label }: WalletLoadingOverlayProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator size="small" color={colors.accent} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}
