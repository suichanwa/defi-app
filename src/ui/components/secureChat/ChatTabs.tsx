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

  return (
    <View style={styles.container}>
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'chats' && styles.tabActive]}
          onPress={() => onTabChange('chats')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="message-outline"
            size={18}
            color={activeTab === 'chats' ? colors.accentText : colors.text}
          />
          <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'connect' && styles.tabActive]}
          onPress={() => onTabChange('connect')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="access-point"
            size={18}
            color={activeTab === 'connect' ? colors.accentText : colors.text}
          />
          <Text style={[styles.tabText, activeTab === 'connect' && styles.tabTextActive]}>Connect</Text>
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
