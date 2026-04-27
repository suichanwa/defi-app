import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Linking,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Chat, ImageMessage, MessageType } from '@flyerhq/react-native-chat-ui';
import { KeyboardAccessoryView } from '@flyerhq/react-native-keyboard-accessory-view';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type {
  ChatAvatarSource,
  ChatMessage,
  ChatReplyReference,
  ChatThread,
  ServerInfo,
} from '@app-types/securechat-types/secureChat';
import { useTheme } from '@theme/ThemeProvider';
import ChatThreadHeader from '@components/secureChat/ChatThreadHeader';
import ViewProfileScreen from '@components/secureChat/ViewProfileScreen';
import ChatInputBar from '@components/secureChat/ChatInputBar';
import { CHAT_HISTORY_SCROLL_THRESHOLD } from '@constants/secureChat.constants';
import { convertToFlyerMessage, type FlyerMessageWithMeta } from '@utils/flyerChatAdapter';
import ChatAvatar from './ChatAvatar';
import { getReplyPreviewText } from '@utils/secureChatMessageEnvelope';
import { createSecureChatStyles } from '@styles/SecureChat';

type Props = {
  chat: ChatThread | null;
  messages: ChatMessage[];
  draft: string;
  replyTarget?: ChatReplyReference | null;
  serverInfo: ServerInfo | null;
  participantCount?: number;
  unreadCount?: number;
  currentUserId?: string;
  currentUserLabel?: string;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClearReplyTarget?: () => void;
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
  onDeleteChat?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
};

const AVATAR_PALETTE = ['#2563eb', '#0ea5e9', '#14b8a6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7'];
const COMPACT_TEXT_BUBBLE_MIN_WIDTH = 88;
const COMPACT_TEXT_BUBBLE_MAX_WIDTH = 122;

type SelectedProfile = {
  name: string;
  avatarSource: ChatAvatarSource;
} | null;

