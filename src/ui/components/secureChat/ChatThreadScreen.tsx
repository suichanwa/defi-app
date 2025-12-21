import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '@components/PulseBadge';
import type { ChatAvatarSource, ChatMessage, ChatThread, ServerInfo } from '@app-types/secureChat';
import { useTheme } from '@theme/ThemeProvider';
import ChatAvatar from '@components/secureChat/ChatAvatar';
import PrivateChatHeader from '@components/secureChat/PrivateChatHeader';
import ViewProfileModal from '@components/secureChat/ViewProfileModal';

type Props = {
  chat: ChatThread | null;
  messages: ChatMessage[];
  draft: string;
  serverInfo: ServerInfo | null;
  participantCount?: number;
  currentUserId?: string;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  resolveAvatar: (message: ChatMessage) => ChatAvatarSource;
  resolveAuthorName: (message: ChatMessage) => string;
  onStartDM?: (userId: string, userName: string) => void;
};

// Bottom navigation bar height - should match your App.tsx nav height
const BOTTOM_NAV_HEIGHT = 70;

// Spring config for smooth animations
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

type SelectedProfile = {
  name: string;
  userId?: string;
  avatarSource: ChatAvatarSource;
  isOnline: boolean;
} | null;

export default function ChatThreadScreen({
  chat,
  messages,
  draft,
  serverInfo,
  participantCount = 0,
  currentUserId,
  onBack,
  onDraftChange,
  onSend,
  resolveAvatar,
  resolveAuthorName,
  onStartDM,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createChatStyles(colors), [colors]);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const isInitialMount = useRef(true);
  const prevMessagesLength = useRef(messages.length);

  // Animated values
  const keyboardHeight = useSharedValue(0);
  const inputFocused = useSharedValue(0);

  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile>(null);

  const handleAvatarPress = useCallback((msg: ChatMessage) => {
    const isCurrentUser = msg.outgoing === true;
    const avatarSource = resolveAvatar(msg);
    const authorName = resolveAuthorName(msg);
    
    // Generate userId for the message author
    const messageUserId = msg.authorId ?? `anon-${msg.author?.replace(/[^a-zA-Z0-9]/g, '-') ?? 'unknown'}`;
    
    setSelectedProfile({
      name: authorName,
      userId: isCurrentUser ? currentUserId : messageUserId,
      avatarSource,
      isOnline: true,
    });
  }, [resolveAvatar, resolveAuthorName, currentUserId]);

  const scrollToBottom = useCallback((animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated });
    }
  }, [messages.length]);

  // Scroll to bottom on initial load (no animation)
  useEffect(() => {
    if (isInitialMount.current && messages.length > 0) {
      isInitialMount.current = false;
      // Use requestAnimationFrame for more reliable timing
      requestAnimationFrame(() => {
        scrollToBottom(false);
      });
    }
  }, [messages.length, scrollToBottom]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (!isInitialMount.current && messages.length > prevMessagesLength.current) {
      // New message added, scroll with animation
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Handle keyboard events with smooth animation
  useEffect(() => {
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';

    const showListener = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates.height;
      const extraPadding = -20;
      const targetHeight = isIOS ? 0 : height - BOTTOM_NAV_HEIGHT + extraPadding;

      // Animate keyboard height change
      keyboardHeight.value = withSpring(targetHeight, SPRING_CONFIG);
      inputFocused.value = withTiming(1, { duration: 250 });

      // Scroll after keyboard animation starts
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    });

    const hideListener = Keyboard.addListener(hideEvent, () => {
      keyboardHeight.value = withSpring(0, SPRING_CONFIG);
      inputFocused.value = withTiming(0, { duration: 200 });
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [isIOS, keyboardHeight, inputFocused, scrollToBottom]);

  // Animated style for container margin
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    marginBottom: keyboardHeight.value,
  }));

  // Animated style for input bar glow effect
  const inputBarAnimatedStyle = useAnimatedStyle(() => {
    const borderWidth = interpolate(
      inputFocused.value,
      [0, 1],
      [1, 2],
      Extrapolation.CLAMP
    );
    const shadowOpacity = interpolate(
      inputFocused.value,
      [0, 1],
      [0, 0.15],
      Extrapolation.CLAMP
    );

    return {
      borderWidth,
      shadowOpacity,
      transform: [
        {
          scale: interpolate(
            inputFocused.value,
            [0, 1],
            [1, 1.01],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  });

  // Animated style for messages list when keyboard opens
  const messagesAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      inputFocused.value,
      [0, 0.5, 1],
      [1, 0.98, 1],
      Extrapolation.CLAMP
    ),
  }));

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
          <ChatAvatar
            source={avatarSource}
            variant="incoming"
            style={styles.avatarSlotIncoming}
            onPress={() => handleAvatarPress(msg)}
          />
        )}
        <View style={bubbleStyle}>
          <TouchableOpacity onPress={() => handleAvatarPress(msg)} activeOpacity={0.7}>
            <Text style={authorStyle}>{authorLabel}</Text>
          </TouchableOpacity>
          <Text style={bodyStyle}>{msg.content}</Text>
          <Text style={timeStyle}>{msg.timestamp}</Text>
        </View>
        {isOutgoing && (
          <ChatAvatar
            source={avatarSource}
            variant="outgoing"
            style={styles.avatarSlotOutgoing}
            onPress={() => handleAvatarPress(msg)}
          />
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
      <Animated.View style={[styles.container, containerAnimatedStyle]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerMain}>
            <View style={styles.headerTitleRow}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
              </TouchableOpacity>
              <PrivateChatHeader chat={chat} />
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
        <Animated.View style={[styles.messageListWrapper, messagesAnimatedStyle]}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onLayout={() => {
              // Scroll to bottom when layout completes
              if (messages.length > 0) {
                scrollToBottom(false);
              }
            }}
            onContentSizeChange={() => {
              // Scroll when content size changes (new messages)
              if (messages.length > 0) {
                scrollToBottom(true);
              }
            }}
            maintainVisibleContentPosition={
              isIOS
                ? {
                    minIndexForVisible: 0,
                    autoscrollToTopThreshold: 100,
                  }
                : undefined
            }
            inverted={false}
            removeClippedSubviews={false}
          />
        </Animated.View>

        {/* Input Bar with animation */}
        <Animated.View
          style={[
            styles.inputBar,
            {
              borderColor: colors.accent,
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 8,
              elevation: 3,
            },
            inputBarAnimatedStyle,
          ]}
        >
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
        </Animated.View>
      </Animated.View>

      <ViewProfileModal
        visible={selectedProfile !== null}
        name={selectedProfile?.name ?? ''}
        userId={selectedProfile?.userId}
        avatarSource={selectedProfile?.avatarSource ?? { avatarType: 'identicon', seed: 'default' }}
        isOnline={selectedProfile?.isOnline ?? false}
        onClose={() => setSelectedProfile(null)}
        onStartDM={onStartDM}
      />
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
    messageListWrapper: {
      flex: 1,
      marginTop: 16,
    },
    messageList: {
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
