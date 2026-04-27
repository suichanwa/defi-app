import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '@components/PulseBadge';
import type { ChatThread } from '@app-types/securechat-types/secureChat';
import { useTheme } from '@theme/ThemeProvider';
import PrivateChatSettingsMenu from '@components/secureChat/PrivateChatSettingsMenu';
import { createSecureChatStyles } from '@styles/SecureChat';

type PrivateChatHeaderProps = {
  chat: ChatThread;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onViewProfile?: () => void;
};

export default function PrivateChatHeader({ chat, isMuted, onToggleMute, onViewProfile }: PrivateChatHeaderProps) {
  const { colors } = useTheme();
  const shared = useMemo(() => createSecureChatStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors, shared), [colors, shared]);
  const isPrivate = chat.isDM ?? chat.id.startsWith('dm:');
  const [settingsVisible, setSettingsVisible] = useState(false);

  if (!isPrivate) return null;

  const isOnline = chat.isOnline;
  const statusLabel = isOnline ? 'Online' : 'Offline';
  const statusColor = isOnline ? '#22c55e' : '#9ca3af';

  return (
    <>
      <View style={styles.container}>
        <View style={styles.textBlock}>
          <Text style={shared.headerTitle} numberOfLines={1}>
            {chat.name}
          </Text>
          <View style={styles.statusRow}>
            <PulseBadge size={8} color={statusColor} />
            <Text style={styles.statusText} numberOfLines={1} ellipsizeMode="tail">
              {statusLabel}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setSettingsVisible(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Open chat settings"
        >
          <MaterialCommunityIcons name="cog-outline" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>
      <PrivateChatSettingsMenu
        visible={settingsVisible}
        chatName={chat.name}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onViewProfile={onViewProfile}
        onClose={() => setSettingsVisible(false)}
      />
    </>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  shared: ReturnType<typeof createSecureChatStyles>,
) =>
  StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 6,
      minWidth: 0,
    },
    statusText: {
      ...shared.headerSubtitle,
      flexShrink: 1,
    },
    settingsButton: {
      ...shared.chatHeaderActionButton,
    },
  });
