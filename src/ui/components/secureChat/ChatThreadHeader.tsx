import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import PrivateChatSettingsMenu from '@components/secureChat/PrivateChatSettingsMenu';
import type { ChatThread } from '@app-types/securechat-types/secureChat';

type Props = {
  chat: ChatThread;
  onBack: () => void;
  participantCount?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
};

export default function ChatThreadHeader({
  chat,
  onBack,
  participantCount = 0,
  isMuted,
  onToggleMute,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const isGlobalChat = !chat.isDM && !chat.id.startsWith('p2p:');
  const subtitle = isGlobalChat ? `${participantCount} participants` : '';

  return (
    <View>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityLabel="Back to chats">
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.titleBlock}>
          <Text style={styles.title} numberOfLines={1}>
            {chat.name}
          </Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        <TouchableOpacity
          onPress={() => setSettingsVisible(true)}
          style={styles.settingsButton}
          accessibilityLabel="Open chat settings"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <PrivateChatSettingsMenu
        visible={settingsVisible}
        chatName={chat.name}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}

const createStyles = (colors: {
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
}) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 40,
    },
    backButton: {
      padding: 8,
      borderRadius: 16,
      backgroundColor: colors.border,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      marginTop: 2,
      fontSize: 12,
      color: colors.muted,
      fontWeight: '500',
    },
    settingsButton: {
      padding: 8,
      borderRadius: 16,
      backgroundColor: colors.border,
    },
    divider: {
      marginTop: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
  });
