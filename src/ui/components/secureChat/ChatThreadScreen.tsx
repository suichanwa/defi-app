import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  Image,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ChatAvatarSource, ChatMessage, ChatThread, ServerInfo } from '@app-types/secureChat';
import { useTheme } from '@theme/ThemeProvider';
import { CHAT_HISTORY_SCROLL_THRESHOLD } from '@constants/secureChatScreen';
import ChatAvatar from '@components/secureChat/ChatAvatar';
import ChatInputBar from '@components/secureChat/ChatInputBar';
import ChatThreadHeader from '@components/secureChat/ChatThreadHeader';
import ViewProfileModal from '@components/secureChat/ViewProfileModal';
import ChatImageViewer from '@components/secureChat/ChatImageViewer';
import MessageSettingsMenu from '@components/secureChat/MessageSettingsMenu';

type Props = {
  chat: ChatThread | null;
  messages: ChatMessage[];
  draft: string;
  serverInfo: ServerInfo | null;
  participantCount?: number;
  currentUserId?: string;
  currentUserLabel?: string;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onPickImage?: () => void;
  onClearAttachment?: () => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  attachmentUri?: string | null;
  resolveAvatar: (message: ChatMessage) => ChatAvatarSource;
  resolveAuthorName: (message: ChatMessage) => string;
  onCopyMessage?: (message: ChatMessage) => void;
  onReplyMessage?: (message: ChatMessage) => void;
  onEditMessage?: (message: ChatMessage) => void;
  onDeleteMessage?: (message: ChatMessage) => void;
  onStartDM?: (userId: string, userName: string) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
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
  currentUserLabel,
  onBack,
  onDraftChange,
  onSend,
  onPickImage,
  onClearAttachment,
  onLoadMore,
  isLoadingMore = false,
  hasMoreMessages = false,
  attachmentUri,
  resolveAvatar,
  resolveAuthorName,
  onCopyMessage,
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onStartDM,
  isMuted,
  onToggleMute,
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
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

  const canManageMessage = useCallback(
    (message: ChatMessage) => {
      if (message.outgoing === true) return true;
      if (currentUserId && message.authorId && message.authorId === currentUserId) return true;
      if (currentUserLabel && message.author === currentUserLabel) return true;
      return false;
    },
    [currentUserId, currentUserLabel],
  );

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
        <Animated.View entering={FadeInDown.duration(200)} style={[styles.messageBubble, styles.messageSystem]}>
          <Text style={styles.messageText}>{msg.content}</Text>
          <Text style={styles.messageTime}>{msg.timestamp}</Text>
        </Animated.View>
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
    const isImage = msg.type === 'image' && msg.imageUri;
    const canManage = canManageMessage(msg);
    const iconColor = isOutgoing ? colors.accentText : colors.text;

    return (
      <Animated.View
        entering={FadeInDown.duration(220)}
        style={[styles.messageRow, isOutgoing ? styles.rowOutgoing : styles.rowIncoming]}
      >
        {!isOutgoing && (
          <ChatAvatar
            source={avatarSource}
            variant="incoming"
            style={styles.avatarSlotIncoming}
            onPress={() => handleAvatarPress(msg)}
          />
        )}
        <View style={bubbleStyle}>
          <View style={styles.messageHeader}>
            <TouchableOpacity onPress={() => handleAvatarPress(msg)} activeOpacity={0.7} style={styles.authorButton}>
              <Text style={authorStyle} numberOfLines={1}>
                {authorLabel}
              </Text>
            </TouchableOpacity>
            <MessageSettingsMenu
              canManage={canManage}
              canEdit={msg.type !== 'image'}
              iconColor={iconColor}
              onCopy={() => onCopyMessage?.(msg)}
              onReply={() => onReplyMessage?.(msg)}
              onEdit={onEditMessage ? () => onEditMessage(msg) : undefined}
              onDelete={onDeleteMessage ? () => onDeleteMessage(msg) : undefined}
            />
          </View>
          {isImage ? (
            <TouchableOpacity onPress={() => setSelectedImageUri(msg.imageUri as string)} activeOpacity={0.8}>
              <Image source={{ uri: msg.imageUri as string }} style={styles.messageImage} resizeMode="cover" />
            </TouchableOpacity>
          ) : (
            <Text style={bodyStyle}>{msg.content}</Text>
          )}
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
      </Animated.View>
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
        <ChatThreadHeader
          chat={chat}
          serverInfo={serverInfo}
          onBack={onBack}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
        />

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
            onScroll={(event) => {
              if (!onLoadMore || isLoadingMore || !hasMoreMessages) return;
              const offsetY = event.nativeEvent.contentOffset.y;
              if (offsetY <= CHAT_HISTORY_SCROLL_THRESHOLD) {
                onLoadMore();
              }
            }}
            scrollEventThrottle={16}
            maintainVisibleContentPosition={{
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 100,
            }}
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
          <ChatInputBar
            draft={draft}
            onDraftChange={onDraftChange}
            onSend={onSend}
            onPickImage={onPickImage ?? (() => undefined)}
            onClearAttachment={onClearAttachment}
            attachmentUri={attachmentUri}
          />
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
      <ChatImageViewer
        uri={selectedImageUri}
        visible={selectedImageUri !== null}
        onClose={() => setSelectedImageUri(null)}
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
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    authorButton: {
      flexShrink: 1,
      paddingRight: 6,
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
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.card,
      padding: 8,
      marginTop: 8,
    },
    messageImage: {
      marginTop: 6,
      width: 180,
      height: 180,
      borderRadius: 10,
    },
  });
