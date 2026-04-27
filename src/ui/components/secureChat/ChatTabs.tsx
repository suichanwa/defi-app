import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import { createSecureChatStyles } from '@styles/SecureChat';

type TabKey = 'chats' | 'connect';

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  timeLabel?: string;
};

export default function ChatTabs({ activeTab, onTabChange, timeLabel }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createSecureChatStyles(colors), [colors]);
  const isChatsActive = activeTab === 'chats';

  return (
    <View style={styles.chatTabsContainer}>
      <View style={styles.chatTabsRow}>
        <TouchableOpacity
          style={[styles.chatTab, isChatsActive && styles.chatTabActive]}
          onPress={() => onTabChange('chats')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="message-outline"
            size={18}
            color={isChatsActive ? colors.accentText : colors.text}
            style={styles.chatTabIcon}
          />
          <Text style={[styles.chatTabText, isChatsActive && styles.chatTabTextActive]}>Chats</Text>
        </TouchableOpacity>
      </View>
      {timeLabel ? (
        <Text style={styles.chatTabsTimeText}>{timeLabel}</Text>
      ) : (
        <View style={styles.chatTabsSpacer} />
      )}
    </View>
  );
}
