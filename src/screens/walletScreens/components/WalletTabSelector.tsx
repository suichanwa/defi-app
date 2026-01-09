import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';

export type WalletTab = 'tokens' | 'nfts' | 'activity';

type WalletTabSelectorProps = {
  activeTab: WalletTab;
  onChangeTab: (tab: WalletTab) => void;
};

const tabs: { id: WalletTab; label: string }[] = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'nfts', label: 'NFTs' },
  { id: 'activity', label: 'Activity' },
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
          >
            <Text style={isActive ? styles.tabActiveText : styles.tabInactiveText}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
