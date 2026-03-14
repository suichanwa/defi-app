import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Chat, MessageType } from '@flyerhq/react-native-chat-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ChatAvatarSource, ChatMessage, ChatThread, ServerInfo } from '@app-types/securechat-types/secureChat';
import { useTheme } from '@theme/ThemeProvider';
import ChatThreadHeader from '@components/secureChat/ChatThreadHeader';
import ViewProfileModal from '@components/secureChat/ViewProfileModal';
import { convertToFlyerMessage, sortMessagesByNewest } from '@utils/flyerChatAdapter';

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
  onPickFile?: () => void;
  onClearAttachment?: () => void;
  onClearFile?: () => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  attachmentUri?: string | null;
  fileAttachment?: { uri: string; name: string } | null;
  typingLabel?: string | null;
  resolveAvatar: (message: ChatMessage) => ChatAvatarSource;
  resolveAuthorName: (message: ChatMessage) => string;
  onCopyMessage?: (message: ChatMessage) => void;
  onReplyMessage?: (message: ChatMessage) => void;
  onEditMessage?: (message: ChatMessage) => void;
  onDeleteMessage?: (message: ChatMessage) => void;
  onStartP2P?: (userId: string, userName: string) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
};

const BOTTOM_NAV_HEIGHT = 0;

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
  onPickFile,
  onClearAttachment,
  onClearFile,
  onLoadMore,
  isLoadingMore = false,
  hasMoreMessages = false,
  attachmentUri,
  fileAttachment,
  typingLabel,
  resolveAvatar,
  resolveAuthorName,
  onCopyMessage,
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onStartP2P,
  isMuted,
  onToggleMute,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createChatStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';

  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);

  // Animation for send button
  const sendButtonScale = useRef(new Animated.Value(draft.trim().length > 0 ? 1 : 0)).current;
  const sendButtonOpacity = useRef(new Animated.Value(draft.trim().length > 0 ? 1 : 0)).current;

  // Animate send button when draft changes
  useEffect(() => {
    const hasText = draft.trim().length > 0;

    Animated.parallel([
      Animated.spring(sendButtonScale, {
        toValue: hasText ? 1 : 0,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
      Animated.timing(sendButtonOpacity, {
        toValue: hasText ? 1 : 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [draft, sendButtonScale, sendButtonOpacity]);

  // Convert messages to Flyer format
  const flyerMessages = useMemo(() => {
    return messages.map((msg) => convertToFlyerMessage(msg, currentUserId));
  }, [messages, currentUserId]);

  // Sort messages newest first (Flyer requirement)
  const sortedMessages = useMemo(() => sortMessagesByNewest(flyerMessages), [flyerMessages]);

  // Current user for Flyer
  const flyerUser = useMemo(
    () => ({
      id: currentUserId ?? currentUserLabel ?? 'current-user',
    }),
    [currentUserId, currentUserLabel]
  );

  // Handle send
  const handleSendPress = useCallback(
    (_message: MessageType.PartialText) => {
      if (draft.trim().length > 0 || attachmentUri || fileAttachment) {
        onSend();
      }
    },
    [onSend, draft, attachmentUri, fileAttachment]
  );

  // Handle file message press (images are handled by Flyer UI automatically)
  const handleMessagePress = useCallback((message: MessageType.Any) => {
    if (message.type === 'file') {
      const fileMsg = message as MessageType.File;
      Linking.openURL(fileMsg.uri).catch(() => undefined);
    }
    // Image messages are handled by Flyer UI's built-in image viewer
  }, []);

  // Handle attachment button press (add photos/files)
  const handleAttachmentPress = useCallback(() => {
    onPickImage?.();
  }, [onPickImage]);

  const handleLoadOlder = useCallback(() => {
    if (!onLoadMore) return;
    if (isLoadingMore) return;
    if (!hasMoreMessages) return;
    onLoadMore();
  }, [hasMoreMessages, isLoadingMore, onLoadMore]);

  // Handle message long press for actions
  const handleMessageLongPress = useCallback(
    (message: MessageType.Any) => {
      // Find original message
      const originalMsg = messages.find((m) => m.id === message.id);
      if (!originalMsg) return;
      setSelectedMessage(originalMsg);
    },
    [messages]
  );

  // Check if user can manage message
  const canManageMessage = useCallback(
    (message: ChatMessage) => {
      if (message.outgoing === true) return true;
      if (currentUserId && message.authorId && message.authorId === currentUserId) return true;
      if (currentUserLabel && message.author === currentUserLabel) return true;
      return false;
    },
    [currentUserId, currentUserLabel]
  );

  // Handle message actions
  const handleCopyMessage = useCallback(() => {
    if (selectedMessage) {
      onCopyMessage?.(selectedMessage);
      setSelectedMessage(null);
    }
  }, [selectedMessage, onCopyMessage]);

  const handleReplyMessage = useCallback(() => {
    if (selectedMessage) {
      onReplyMessage?.(selectedMessage);
      setSelectedMessage(null);
    }
  }, [selectedMessage, onReplyMessage]);

  const handleEditMessage = useCallback(() => {
    if (selectedMessage) {
      onEditMessage?.(selectedMessage);
      setSelectedMessage(null);
    }
  }, [selectedMessage, onEditMessage]);

  const handleDeleteMessage = useCallback(() => {
    if (selectedMessage) {
      onDeleteMessage?.(selectedMessage);
      setSelectedMessage(null);
    }
  }, [selectedMessage, onDeleteMessage]);

  // Flyer theme matching design
  const flyerTheme = useMemo(
    () => ({
      fonts: {
        dateDividerTextStyle: { fontSize: 11, color: colors.muted },
        emptyChatPlaceholderTextStyle: { fontSize: 15, color: colors.muted },
        inputTextStyle: { fontSize: 15, color: colors.text },
        receivedMessageBodyTextStyle: { fontSize: 15, color: colors.text },
        receivedMessageCaptionTextStyle: { fontSize: 13, color: colors.text },
        receivedMessageLinkDescriptionTextStyle: { fontSize: 12, color: colors.text },
        receivedMessageLinkTitleTextStyle: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
        sentMessageBodyTextStyle: { fontSize: 15, color: colors.accentText },
        sentMessageCaptionTextStyle: { fontSize: 13, color: colors.accentText },
        sentMessageLinkDescriptionTextStyle: { fontSize: 12, color: colors.accentText },
        sentMessageLinkTitleTextStyle: { fontSize: 14, fontWeight: '600' as const, color: colors.accentText },
        userAvatarTextStyle: { fontSize: 12, fontWeight: '600' as const, color: colors.accentText },
        userNameTextStyle: { fontSize: 13, fontWeight: '700' as const, color: colors.text },
      },
      colors: {
        background: colors.card,
        error: '#ef4444',
        inputBackground: colors.background,
        inputText: colors.text,
        primary: colors.accent,
        secondary: `${colors.accent}22`,
        receivedMessageDocumentIcon: colors.text,
        sentMessageDocumentIcon: colors.accentText,
        userAvatarImageBackground: colors.accent,
        userAvatarNameColors: [colors.accent, colors.text, colors.muted],
      },
      borders: {
        inputBorderRadius: 12,
        messageBorderRadius: 14,
      },
      insets: {
        messageInsetsHorizontal: 10,
        messageInsetsVertical: 8,
      },
      icons: {
        attachmentButtonIcon: () => (
          <MaterialCommunityIcons name="image-outline" size={20} color={colors.text} />
        ),
        sendButtonIcon: () => <MaterialCommunityIcons name="send" size={20} color={colors.text} />,
      },
    }),
    [colors]
  );

  if (!chat) {
    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="message-text-lock-outline" size={48} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No chat selected</Text>
        <Text style={styles.emptySubtitle}>Choose a chat or start a secure connection.</Text>
      </View>
    );
  }

  const canManage = selectedMessage ? canManageMessage(selectedMessage) : false;
  const canEdit =
    selectedMessage && selectedMessage.type !== 'image' && selectedMessage.type !== 'file';

  const keyboardVerticalOffset = isIOS ? BOTTOM_NAV_HEIGHT + insets.bottom : 0;

  return (
    <KeyboardAvoidingView
      style={styles.outerContainer}
      behavior={isIOS ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={styles.container}>
        {/* Header */}
        <ChatThreadHeader
          chat={chat}
          serverInfo={serverInfo}
          onBack={onBack}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          typingLabel={typingLabel ?? ''}
        />

        {/* Flyer Chat Component */}
        <View style={styles.chatWrapper}>
          <Chat
            messages={sortedMessages}
            onSendPress={handleSendPress}
            user={flyerUser}
            theme={flyerTheme}
            onMessagePress={handleMessagePress}
            onMessageLongPress={handleMessageLongPress}
            onAttachmentPress={handleAttachmentPress}
            disableImageGallery={false}
            enableAnimation={true}
            sendButtonVisibilityMode={attachmentUri || fileAttachment ? 'always' : 'editing'}
            showUserAvatars={true}
            showUserNames={true}
            flatListProps={{
              contentContainerStyle: {
                paddingTop: 8,
                paddingBottom: 8,
              },
              onEndReached: handleLoadOlder,
              onEndReachedThreshold: 0.25,
              ListFooterComponent:
                isLoadingMore && hasMoreMessages ? (
                  <View style={styles.loadMoreFooter}>
                    <ActivityIndicator size="small" color={colors.muted} />
                    <Text style={styles.loadMoreText}>Loading older messages...</Text>
                  </View>
                ) : null,
              maintainVisibleContentPosition: {
                minIndexForVisible: 0,
              },
            }}
            textInputProps={{
              value: draft,
              onChangeText: onDraftChange,
              placeholder: 'Type a message...',
             placeholderTextColor: colors.muted,
            }}
          />
        </View>
      </View>

      {/* Message Actions Modal */}
      {selectedMessage && (
        <View style={styles.actionOverlay}>
          <TouchableOpacity
            style={styles.actionBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedMessage(null)}
          />
          <View style={styles.actionMenu}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCopyMessage}>
              <MaterialCommunityIcons name="content-copy" size={20} color={colors.text} />
              <Text style={styles.actionText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleReplyMessage}>
              <MaterialCommunityIcons name="reply" size={20} color={colors.text} />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
            {canManage && canEdit && onEditMessage && (
              <TouchableOpacity style={styles.actionButton} onPress={handleEditMessage}>
                <MaterialCommunityIcons name="pencil" size={20} color={colors.text} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
            )}
            {canManage && onDeleteMessage && (
              <TouchableOpacity style={styles.actionButton} onPress={handleDeleteMessage}>
                <MaterialCommunityIcons name="delete" size={20} color={'#ef4444'} />
                <Text style={[styles.actionText, { color: '#ef4444' }]}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ViewProfileModal
        visible={selectedProfile !== null}
        name={selectedProfile?.name ?? ''}
        userId={selectedProfile?.userId}
        avatarSource={selectedProfile?.avatarSource ?? { avatarType: 'identicon', seed: 'default' }}
        isOnline={selectedProfile?.isOnline ?? false}
        onClose={() => setSelectedProfile(null)}
        onStartP2P={onStartP2P}
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
  error?: string;
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
      width: '100%',
      maxWidth: 760,
      alignSelf: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 8,
    },
    chatWrapper: {
      flex: 1,
      marginTop: 4,
    },
    loadMoreFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 10,
    },
    loadMoreText: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '500',
    },
    actionOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    actionBackdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    actionMenu: {
      backgroundColor: colors.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 8,
      minWidth: 200,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 12,
    },
    actionText: {
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
    },
  });

