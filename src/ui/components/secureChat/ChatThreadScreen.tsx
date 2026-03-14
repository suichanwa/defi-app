import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Chat, ImageMessage, MessageType } from '@flyerhq/react-native-chat-ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ChatAvatarSource, ChatMessage, ChatThread, ServerInfo } from '@app-types/securechat-types/secureChat';
import { useTheme } from '@theme/ThemeProvider';
import ChatThreadHeader from '@components/secureChat/ChatThreadHeader';
import ViewProfileModal from '@components/secureChat/ViewProfileModal';
import ChatInputBar from '@components/secureChat/ChatInputBar';
import { convertToFlyerMessage, type FlyerMessageWithMeta } from '@utils/flyerChatAdapter';

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
const AVATAR_PALETTE = ['#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'];

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

  const sortedChatMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [messages]);

  // Convert messages to Flyer format (pre-sorted)
  const sortedMessages = useMemo(() => {
    if (sortedChatMessages.length === 0) return [];
    const baseTime = sortedChatMessages[0].createdAt
      ? new Date(sortedChatMessages[0].createdAt).getTime()
      : Date.now();
    return sortedChatMessages.map((msg, index) =>
      convertToFlyerMessage(msg, currentUserId, baseTime - index * 30000)
    );
  }, [sortedChatMessages, currentUserId]);

  // Current user for Flyer
  const flyerUser = useMemo(
    () => ({
      id: currentUserId ?? currentUserLabel ?? 'current-user',
    }),
    [currentUserId, currentUserLabel]
  );

  const getAvatarColor = useCallback((seed: string) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % AVATAR_PALETTE.length;
    return AVATAR_PALETTE[index];
  }, []);

  const getInitials = useCallback((label: string) => {
    const parts = label.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }, []);

  const getTimeLabel = useCallback((message: FlyerMessageWithMeta) => {
    if (message.metadata?.timeLabel) return message.metadata.timeLabel;
    if (message.metadata?.createdAtMs) {
      return new Date(message.metadata.createdAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  }, []);

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
        dateDividerTextStyle: { fontSize: 10, color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' as const },
        emptyChatPlaceholderTextStyle: { fontSize: 15, color: colors.muted },
        inputTextStyle: { fontSize: 15, color: colors.text },
        receivedMessageBodyTextStyle: { fontSize: 15, color: colors.text, fontWeight: '500' as const },
        receivedMessageCaptionTextStyle: { fontSize: 13, color: colors.text },
        receivedMessageLinkDescriptionTextStyle: { fontSize: 12, color: colors.text },
        receivedMessageLinkTitleTextStyle: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
        sentMessageBodyTextStyle: { fontSize: 15, color: colors.accentText, fontWeight: '500' as const },
        sentMessageCaptionTextStyle: { fontSize: 13, color: colors.accentText },
        sentMessageLinkDescriptionTextStyle: { fontSize: 12, color: colors.accentText },
        sentMessageLinkTitleTextStyle: { fontSize: 14, fontWeight: '600' as const, color: colors.accentText },
        userAvatarTextStyle: { fontSize: 11, fontWeight: '700' as const, color: '#ffffff' },
        userNameTextStyle: { fontSize: 12, fontWeight: '700' as const, color: colors.text, letterSpacing: 0.4, textTransform: 'uppercase' as const },
      },
      colors: {
        background: colors.card,
        error: '#ef4444',
        inputBackground: colors.card,
        inputText: colors.text,
        primary: colors.accent,
        secondary: colors.card,
        receivedMessageDocumentIcon: colors.text,
        sentMessageDocumentIcon: colors.accentText,
        userAvatarImageBackground: colors.accent,
        userAvatarNameColors: AVATAR_PALETTE,
      },
      borders: {
        inputBorderRadius: 14,
        messageBorderRadius: 18,
      },
      insets: {
        messageInsetsHorizontal: 0,
        messageInsetsVertical: 0,
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

  const renderBubble = useCallback(
    ({ child, message, nextMessageInGroup }: { child: React.ReactNode; message: MessageType.Any; nextMessageInGroup: boolean }) => {
      const isOwn = message.author.id === flyerUser.id;
      if (message.type === 'image') {
        return (
          <View
            style={[
              styles.imageBubble,
              isOwn ? styles.imageBubbleOutgoing : styles.imageBubbleIncoming,
              nextMessageInGroup && styles.imageBubbleGrouped,
            ]}
          >
            {child}
          </View>
        );
      }

      return (
        <View
          style={[
            styles.bubble,
            isOwn ? styles.bubbleOutgoing : styles.bubbleIncoming,
            nextMessageInGroup && (isOwn ? styles.bubbleOutgoingGrouped : styles.bubbleIncomingGrouped),
          ]}
        >
          {child}
        </View>
      );
    },
    [flyerUser.id, styles]
  );

  const renderTextMessage = useCallback(
    (message: MessageType.Text, _messageWidth: number, showName?: boolean) => {
      const typed = message as FlyerMessageWithMeta;
      const isOwn = message.author.id === flyerUser.id;
      const timeLabel = getTimeLabel(typed);
      const authorLabel = message.author.firstName ?? message.author.id ?? '';
      const avatarColor = getAvatarColor(authorLabel);
      const initials = getInitials(authorLabel);

      return (
        <View style={styles.messageBody}>
          {!isOwn && showName ? (
            <View style={styles.metaRow}>
              <View style={[styles.avatarBadge, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarBadgeText}>{initials}</Text>
              </View>
              <Text style={styles.authorLabel}>{authorLabel}</Text>
            </View>
          ) : null}
          <Text style={[styles.messageText, isOwn ? styles.messageTextOutgoing : styles.messageTextIncoming]}>
            {message.text}
          </Text>
          {timeLabel ? (
            <Text style={[styles.timeText, isOwn ? styles.timeTextOutgoing : styles.timeTextIncoming]}>
              {timeLabel}
            </Text>
          ) : null}
        </View>
      );
    },
    [flyerUser.id, getAvatarColor, getInitials, getTimeLabel, styles]
  );

  const renderImageMessage = useCallback(
    (message: MessageType.Image, messageWidth: number) => {
      const typed = message as FlyerMessageWithMeta;
      const isOwn = message.author.id === flyerUser.id;
      const timeLabel = getTimeLabel(typed);
      const caption = typed.metadata?.caption;
      const authorLabel = message.author.firstName ?? message.author.id ?? '';
      const avatarColor = getAvatarColor(authorLabel);
      const initials = getInitials(authorLabel);

      return (
        <View>
          {!isOwn ? (
            <View style={styles.metaRow}>
              <View style={[styles.avatarBadge, { backgroundColor: avatarColor }]}>
                <Text style={styles.avatarBadgeText}>{initials}</Text>
              </View>
              <Text style={styles.authorLabel}>{authorLabel}</Text>
            </View>
          ) : null}
          <View style={styles.imageContainer}>
            <ImageMessage message={message} messageWidth={messageWidth} />
            <View pointerEvents="none" style={styles.imageOverlay}>
              <View style={styles.imageOverlayInner}>
                <Text style={styles.imageMetaText}>{message.name ?? 'Photo'}</Text>
                {timeLabel ? <Text style={styles.imageMetaTime}>{timeLabel}</Text> : null}
              </View>
            </View>
          </View>
          {caption ? (
            <Text style={[styles.imageCaption, isOwn ? styles.imageCaptionOutgoing : styles.imageCaptionIncoming]}>
              {caption}
            </Text>
          ) : null}
        </View>
      );
    },
    [flyerUser.id, getAvatarColor, getInitials, getTimeLabel, styles]
  );

  const renderInputBar = useCallback(
    () => (
      <View style={styles.inputBarWrapper}>
        <ChatInputBar
          draft={draft}
          onDraftChange={onDraftChange}
          onSend={onSend}
          onPickImage={onPickImage ?? (() => undefined)}
          onPickFile={onPickFile}
          attachmentUri={attachmentUri}
          fileAttachment={fileAttachment}
          onClearAttachment={onClearAttachment}
          onClearFile={onClearFile}
          placeholder="Type a message..."
        />
      </View>
    ),
    [
      attachmentUri,
      draft,
      fileAttachment,
      onClearAttachment,
      onClearFile,
      onDraftChange,
      onPickFile,
      onPickImage,
      onSend,
      styles,
    ]
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

  const keyboardBehavior = isIOS ? 'padding' : 'height';
  const keyboardVerticalOffset = isIOS ? BOTTOM_NAV_HEIGHT + insets.bottom : 0;

  return (
    <KeyboardAvoidingView
      style={styles.outerContainer}
      behavior={keyboardBehavior}
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
            renderBubble={renderBubble}
            renderTextMessage={renderTextMessage}
            renderImageMessage={renderImageMessage}
            onMessagePress={handleMessagePress}
            onMessageLongPress={handleMessageLongPress}
            customBottomComponent={renderInputBar}
            disableImageGallery={false}
            enableAnimation={true}
            showUserAvatars={false}
            showUserNames={true}
            flatListProps={{
              contentContainerStyle: {
                paddingTop: 6,
                paddingBottom: 0,
              },
              onEndReached: handleLoadOlder,
              onEndReachedThreshold: 0.25,
              keyboardShouldPersistTaps: 'handled',
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
    bubble: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 18,
    },
    bubbleOutgoing: {
      backgroundColor: colors.accent,
      borderBottomRightRadius: 8,
      shadowColor: colors.accent,
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    bubbleOutgoingGrouped: {
      borderBottomRightRadius: 18,
    },
    bubbleIncoming: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomLeftRadius: 8,
    },
    bubbleIncomingGrouped: {
      borderBottomLeftRadius: 18,
    },
    imageBubble: {
      borderRadius: 20,
      overflow: 'hidden',
    },
    imageBubbleOutgoing: {
      backgroundColor: colors.accent,
      borderWidth: 0,
      shadowColor: colors.accent,
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    imageBubbleIncoming: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    imageBubbleGrouped: {
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    messageBody: {
      gap: 6,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 2,
    },
    avatarBadge: {
      width: 24,
      height: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    avatarBadgeText: {
      color: '#ffffff',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    authorLabel: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      color: colors.muted,
    },
    messageText: {
      fontSize: 15,
      lineHeight: 20,
    },
    messageTextIncoming: {
      color: colors.text,
    },
    messageTextOutgoing: {
      color: colors.accentText,
    },
    timeText: {
      fontSize: 11,
      letterSpacing: 0.4,
      marginTop: 2,
    },
    timeTextIncoming: {
      color: colors.muted,
    },
    timeTextOutgoing: {
      color: `${colors.accentText}CC`,
      alignSelf: 'flex-end',
    },
    imageContainer: {
      borderRadius: 18,
      overflow: 'hidden',
      backgroundColor: colors.border,
    },
    imageCaption: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      lineHeight: 20,
    },
    imageCaptionIncoming: {
      color: colors.text,
    },
    imageCaptionOutgoing: {
      color: colors.accentText,
    },
    imageOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    imageOverlayInner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: 'rgba(0, 0, 0, 0.35)',
    },
    imageMetaText: {
      fontSize: 11,
      color: '#f8fafc',
      fontWeight: '600',
    },
    imageMetaTime: {
      fontSize: 11,
      color: '#e2e8f0',
      fontWeight: '600',
    },
    inputBarWrapper: {
      marginTop: 8,
      paddingBottom: 6,
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

