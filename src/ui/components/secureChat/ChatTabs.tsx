import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';

type TabKey = 'chats' | 'connect';

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  timeLabel?: string;
};

export default function ChatTabs({ activeTab, onTabChange, timeLabel }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isChatsActive = activeTab === 'chats';

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, isChatsActive && styles.tabActive]}
          onPress={() => onTabChange('chats')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="message-outline"
            size={18}
            color={isChatsActive ? colors.accentText : colors.text}
          />
          <Text style={[styles.tabText, isChatsActive && styles.tabTextActive]}>Chats</Text>
        </TouchableOpacity>
      </View>
      {timeLabel ? (
        <Text style={styles.timeText}>{timeLabel}</Text>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    spacer: {
      flex: 1,
    },
    timeText: {
      fontSize: 12,
      color: colors.muted,
    },
    tabsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 20,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.border,
    },
    tabActive: {
      backgroundColor: colors.accent,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
    },
    tabTextActive: {
      color: colors.accentText,
    },
  });
