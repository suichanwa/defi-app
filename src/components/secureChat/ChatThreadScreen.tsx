import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '../PulseBadge';
import type { ChatAvatarSource, ChatMessage, ChatThread, ServerInfo } from '../../types/secureChat';
import { useTheme } from '../../theme/ThemeProvider';
import ChatAvatar from './ChatAvatar';

type Props = {
  chat: ChatThread | null;
  messages: ChatMessage[];
  draft: string;
  serverInfo: ServerInfo | null;
  participantCount?: number;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  resolveAvatar: (message: ChatMessage) => ChatAvatarSource;
  resolveAuthorName: (message: ChatMessage) => string;
};

// Bottom navigation bar height - should match your App.tsx nav height
const BOTTOM_NAV_HEIGHT = 70;

export default function ChatThreadScreen({
  chat,
  messages,
  draft,
  serverInfo,
  participantCount = 0,
  onBack,
  onDraftChange,
  onSend,
  resolveAvatar,
  resolveAuthorName,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createChatStyles(colors), [colors]);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle keyboard events for Android
  useEffect(() => {
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      // On Android, we need to account for the bottom nav being pushed up
      // Add extra padding to ensure input is visible above keyboard
      const height = e.endCoordinates.height;
      const extraPadding = -20; // Extra space above keyboard
      setKeyboardHeight(isIOS ? 0 : height - BOTTOM_NAV_HEIGHT + extraPadding);
      scrollToBottom();
    });

    const hideListener = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [isIOS]);

  if (!chat) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="message-text-lock-outline" size={48} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No chat selected</Text>
        <Text style={styles.emptySubtitle}>Choose a chat or start a secure connection.</Text>
      </View>
    );
  }

  const renderMessage = ({ item: msg }: { item: ChatMessage }) => {
    if (msg.type === 'system') {
      return (
        <View style={[styles.messageBubble, styles.messageSystem]}>
          <Text style={styles.messageText}>{msg.content}</Text>
          <Text style={styles.messageTime}>{msg.timestamp}</Text>
        </View>
      );
    }
    const bubbleStyle = [
      styles.messageBubble,
      msg.outgoing ? styles.messageOutgoing : styles.messageIncoming,
    ];
    const authorStyle = msg.outgoing ? styles.messageTextOutgoing : styles.messageText;
    const bodyStyle = msg.outgoing ? styles.messageBodyOutgoing : styles.messageBody;
    const timeStyle = msg.outgoing ? styles.messageTimeOutgoing : styles.messageTime;
    const isOutgoing = Boolean(msg.outgoing);
    const avatarSource = resolveAvatar(msg);
    const authorLabel = resolveAuthorName(msg);

    return (
      <View style={[styles.messageRow, isOutgoing ? styles.rowOutgoing : styles.rowIncoming]}>
        {!isOutgoing && (
          <ChatAvatar source={avatarSource} variant="incoming" style={styles.avatarSlotIncoming} />
        )}
        <View style={bubbleStyle}>
          <Text style={authorStyle}>{authorLabel}</Text>
          <Text style={bodyStyle}>{msg.content}</Text>
          <Text style={timeStyle}>{msg.timestamp}</Text>
        </View>
        {isOutgoing && (
          <ChatAvatar source={avatarSource} variant="outgoing" style={styles.avatarSlotOutgoing} />
        )}
      </View>
    );
  };

  // Calculate keyboard offset for iOS
  const keyboardVerticalOffset = isIOS ? BOTTOM_NAV_HEIGHT + insets.bottom : 0;

  return (
    <KeyboardAvoidingView
      style={styles.outerContainer}
      behavior={isIOS ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={[styles.container, { marginBottom: keyboardHeight }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerMain}>
            <View style={styles.headerTitleRow}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.statusColumn}>
            <View style={styles.statusRow}>
              <PulseBadge size={10} color={serverInfo ? colors.accent : '#f97316'} />
            </View>
            <Text style={styles.participantText}></Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#9ca3af"
            style={styles.input}
            value={draft}
            onChangeText={onDraftChange}
            onSubmitEditing={onSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity onPress={onSend} style={styles.sendButton}>
            <MaterialCommunityIcons name="send" size={18} color={colors.accentText} />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const createChatStyles = (colors: {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentText: string;
}) =>
  StyleSheet.create({
    outerContainer: {
      flex: 1,
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 24,
    },
    emptyTitle: {
      marginTop: 16,
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    emptySubtitle: {
      marginTop: 8,
      textAlign: 'center',
      color: colors.muted,
    },
    container: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    headerMain: {
      flex: 1,
      paddingRight: 12,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 8,
      padding: 8,
      borderRadius: 16,
      backgroundColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    subtitle: {
      marginTop: 4,
      color: colors.muted,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusColumn: {
      alignItems: 'flex-end',
    },
    statusText: {
      marginLeft: 6,
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
    },
    participantText: {
      marginTop: 4,
      fontSize: 12,
      color: colors.muted,
    },
    messageList: {
      marginTop: 16,
      flex: 1,
    },
    messageContent: {
      paddingBottom: 8,
      flexGrow: 1,
    },
    messageRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    rowOutgoing: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    rowIncoming: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
    },
    avatarSlotIncoming: {
      marginRight: 8,
      marginLeft: 4,
      marginTop: 2,
    },
    avatarSlotOutgoing: {
      marginLeft: 8,
      marginRight: 0,
      marginTop: 2,
    },
    messageBubble: {
      marginBottom: 0,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      maxWidth: '78%',
    },
    messageIncoming: {
      alignSelf: 'flex-start',
      backgroundColor: `${colors.accent}22`,
    },
    messageOutgoing: {
      alignSelf: 'flex-end',
      backgroundColor: colors.accent,
    },
    messageSystem: {
      alignSelf: 'center',
      backgroundColor: colors.border,
    },
    messageText: {
      fontWeight: '700',
      fontSize: 13,
      color: colors.text,
    },
    messageTextOutgoing: {
      fontWeight: '700',
      fontSize: 13,
      color: colors.accentText,
    },
    messageBody: {
      marginTop: 4,
      fontWeight: '500',
      fontSize: 15,
      color: colors.text,
    },
    messageBodyOutgoing: {
      marginTop: 4,
      fontWeight: '500',
      fontSize: 15,
      color: colors.accentText,
    },
    messageTime: {
      marginTop: 6,
      fontSize: 11,
      color: colors.muted,
    },
    messageTimeOutgoing: {
      marginTop: 6,
      fontSize: 11,
      color: colors.accentText,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      marginTop: 8,
    },
    input: {
      flex: 1,
      color: colors.text,
      minHeight: 40,
      fontSize: 16,
    },
    sendButton: {
      marginLeft: 8,
      padding: 10,
      borderRadius: 16,
      backgroundColor: colors.accent,
    },
  });