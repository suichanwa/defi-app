import React, { useMemo, useRef } from 'react';
import { Animated, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '@components/PulseBadge';
import type { ChatThread } from '@app-types/securechat-types/secureChat';
import { DEFAULT_GLOBAL_CHAT_ID } from '@constants/secureChatScreen';
import { useTheme } from '@theme/ThemeProvider';

type Props = {
  chats: ChatThread[];
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
  onOpenSelected: (chatId: string) => void;
};

export default function ChatListScreen({ chats, selectedChatId, onSelectChat, onOpenSelected }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    // Parallel animations for slide and fade
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
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
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>Borrowed from secureChat flow</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {orderedChats.map((chat) => {
          const isActive = chat.id === selectedChatId;
          const isPinned = chat.id === DEFAULT_GLOBAL_CHAT_ID;
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
                  <PulseBadge size={9} color={chat.isOnline ? '#22c55e' : '#f97316'} />
                  <Text style={styles.chatStatusText}>{chat.isOnline ? 'Online' : 'Offline'}</Text>
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

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
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
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      marginTop: 4,
      color: colors.muted,
    },
    listContent: {
      paddingTop: 16,
      paddingBottom: 120,
    },
    chatCard: {
      marginBottom: 12,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chatCardActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '12',
    },
    chatRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
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
      color: colors.text,
    },
    chatPeer: {
      marginTop: 8,
      fontSize: 12,
      color: colors.muted,
    },
  });
