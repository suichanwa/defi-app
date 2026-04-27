import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DEFAULT_GLOBAL_CHAT_ID, DEFAULT_GLOBAL_CHAT_PEER } from '@constants/secureChat.constants';
import { useTheme } from '@theme/ThemeProvider';
import ChatAvatar from '@components/secureChat/ChatAvatar';
import GlobalChatAvatar from '@components/secureChat/GlobalChatAvatar';
import PrivateChatSettingsMenu from '@components/secureChat/PrivateChatSettingsMenu';
import type { ChatAvatarSource, ChatThread } from '@app-types/securechat-types/secureChat';
import { getPrivateChatPresenceIndicator } from '@utils/secureChatUtils';
import { createNavigationChromeStyles } from '@styles/NavigationChrome';

type Props = {
  chat: ChatThread;
  onBack: () => void;
  participantCount?: number;
  unreadCount?: number;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onViewProfile?: () => void;
  onDeleteChat?: () => void;
  avatarSource?: ChatAvatarSource;
  onAvatarPress?: () => void;
};

export default function ChatThreadHeader({
  chat,
  onBack,
  participantCount = 0,
  unreadCount = 0,
  isMuted,
  onToggleMute,
  onViewProfile,
  onDeleteChat,
  avatarSource,
  onAvatarPress,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width < 380;
  const avatarSize = isCompact ? 38 : 40;
  const chrome = useMemo(() => createNavigationChromeStyles(colors, { compact: isCompact }), [colors, isCompact]);
  const styles = useMemo(() => createStyles(colors, { isCompact }, chrome), [colors, isCompact, chrome]);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const isGlobalChat = chat.id === DEFAULT_GLOBAL_CHAT_ID || chat.peerAddress === DEFAULT_GLOBAL_CHAT_PEER;
  const presence = useMemo(
    () => getPrivateChatPresenceIndicator({ chat, unreadCount }),
    [chat, unreadCount],
  );
  const subtitle = isGlobalChat ? formatParticipants(participantCount) : presence.statusLabel;
  const privateAvatarSource = avatarSource ?? {
    avatarType: 'identicon' as const,
    seed: chat.peerAddress || chat.id || chat.name || 'chat',
  };
  const avatarNode = isGlobalChat ? (
    <GlobalChatAvatar size={avatarSize} />
  ) : onAvatarPress ? (
    <TouchableOpacity
      onPress={onAvatarPress}
      style={styles.avatarButton}
      accessibilityRole="button"
      accessibilityLabel={`Open ${chat.name} profile`}
      hitSlop={8}
    >
      <ChatAvatar source={privateAvatarSource} variant="incoming" size={avatarSize} />
    </TouchableOpacity>
  ) : (
    <View style={styles.avatarButton}>
      <ChatAvatar source={privateAvatarSource} variant="incoming" size={avatarSize} />
    </View>
  );

  return (
    <View style={styles.outerHeader}>
      <View style={styles.innerHeader}>
        <View style={styles.leftCluster}>
          <TouchableOpacity
            onPress={onBack}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel="Back to chats"
            hitSlop={8}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>

          {avatarNode}

          <View style={styles.titleBlock}>
            <Text style={styles.titleText} numberOfLines={1} ellipsizeMode="tail">
              {chat.name}
            </Text>
            <View style={styles.subtitleRow}>
              {subtitle ? (
                <Text style={styles.subtitleText} numberOfLines={1} ellipsizeMode="tail">
                  {subtitle}
                </Text>
              ) : null}
              {!isGlobalChat && presence.showBadge ? (
                <View style={styles.presenceBadge}>
                  <Text style={styles.presenceBadgeText}>{presence.badgeLabel}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

          <TouchableOpacity
            onPress={() => setSettingsVisible(true)}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel="Open chat settings"
            hitSlop={8}
          >
            <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

      <PrivateChatSettingsMenu
        visible={settingsVisible}
        chatName={chat.name}
        canDeleteChat={chat.isDM === true}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onViewProfile={onViewProfile}
        onDeleteChat={onDeleteChat}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}

const createStyles = (colors: {
  background: string;
  card: string;
  nav: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
}, options: { isCompact: boolean }, chrome: ReturnType<typeof createNavigationChromeStyles>) =>
  StyleSheet.create({
    outerHeader: {
      backgroundColor: colors.background,
      paddingHorizontal: 0,
      paddingTop: 6,
      paddingBottom: 2,
    },
    innerHeader: {
      ...chrome.surface,
      ...chrome.row,
      width: '100%',
      maxWidth: 900,
      alignSelf: 'center',
      minHeight: options.isCompact ? 58 : 62,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 18,
    },
    leftCluster: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatarButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    titleBlock: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    subtitleRow: {
      marginTop: 2,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minWidth: 0,
      flexWrap: 'nowrap',
    },
    titleText: {
      fontSize: options.isCompact ? 16 : 18,
      lineHeight: options.isCompact ? 20 : 22,
      fontWeight: '800',
      letterSpacing: 0.1,
      color: colors.text,
    },
    subtitleText: {
      fontSize: options.isCompact ? 11 : 12,
      lineHeight: options.isCompact ? 15 : 16,
      fontWeight: '500',
      color: colors.text,
      opacity: 0.72,
      flexShrink: 1,
    },
    presenceBadge: {
      minHeight: 18,
      paddingHorizontal: 7,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.accent, '22'),
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, '44'),
      flexShrink: 0,
    },
    presenceBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.4,
      color: colors.accentText,
    },
    actionButton: {
      ...chrome.actionButton,
    },
  });

const formatParticipants = (count: number) => {
  const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
  return `${safeCount} ${safeCount === 1 ? 'participant' : 'participants'}`;
};

const withAlpha = (hex: string, alphaHex: string) => {
  if (!hex.startsWith('#')) return hex;
  const value = hex.slice(1);
  if (value.length === 6) return `#${value}${alphaHex}`;
  return hex;
};
