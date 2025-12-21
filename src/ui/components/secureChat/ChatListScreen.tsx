import React, { useMemo, useRef } from 'react';
import { PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PulseBadge from '@components/PulseBadge';
import type { ChatThread } from '@app-types/secureChat';
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
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
        return isHorizontal && gesture.dx < -12;
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -60 && selectedChatId) {
          onOpenSelected(selectedChatId);
        }
      },
    }),
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Chats</Text>
          <Text style={styles.subtitle}>Borrowed from secureChat flow</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {chats.map((chat) => {
          const isActive = chat.id === selectedChatId;
          const lastMessage = chat.lastMessage;
          const previewText = lastMessage
            ? `${lastMessage.from ? `${lastMessage.from}: ` : ''}${lastMessage.text}`
            : 'No messages yet.';
          return (
            <TouchableOpacity
              key={chat.id}
              style={[styles.chatCard, isActive && styles.chatCardActive]}
              onPress={() => onSelectChat(chat.id)}
              activeOpacity={0.85}
            >
              <View style={styles.chatRow}>
                <View style={styles.chatMeta}>
                  <Text style={styles.chatName}>{chat.name}</Text>
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
    </View>
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
