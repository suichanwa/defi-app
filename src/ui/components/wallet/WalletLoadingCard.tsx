import React from 'react';
import { Text, View } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';

type WalletLoadingCardProps = {
  styles: ReturnType<typeof createWalletStyles>;
  title?: string;
};

export default function WalletLoadingCard({ styles, title = 'Checking wallet...' }: WalletLoadingCardProps) {
  return (
    <View style={styles.setupCard}>
      <Text style={styles.setupTitle}>{title}</Text>
    </View>
  );
}
