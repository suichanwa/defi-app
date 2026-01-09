import React, { useMemo } from 'react';
import { TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';

type WalletSearchBarProps = {
  value?: string;
  placeholder?: string;
  onChangeText?: (text: string) => void;
};

export default function WalletSearchBar({
  value,
  placeholder = 'Search tokens...',
  onChangeText,
}: WalletSearchBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);

  return (
    <View style={styles.searchContainer}>
      <MaterialCommunityIcons name="magnify" size={20} color={colors.muted} style={styles.searchIcon} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
      />
      <MaterialCommunityIcons name="link-variant" size={20} color={colors.muted} style={styles.searchIcon} />
    </View>
  );
}
