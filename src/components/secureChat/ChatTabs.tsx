import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';

type TabKey = 'chats' | 'connect';

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
};

export default function ChatTabs({ activeTab, onTabChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: 16,
        },
        tab: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 12,
          marginRight: 8,
          marginBottom: 8,
        },
        tabActive: {
          backgroundColor: colors.accent,
        },
        tabInactive: {
          backgroundColor: colors.border,
        },
        tabText: {
          marginLeft: 8,
          fontWeight: '600',
          color: colors.text,
        },
        tabTextActive: {
          color: colors.accentText,
        },
      }),
    [colors],
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'chats' ? styles.tabActive : styles.tabInactive]}
        onPress={() => onTabChange('chats')}
      >
        <MaterialCommunityIcons
          name="message-outline"
          size={18}
          color={activeTab === 'chats' ? colors.accentText : colors.text}
        />
        <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>Chats</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'connect' ? styles.tabActive : styles.tabInactive]}
        onPress={() => onTabChange('connect')}
      >
        <MaterialCommunityIcons
          name="access-point"
          size={18}
          color={activeTab === 'connect' ? colors.accentText : colors.text}
        />
        <Text style={[styles.tabText, activeTab === 'connect' && styles.tabTextActive]}>Connect</Text>
      </TouchableOpacity>
    </View>
  );
}
