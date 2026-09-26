import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '@components/PulseBadge';
import type { ChatAvatarSource, ChatThread } from '@app-types/securechat-types/secureChat';
import { DEFAULT_GLOBAL_CHAT_ID } from '@constants/secureChat.constants';
import { useTheme } from '@theme/ThemeProvider';
import GlobalChatAvatar from './GlobalChatAvatar';
import ChatAvatar from './ChatAvatar';
import { getPrivateChatPresenceIndicator } from '@utils/secureChatUtils';
import { createSecureChatStyles } from '@styles/SecureChat';

type Props = {
  chats: ChatThread[];
  selectedChatId: string;
  unreadCountByChatId?: Record<string, number>;
  onSelectChat: (chatId: string) => void;
  onOpenSelected: (chatId: string) => void;
};

export default function ChatListScreen({
  chats,
  selectedChatId,
  unreadCountByChatId = {},
  onSelectChat,
  onOpenSelected,
}: Props) {
  const { colors } = useTheme();
  const shared = useMemo(() => createSecureChatStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors, shared), [colors, shared]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
        return isHorizontal && gesture.dx < -12;
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -60 && selectedChatId) {
          handleChatOpen(selectedChatId);
        }
      },
    }),
  ).current;

  const orderedChats = useMemo(() => {
    const next = [...chats];
    next.sort((a, b) => {
      const aPinned = a.id === DEFAULT_GLOBAL_CHAT_ID ? 0 : 1;
      const bPinned = b.id === DEFAULT_GLOBAL_CHAT_ID ? 0 : 1;
      if (aPinned !== bPinned) return aPinned - bPinned;
      return a.name.localeCompare(b.name);
    });
    return next;
  }, [chats]);

  const handleChatOpen = (chatId: string) => {
    const useNativeDriver = Platform.OS !== 'web';
    // Parallel animations for slide and fade
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver,
      }),
    ]).start(() => {
      onOpenSelected(chatId);
      // Reset animations for next time
      slideAnim.setValue(0);
      fadeAnim.setValue(1);
    });
  };

  const handleChatSelect = (chatId: string) => {
    onSelectChat(chatId);
    // Trigger opening animation
    handleChatOpen(chatId);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={shared.pageTitle}>Chats</Text>
          <Text style={shared.pageSubtitle}>Borrowed from secureChat flow</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {orderedChats.map((chat) => {
          const isActive = chat.id === selectedChatId;
          const isPinned = chat.id === DEFAULT_GLOBAL_CHAT_ID;
          const presence = getPrivateChatPresenceIndicator({
            chat,
            unreadCount: unreadCountByChatId[chat.id] ?? 0,
          });
          const lastMessage = chat.lastMessage;
          const previewText = lastMessage
            ? `${lastMessage.from ? `${lastMessage.from}: ` : ''}${lastMessage.text}`
            : 'No messages yet.';
          return (
            <TouchableOpacity
              key={chat.id}
              style={[styles.chatCard, isActive && styles.chatCardActive]}
              onPress={() => handleChatSelect(chat.id)}
              activeOpacity={0.85}
            >
              <View style={styles.chatRow}>
                {isPinned ? (
                  <GlobalChatAvatar size={42} showContainer={false} />
                ) : (
                  <ChatAvatar
                    source={chat.avatarSource ?? deriveChatAvatarSource(chat)}
                    variant="incoming"
                    size={42}
                  />
                )}
                <View style={styles.chatMeta}>
                  <View style={styles.chatNameRow}>
                    <Text style={styles.chatName}>{chat.name}</Text>
                    {isPinned ? (
                      <MaterialCommunityIcons name="pin" size={14} color={colors.muted} />
                    ) : null}
                  </View>
                  <Text style={styles.chatPreview}>{previewText}</Text>
                </View>
                <View style={styles.chatStatus}>
                  {presence.showBadge ? (
                    <View style={shared.badge}>
                      <Text style={shared.badgeText}>{presence.badgeLabel}</Text>
                    </View>
                  ) : (
                    <PulseBadge size={9} color={presence.statusColor} />
                  )}
                  <Text style={[styles.chatStatusText, { color: presence.statusColor }]}>{presence.statusLabel}</Text>
                </View>
              </View>
              <Text style={styles.chatPeer}>
                {chat.peerAddress ? `Peer: ${chat.peerAddress}` : 'Ready to sync when server is running'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], shared: ReturnType<typeof createSecureChatStyles>) =>
  StyleSheet.create({
    container: {
      marginTop: 16,
      flex: 1,
      backgroundColor: colors.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    listContent: {
      paddingTop: 16,
      paddingBottom: 120,
    },
    chatCard: {
      ...shared.surfaceCard,
      marginBottom: 12,
      padding: 12,
    },
    chatCardActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '12',
    },
    chatRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 10,
    },
    chatMeta: {
      flex: 1,
      paddingRight: 8,
    },
    chatName: {
      fontWeight: '600',
      color: colors.text,
    },
    chatNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    chatPreview: {
      marginTop: 4,
      color: colors.muted,
    },
    chatStatus: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chatStatusText: {
      marginLeft: 6,
      fontSize: 12,
      fontWeight: '600',
    },
    chatPeer: {
      marginTop: 8,
      fontSize: 12,
      color: colors.muted,
    },
  });

const deriveChatAvatarSource = (chat: ChatThread): ChatAvatarSource => ({
  avatarType: 'identicon',
  seed: chat.peerAddress || chat.id || chat.name || 'chat',
});