export default function ChatThreadScreen({
  chat,
  messages,
  draft,
  replyTarget,
  serverInfo,
  participantCount = 0,
  unreadCount = 0,
  currentUserId,
  currentUserLabel,
  onBack,
  onDraftChange,
  onSend,
  onClearReplyTarget,
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
  onDeleteChat,
  isMuted,
  onToggleMute,
}: Props) {
  const { colors } = useTheme();
  const shared = useMemo(() => createSecureChatStyles(colors), [colors]);
  const styles = useMemo(() => createChatStyles(colors, shared), [colors, shared]);
  const statusIconSize = 12;

  const [selectedProfile, setSelectedProfile] = useState<SelectedProfile>(null);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);
  const [replyJumpId, setReplyJumpId] = useState<string | null>(null);
  const loadOlderArmedRef = useRef(true);

  useEffect(() => {
    setSelectedProfile(null);
    setSelectedMessage(null);
    setReplyJumpId(null);
    loadOlderArmedRef.current = true;
    onClearReplyTarget?.();
  }, [chat?.id]);

  const sortedChatMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [messages]);

  const isDirectChat = useMemo(() => {
    if (!chat) return false;
    return chat.isDM === true || chat.id.startsWith('dm:');
  }, [chat]);

  // Convert messages to Flyer format (pre-sorted).
  // Keep true timestamps when available and only synthesize for missing createdAt.
  const sortedMessages = useMemo(() => {
    if (sortedChatMessages.length === 0) return [];
    const fallbackBaseTime = Date.now();
    return sortedChatMessages.map((msg, index) =>
      convertToFlyerMessage(msg, currentUserId, msg.createdAt ? undefined : fallbackBaseTime - index * 30000)
    );
  }, [sortedChatMessages, currentUserId]);

  // Current user for Flyer
  const flyerUser = useMemo(
    () => ({
      id: currentUserId ?? currentUserLabel ?? 'current-user',
    }),
    [currentUserId, currentUserLabel]
  );

  const selectedPeerProfile = useMemo(() => {
    const peerMessage = [...messages]
      .reverse()
      .find((message) => {
        if (message.outgoing === true) return false;
        if (currentUserId && message.authorId && message.authorId === currentUserId) return false;
        if (currentUserLabel && message.author === currentUserLabel) return false;
        return true;
      });

    const name = chat?.name?.trim() || (peerMessage ? resolveAuthorName(peerMessage) : 'Profile');
    const avatarSource = peerMessage
      ? resolveAvatar(peerMessage)
      : {
          avatarType: 'identicon' as const,
          seed: chat?.id || chat?.peerAddress || chat?.name || 'profile',
        };

    return { name, avatarSource };
  }, [chat?.id, chat?.name, chat?.peerAddress, currentUserId, currentUserLabel, messages, resolveAvatar, resolveAuthorName]);

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

  const getCompactBubbleWidth = useCallback((text: string) => {
    const normalized = text.trim().replace(/\s+/g, ' ');
    if (!normalized || normalized.includes('\n') || normalized.length > 18) return undefined;
    const estimatedTextWidth = normalized.length * 8.2 + 30;
    return Math.min(
      COMPACT_TEXT_BUBBLE_MAX_WIDTH,
      Math.max(COMPACT_TEXT_BUBBLE_MIN_WIDTH, Math.ceil(estimatedTextWidth)),
    );
  }, []);

  const flashReplyTarget = useCallback((messageId?: string) => {
    if (!messageId) return;
    setReplyJumpId(messageId);
    setTimeout(() => {
      setReplyJumpId((current) => (current === messageId ? null : current));
    }, 1500);
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

  const handleFlatListScroll = useCallback(
    (event: {
      nativeEvent: {
        contentOffset: { y: number };
        contentSize: { height: number };
        layoutMeasurement: { height: number };
      };
    }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
      const distanceFromEnd = contentSize.height - layoutMeasurement.height - contentOffset.y;
      const isNearOlderMessages = distanceFromEnd <= CHAT_HISTORY_SCROLL_THRESHOLD;

      if (!isNearOlderMessages) {
        loadOlderArmedRef.current = true;
        return;
      }

      if (!loadOlderArmedRef.current) return;
      loadOlderArmedRef.current = false;
      handleLoadOlder();
    },
    [handleLoadOlder]
  );

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

  const handleViewProfile = useCallback(() => {
    setSelectedProfile(selectedPeerProfile);
  }, [selectedPeerProfile]);

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
        sentMessageBodyTextStyle: { fontSize: 15, color: colors.text, fontWeight: '500' as const },
        sentMessageCaptionTextStyle: { fontSize: 13, color: colors.text },
        sentMessageLinkDescriptionTextStyle: { fontSize: 12, color: colors.text },
        sentMessageLinkTitleTextStyle: { fontSize: 14, fontWeight: '600' as const, color: colors.text },
        userAvatarTextStyle: { fontSize: 11, fontWeight: '700' as const, color: '#ffffff' },
        userNameTextStyle: { fontSize: 12, fontWeight: '700' as const, color: colors.text, letterSpacing: 0.4, textTransform: 'uppercase' as const },
      },
      colors: {
        background: colors.background,
        error: '#ef4444',
        inputBackground: colors.background,
        inputText: colors.text,
        primary: colors.accent,
        secondary: colors.background,
        receivedMessageDocumentIcon: colors.text,
        sentMessageDocumentIcon: colors.text,
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
        deliveredIcon: () => (
          <View style={styles.statusIconWrap}>
            <MaterialCommunityIcons
              name="check"
              size={statusIconSize}
              color={colors.accent}
              style={styles.statusIconGlyph}
            />
          </View>
        ),
        seenIcon: () => (
          <View style={styles.statusIconWrap}>
            <MaterialCommunityIcons
              name="check-all"
              size={statusIconSize}
              color={colors.accent}
              style={styles.statusIconGlyph}
            />
          </View>
        ),
        sendButtonIcon: () => <MaterialCommunityIcons name="send" size={20} color={colors.text} />,
      },
    }),
    [colors, statusIconSize, styles.statusIconGlyph, styles.statusIconWrap]
  );

  const renderBubble = useCallback(
    ({ child, message, nextMessageInGroup }: { child: React.ReactNode; message: MessageType.Any; nextMessageInGroup: boolean }) => {
      const isOwn = message.author.id === flyerUser.id;
      return (
        <View
          style={[
            styles.messageItem,
            isOwn ? styles.messageItemOutgoing : styles.messageItemIncoming,
            nextMessageInGroup && styles.messageItemGrouped,
            !nextMessageInGroup && styles.messageItemUngrouped,
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
      const shouldShowAuthor = !isOwn && showName && !isDirectChat;
      const compactBubbleWidth = getCompactBubbleWidth(message.text);
      const reply = typed.metadata?.reply;

      return (
        <View
          style={[
            styles.messageShell,
            isOwn ? styles.messageShellOutgoing : styles.messageShellIncoming,
            replyJumpId === message.id ? styles.messageShellHighlighted : null,
          ]}
        >
          {shouldShowAuthor ? (
            <View style={styles.metaRow}>
              <ChatAvatar
                source={{
                  avatarType: message.author.imageUrl ? 'custom' : 'identicon',
                  uri: message.author.imageUrl,
                  seed: message.author.id ?? authorLabel,
                }}
                variant="incoming"
                size={22}
              />
              <Text style={styles.authorLabel}>{authorLabel}</Text>
            </View>
          ) : null}
          <View
            style={[
              styles.messageSurface,
              isOwn ? styles.messageSurfaceOutgoing : styles.messageSurfaceIncoming,
              compactBubbleWidth ? { minWidth: compactBubbleWidth } : null,
            ]}
          >
            {reply ? (
              <TouchableOpacity style={styles.replyQuote} onPress={() => flashReplyTarget(reply.messageId)}>
                <View style={styles.replyQuoteBar} />
                <View style={styles.replyQuoteBody}>
                  <Text style={styles.replyQuoteAuthor} numberOfLines={1}>
                    {reply.author}
                  </Text>
                  <Text style={styles.replyQuoteText} numberOfLines={2}>
                    {getReplyPreviewText(reply)}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.messageText, isOwn ? styles.messageTextOutgoing : styles.messageTextIncoming]}>
              {message.text}
            </Text>
            {timeLabel ? (
              <Text numberOfLines={1} style={[styles.timeText, isOwn ? styles.timeTextOutgoing : styles.timeTextIncoming]}>
                {timeLabel}
              </Text>
            ) : null}
          </View>
        </View>
      );
    },
    [flyerUser.id, flashReplyTarget, getCompactBubbleWidth, getReplyPreviewText, getTimeLabel, isDirectChat, replyJumpId, styles],
  );

  const renderImageMessage = useCallback(
    (message: MessageType.Image, messageWidth: number) => {
      const typed = message as FlyerMessageWithMeta;
      const isOwn = message.author.id === flyerUser.id;
      const timeLabel = getTimeLabel(typed);
      const caption = typed.metadata?.caption;
      const reply = typed.metadata?.reply;
      const authorLabel = message.author.firstName ?? message.author.id ?? '';
      const shouldShowAuthor = !isOwn && !isDirectChat;

      return (
        <View
          style={[
            styles.messageShell,
            isOwn ? styles.messageShellOutgoing : styles.messageShellIncoming,
            replyJumpId === message.id ? styles.messageShellHighlighted : null,
          ]}
        >
          {shouldShowAuthor ? (
            <View style={styles.metaRow}>
              <ChatAvatar
                source={{
                  avatarType: message.author.imageUrl ? 'custom' : 'identicon',
                  uri: message.author.imageUrl,
                  seed: message.author.id ?? authorLabel,
                }}
                variant="incoming"
                size={22}
              />
              <Text style={styles.authorLabel}>{authorLabel}</Text>
            </View>
          ) : null}
          {reply ? (
            <TouchableOpacity style={styles.replyQuote} onPress={() => flashReplyTarget(reply.messageId)}>
              <View style={styles.replyQuoteBar} />
              <View style={styles.replyQuoteBody}>
                <Text style={styles.replyQuoteAuthor} numberOfLines={1}>
                  {reply.author}
                </Text>
                <Text style={styles.replyQuoteText} numberOfLines={2}>
                  {getReplyPreviewText(reply)}
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
          <View style={styles.imageContainer}>
            <ImageMessage message={message as any} messageWidth={messageWidth} />
            <View pointerEvents="none" style={styles.imageOverlay}>
              <View style={styles.imageOverlayInner}>
                <Text style={styles.imageMetaText}>{message.name ?? 'Photo'}</Text>
                {timeLabel ? <Text style={styles.imageMetaTime}>{timeLabel}</Text> : null}
              </View>
            </View>
          </View>
          {caption ? (
            <View style={[styles.messageSurface, isOwn ? styles.messageSurfaceOutgoing : styles.messageSurfaceIncoming]}>
              <Text style={[styles.imageCaption, isOwn ? styles.imageCaptionOutgoing : styles.imageCaptionIncoming]}>
                {caption}
              </Text>
            </View>
          ) : null}
        </View>
      );
    },
    [flyerUser.id, flashReplyTarget, getReplyPreviewText, getTimeLabel, isDirectChat, replyJumpId, styles],
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
          replyTarget={replyTarget}
          onClearReplyTarget={onClearReplyTarget}
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
      onClearReplyTarget,
      onDraftChange,
      onPickFile,
      onPickImage,
      onSend,
      replyTarget,
      styles,
    ],
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
  const canDelete = Boolean(selectedMessage && onDeleteMessage && (isDirectChat || canManage));
  const deleteLabel = isDirectChat ? 'Delete for me' : 'Delete';
  const handleBackPress = useCallback(() => {
    Keyboard.dismiss();
    setTimeout(onBack, 20);
  }, [onBack]);

  if (selectedProfile) {
    return (
      <ViewProfileScreen
        name={selectedProfile.name}
        avatarSource={selectedProfile.avatarSource}
        onBack={() => setSelectedProfile(null)}
      />
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        {/* Header */}
          <ChatThreadHeader
            chat={chat}
            onBack={handleBackPress}
            participantCount={participantCount}
            unreadCount={unreadCount}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
            onViewProfile={isDirectChat ? handleViewProfile : undefined}
            onDeleteChat={onDeleteChat}
            avatarSource={isDirectChat ? selectedPeerProfile.avatarSource : undefined}
            onAvatarPress={isDirectChat ? handleViewProfile : undefined}
          />

        {/* Flyer Chat Component */}
        <View style={styles.chatWrapper}>
          <KeyboardAccessoryView
            useListenersOnAndroid
            style={styles.keyboardAccessory}
            contentContainerStyle={styles.keyboardAccessoryContent}
            scrollableContainerStyle={styles.keyboardScrollable}
            contentOffsetKeyboardClosed={-2}
            contentOffsetKeyboardOpened={0}
            renderScrollable={(panHandlers) => (
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
                customBottomComponent={() => null}
                disableImageGallery={false}
                enableAnimation={true}
                  showUserAvatars={false}
                showUserNames={!isDirectChat}
                flatListProps={{
                  ...panHandlers,
                  contentContainerStyle: {
                    paddingTop: 8,
                    paddingBottom: 0,
                    paddingHorizontal: 8,
                  },
                  onScroll: handleFlatListScroll,
                  onEndReached: handleLoadOlder,
                  onEndReachedThreshold: 0.25,
                  scrollEventThrottle: 16,
                  keyboardShouldPersistTaps: 'handled',
                  ListFooterComponent:
                    isLoadingMore && hasMoreMessages ? (
                      <View style={styles.loadMoreFooter}>
                        <ActivityIndicator size="small" color={colors.muted} />
                        <Text style={styles.loadMoreText}>Loading older messages...</Text>
                      </View>
                    ) : null,
                }}
              />
            )}
          >
            {typingLabel ? (
              <View style={styles.typingRow}>
                <MaterialCommunityIcons name="pencil" size={13} color={colors.muted} />
                <Text style={styles.typingText}>{typingLabel}</Text>
              </View>
            ) : null}
            {renderInputBar()}
          </KeyboardAccessoryView>
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
            {canDelete ? (
              <TouchableOpacity style={styles.actionButton} onPress={handleDeleteMessage}>
                <MaterialCommunityIcons name="delete" size={20} color="#ef4444" />
                <Text style={[styles.actionText, { color: '#ef4444' }]}>{deleteLabel}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

    </View>
  );
}

const createChatStyles = (
  colors: {
    background: string;
    card: string;
    text: string;
    muted: string;
    border: string;
    accent: string;
    accentText: string;
    error?: string;
  },
  shared: ReturnType<typeof createSecureChatStyles>,
) => ({
  ...shared,
  outerContainer: shared.chatThreadOuterContainer,
  emptyState: shared.chatThreadEmptyState,
  emptyTitle: shared.chatThreadEmptyTitle,
  emptySubtitle: shared.chatThreadEmptySubtitle,
  container: shared.chatThreadContainer,
  chatWrapper: shared.chatThreadWrapper,
  keyboardScrollable: shared.chatThreadKeyboardScrollable,
  keyboardAccessory: shared.chatThreadKeyboardAccessory,
  keyboardAccessoryContent: shared.chatThreadKeyboardAccessoryContent,
  messageItem: shared.chatThreadMessageItem,
  messageItemIncoming: shared.chatThreadMessageItemIncoming,
  messageItemOutgoing: shared.chatThreadMessageItemOutgoing,
  messageItemGrouped: shared.chatThreadMessageItemGrouped,
  messageItemUngrouped: shared.chatThreadMessageItemUngrouped,
  messageShell: shared.chatThreadMessageShell,
  messageShellHighlighted: shared.chatThreadMessageShellHighlighted,
  messageShellIncoming: shared.chatThreadMessageShellIncoming,
  messageShellOutgoing: shared.chatThreadMessageShellOutgoing,
  messageSurface: shared.chatThreadMessageSurface,
  messageSurfaceIncoming: shared.chatThreadMessageSurfaceIncoming,
  messageSurfaceOutgoing: shared.chatThreadMessageSurfaceOutgoing,
  replyQuote: shared.chatThreadReplyQuote,
  replyQuoteBar: shared.chatThreadReplyQuoteBar,
  replyQuoteBody: shared.chatThreadReplyQuoteBody,
  replyQuoteAuthor: shared.chatThreadReplyQuoteAuthor,
  replyQuoteText: shared.chatThreadReplyQuoteText,
  metaRow: shared.chatThreadMetaRow,
  authorLabel: shared.chatThreadAuthorLabel,
  messageText: shared.chatThreadMessageText,
  messageTextIncoming: {
    color: colors.text,
  },
  messageTextOutgoing: {
    color: colors.text,
  },
  timeText: shared.chatThreadTimeText,
  timeTextIncoming: {
    color: colors.muted,
  },
  timeTextOutgoing: {
    color: colors.muted,
    alignSelf: 'flex-end',
  },
  imageContainer: shared.chatThreadImageContainer,
  imageCaption: shared.chatThreadImageCaption,
  imageCaptionIncoming: {
    color: colors.text,
  },
  imageCaptionOutgoing: {
    color: colors.text,
  },
  imageOverlay: shared.chatThreadImageOverlay,
  imageOverlayInner: shared.chatThreadImageOverlayInner,
  imageMetaText: shared.chatThreadImageMetaText,
  imageMetaTime: shared.chatThreadImageMetaTime,
  inputBarWrapper: shared.chatThreadInputBarWrapper,
  typingRow: shared.chatThreadTypingRow,
  typingText: shared.chatThreadTypingText,
  loadMoreFooter: shared.chatThreadLoadMoreFooter,
  loadMoreText: shared.chatThreadLoadMoreText,
  statusIconWrap: shared.chatThreadStatusIconWrap,
  statusIconGlyph: {
    ...shared.chatThreadStatusIconGlyph,
    marginTop: Platform.OS === 'android' ? -1 : 0,
  },
  actionOverlay: shared.chatThreadActionOverlay,
  actionBackdrop: shared.chatThreadActionBackdrop,
  actionMenu: shared.chatThreadActionMenu,
  actionButton: shared.chatThreadActionButton,
  actionText: shared.chatThreadActionText,
});
