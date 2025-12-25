import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';

type WalletLoadingOverlayProps = {
  styles: ReturnType<typeof createWalletStyles>;
  label?: string;
};

export default function WalletLoadingOverlay({ styles, label = 'Creating wallet...' }: WalletLoadingOverlayProps) {
  return (
    <View style={styles.loadingOverlay} pointerEvents="auto">
      <View style={styles.loadingOverlayCard}>
        <ActivityIndicator size="small" color="#4f46e5" />
        <Text style={styles.loadingOverlayText}>{label}</Text>
      </View>
    </View>
  );
}
