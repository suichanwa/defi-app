import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@context/ThemeProvider';

type WalletLoadingOverlayProps = {
  styles: ReturnType<typeof createWalletStyles>;
  label?: string;
};

export default function WalletLoadingOverlay({ styles, label = 'Creating wallet...' }: WalletLoadingOverlayProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.loadingOverlay, { pointerEvents: 'auto' }]}>
      <View style={styles.loadingOverlayCard}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={[styles.loadingOverlayText, { color: colors.text }]}>{label}</Text>
      </View>
    </View>
  );
}
