import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';

export type WalletTab = 'tokens' | 'nfts';

type WalletTabSelectorProps = {
  activeTab: WalletTab;
  onChangeTab: (tab: WalletTab) => void;
};

const tabs: { id: WalletTab; label: string }[] = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'nfts', label: 'NFTs' },
];

export default function WalletTabSelector({ activeTab, onChangeTab }: WalletTabSelectorProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);

  return (
    <View style={styles.tabRow}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabBase, isActive ? styles.tabActive : styles.tabInactive]}
            onPress={() => onChangeTab(tab.id)}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            pressRetentionOffset={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={isActive ? styles.tabActiveText : styles.tabInactiveText}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
