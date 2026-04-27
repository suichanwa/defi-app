import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Keyboard,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ChatMessage, ChatThread, ServerInfo } from '@app-types/securechat-types/secureChat';
import type { SecureChatMessageRow, SecureChatScreenProps } from '@app-types/securechat-types/secureChatScreen';
import type { ToastFn } from '@app-types/securechat-types/secureChatHandleMessage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as date from 'date-and-time';
import { showToast } from '@services/toast';
import * as Clipboard from 'expo-clipboard';
import SecureChatContent from './components/SecureChatContent';
import SecureChatLayout from './components/SecureChatLayout';
import * as SecureChatConstants from '@constants/secureChat.constants';
import { useSecureChatIdentity } from '@hooks/useSecureChatIdentity';
import { useSecureChatImageAttachment } from '@hooks/useSecureChatImageAttachment';
import { useSecureChatUIState } from '@hooks/secureChat/useSecureChatUIState';
import { useXmtpDirectMessages } from '@hooks/secureChat/useXmtpDirectMessages';
import { useRealtimeRoom, type TypingPayload } from '@hooks/secureChat/useRealtimeRoom';
import { useChatTransport } from '@hooks/secureChat/useChatTransport';
import { useTickingClock } from '@hooks/useTickingClock';
import { useRoomHistory } from '@hooks/useRoomHistory';
import { resolveChatImageMessages } from '@utils/secureChatImages';
import { mapRowToMessage } from '@utils/secureChatUtils';
import {
  createIncomingRoomMessageHandler,
  createIsOwnMessage,
  createNotifyIncomingMessage,
  createSendMessageHandler,
} from '@services/securechat/handlemessage';
import { createSecureChatUserActions } from '@services/securechat/userMessageActions';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { useChatAvatar } from '../../hooks/useChatAvatar';
import { useChatProfiles } from '../../hooks/useChatProfiles';
import { useTheme } from '@theme/ThemeProvider';
import { useXmtpClient } from '@context/XmtpProvider';
import { notifyAndroidSecureChatMessage } from '@services/androidNotifications';

type PendingFile = {
  uri: string;
  name: string;
  size: number;
  mime: string;
};

export default function SecureChatScreen({ isActive = false, onChatViewChange }: SecureChatScreenProps) {
  const { colors } = useTheme();
  const { client: xmtpClient } = useXmtpClient();
  const [chats, setChats] = useState<ChatThread[]>([
    {
      id: SecureChatConstants.DEFAULT_GLOBAL_CHAT_ID,
      name: SecureChatConstants.DEFAULT_GLOBAL_CHAT_NAME,
      participants: ['You'],
      peerAddress: SecureChatConstants.DEFAULT_GLOBAL_CHAT_PEER,
      isOnline: false,
      lastMessage: {
        text: SecureChatConstants.DEFAULT_GLOBAL_CHAT_JOIN_TEXT,
        ts: date.format(new Date(), 'HH:mm'),
        from: 'System',
      },
    },
  ]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>([SecureChatConstants.DEFAULT_CONNECTION_LOG]);
  const [roomId, setRoomId] = useState<string>(SecureChatConstants.DEFAULT_GLOBAL_CHAT_ID);
  const [mutedChatIds, setMutedChatIds] = useState<Set<string>>(() => new Set());
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [typingByChatId, setTypingByChatId] = useState<Record<string, string | null>>({});
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const { width } = useWindowDimensions();
  const isCompact = width < SecureChatConstants.CHAT_COMPACT_WIDTH;
  const timeLabel = useTickingClock();
  const {
    authorId,
    displayLabel,
    effectiveUserId,
    userAvatarUri,
    userAvatarType,
    userAvatarSeed,
  } = useSecureChatIdentity(isActive);
  const {
    state: { secureTab, chatView, selectedChatId, draft, connectAddress, connectName, pendingImageUri },
    actions: {
      setTab,
      setView,
      selectChat,
      setDraft,
      setConnectAddress,
      setConnectName,
      setAttachment,
    },
  } = useSecureChatUIState();
  const { pickImage, clearImage } = useSecureChatImageAttachment(setAttachment);

  const devicePublicKey = useMemo(
    () => (xmtpClient?.inboxId ? `xmtp:${xmtpClient.inboxId}` : `user:${displayLabel}`),
    [displayLabel, xmtpClient?.inboxId],
  );

  const handlePickImage = useCallback(async () => {
    setPendingFile(null);
    await pickImage();
  }, [pickImage]);

  const handleClearAttachment = useCallback(() => {
    clearImage();
  }, [clearImage]);

  const notifyIncomingRef = useRef<(chatId: string, message: ChatMessage) => void>(() => undefined);
  const notifyIncoming = useCallback(
    (chatId: string, message: ChatMessage) => notifyIncomingRef.current(chatId, message),
    [],
  );
  const appStateRef = useRef(AppState.currentState);
  const sendingImageUriRef = useRef<string | null>(null);
  const sendingFileUriRef = useRef<string | null>(null);
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});
  const typingSentRef = useRef<{ chatId: string | null; isTyping: boolean; lastSentAt: number }>({
    chatId: null,
    isTyping: false,
    lastSentAt: 0,
  });

  const mapRow = useCallback(
    (row: SecureChatMessageRow) =>
      mapRowToMessage(row, {
        authorId,
        displayLabel,
        userAvatarType,
        userAvatarUri,
      }),
    [authorId, displayLabel, userAvatarType, userAvatarUri],
  );

  const { messagesByChat, setMessagesByChat, historyStateByChat, loadInitial, loadOlder, ensureChatInitialized } =
    useRoomHistory({
      pageSize: SecureChatConstants.CHAT_HISTORY_PAGE_SIZE,
      mapRow,
      resolveMessages: resolveChatImageMessages,
      onHistoryError: (message) => {
        setConnectionLog((prev) => [`History error: ${message}`, ...prev]);
      },
    });

  const appendMessageToChat = useCallback(
    (chatId: string, message: ChatMessage) => {
      setMessagesByChat((prev) => {
        const existing = prev[chatId] ?? [];
        if (existing.some((m) => m.id === message.id)) return prev;
        const updated = [...existing, message];
        
        // Limit messages in memory to prevent crashes from excessive message accumulation
        // Keep only the most recent MAX_MESSAGES_IN_MEMORY messages
        const limited = updated.length > SecureChatConstants.MAX_MESSAGES_IN_MEMORY
          ? updated.slice(-SecureChatConstants.MAX_MESSAGES_IN_MEMORY)
          : updated;
        
        return { ...prev, [chatId]: limited };
      });
      setChats((prev) => {
        const next = prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                lastMessage: {
                  text:
                    message.type === 'image'
                      ? message.content?.trim() && message.content !== 'Photo'
                        ? message.content
                        : 'Photo'
                      : message.content,
                  ts: message.timestamp,
                  from: message.author,
                  authorId: message.authorId,
                },
              }
            : chat,
        );
        if (next.some((chat) => chat.id === chatId)) return next;
        const fallbackName = message.author || 'Direct Message';
        return [
          {
            id: chatId,
            name: fallbackName,
            participants: [displayLabel, fallbackName],
            peerAddress: 'direct',
            isOnline: true,
            isDM: true,
            lastMessage: {
              text:
                message.type === 'image'
                  ? message.content?.trim() && message.content !== 'Photo'
                    ? message.content
                    : 'Photo'
                  : message.content,
              ts: message.timestamp,
              from: message.author,
              authorId: message.authorId,
            },
          },
          ...next,
        ];
      });
    },
    [displayLabel, setChats, setMessagesByChat],
  );

  const loadInitialRef = useRef(loadInitial);
  useEffect(() => {
    loadInitialRef.current = loadInitial;
  }, [loadInitial]);

  const selectedMessages = useMemo(
    () => messagesByChat[selectedChatId] ?? [],
    [messagesByChat, selectedChatId],
  );

  const selectedHistoryState = historyStateByChat[selectedChatId];

  const handleXmtpSyncError = useCallback((message: string) => {
    setConnectionLog((prev) => [`DM sync error: ${message}`, ...prev]);
  }, []);

  const {
    dmChannels,
    startDM,
    loadThread,
    sendText: sendXmtpDmText,
    xmtpStatus,
    xmtpError,
  } = useXmtpDirectMessages({
    displayLabel,
    isActive,
    selectedChatId,
    isThreadOpen: secureTab === 'chats' && chatView === 'thread',
    notifyIncoming,
    setMessagesByChat,
    onError: handleXmtpSyncError,
  });

  useEffect(() => {
    if (!xmtpError) return;
    setConnectionLog((prev) => [`XMTP error: ${xmtpError}`, ...prev]);
  }, [xmtpError]);

  useEffect(() => {
    if (xmtpStatus !== 'ready' || !xmtpClient?.inboxId) return;
    const line = `XMTP ready: inbox ${xmtpClient.inboxId}`;
    setConnectionLog((prev) => (prev.includes(line) ? prev : [line, ...prev]));
  }, [xmtpClient?.inboxId, xmtpStatus]);

  useEffect(() => {
    if (xmtpStatus !== 'unsupported') return;
    const line = 'XMTP unavailable: unlock an Ethereum wallet to enable direct messages (Solana addresses can route via linked XMTP wallet).';
    setConnectionLog((prev) => (prev.includes(line) ? prev : [line, ...prev]));
  }, [xmtpStatus]);

  const getChatById = useCallback(
    (chatId: string) =>
      dmChannels.find((chat) => chat.id === chatId) ??
      chats.find((chat) => chat.id === chatId) ??
      null,
    [chats, dmChannels],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, []);

  const notifyNative = useCallback(async (payload: { chatId: string; chatName: string; message: ChatMessage }) => {
    if (appStateRef.current === 'active') return;
    await notifyAndroidSecureChatMessage({
      chatId: payload.chatId,
      chatName: payload.chatName,
      author: payload.message.author,
      message: payload.message.type === 'image'
        ? 'Photo'
        : payload.message.type === 'file'
          ? payload.message.fileName ?? 'File'
          : payload.message.content,
      messageType: payload.message.type,
    });
  }, []);

  const selectedChat = useMemo(() => {
    return getChatById(selectedChatId);
  }, [getChatById, selectedChatId]);

  const threadCurrentUserId = useMemo(() => {
    if (selectedChat?.id.startsWith('dm:xmtp:')) {
      return xmtpClient?.inboxId ?? effectiveUserId;
    }
    return effectiveUserId;
  }, [effectiveUserId, selectedChat?.id, xmtpClient?.inboxId]);

  const typingSenderId = useMemo(() => authorId ?? effectiveUserId, [authorId, effectiveUserId]);

  const scopedShowToast = useCallback<ToastFn>(
    (params) => showToast({ ...params, scope: 'chat', animation: 'slide' }),
    [],
  );

  const notifyIncomingMessage = useMemo(
    () =>
      createNotifyIncomingMessage({
        effectiveUserId,
        displayLabel,
        mutedChatIds,
        secureTab,
        chatView,
        selectedChatId,
        getChatById,
        showToast: scopedShowToast,
        notifyNative,
      }),
    [chatView, displayLabel, effectiveUserId, getChatById, mutedChatIds, notifyNative, scopedShowToast, secureTab, selectedChatId],
  );

  useEffect(() => {
    notifyIncomingRef.current = notifyIncomingMessage;
  }, [notifyIncomingMessage]);

  const authorIds = useMemo(() => {
    const ids = new Set<string>();
    selectedMessages.forEach((message) => {
      if (message.authorId) ids.add(message.authorId);
    });
    if (authorId) ids.add(authorId);
    return Array.from(ids).sort();
  }, [authorId, selectedMessages]);

  const { profilesById } = useChatProfiles({ authorIds, enabled: authorIds.length > 0 });

  const resolveAvatar = useChatAvatar({
    currentUserId: authorId,
    currentUserLabel: displayLabel,
    currentAvatarType: userAvatarType,
    currentAvatarUri: userAvatarUri,
    currentAvatarSeed: userAvatarSeed,
    profilesById,
  });

  const resolveAuthorName = useCallback(
    (message: ChatMessage) => {
      const isCurrentUser =
        typeof message.outgoing === 'boolean'
          ? message.outgoing
          : (authorId ? message.authorId === authorId : false) || message.author === displayLabel;
      if (isCurrentUser) return displayLabel;
      const profile = message.authorId ? profilesById[message.authorId] : undefined;
      const alias = profile?.alias?.trim();
      return alias || message.author || 'Anonymous';
    },
    [authorId, displayLabel, profilesById],
  );

  const resolveAuthorNameRef = useRef(resolveAuthorName);
  useEffect(() => {
    resolveAuthorNameRef.current = resolveAuthorName;
  }, [resolveAuthorName]);

  const presencePayload = useMemo(
    () => ({ user: displayLabel, room: roomId, authorId }),
    [authorId, displayLabel, roomId],
  );

  const handleRealtimeSubscribed = useCallback(async () => {
    setConnectionLog((prev) => [`Joined room ${roomId}.`, ...prev]);
    setServerInfo({ address: 'supabase', port: 0, status: 'running' });
    setChats((prev) =>
      prev.map((chat) => (chat.id === roomId ? { ...chat, isOnline: true } : chat)),
    );
    await loadInitialRef.current(roomId);
  }, [roomId]);

  const handleRealtimeError = useCallback(() => {
    setConnectionLog((prev) => [`Failed to join room ${roomId}. Check Supabase Realtime keys.`, ...prev]);
  }, [roomId]);

  const handlePresenceChange = useCallback(
    (count: number) => {
      setChats((prev) =>
        prev.map((chat) => (chat.id === roomId ? { ...chat, isOnline: count > 0 } : chat)),
      );
    },
    [roomId],
  );

  useEffect(() => {
    setEditingMessage(null);
    setPendingFile(null);
  }, [selectedChatId]);

  const isOwnMessage = useMemo(
    () => createIsOwnMessage(displayLabel, effectiveUserId),
    [displayLabel, effectiveUserId],
  );


  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConnectionLog((prev) => [
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY to enable chat.',
        ...prev,
      ]);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!supabase) return;

    // Always keep a "global" room available.
    setChats((prev) => {
      if (prev.find((c) => c.id === SecureChatConstants.DEFAULT_GLOBAL_CHAT_ID)) return prev;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return [
        {
          id: SecureChatConstants.DEFAULT_GLOBAL_CHAT_ID,
          name: SecureChatConstants.DEFAULT_GLOBAL_CHAT_NAME,
          participants: ['You'],
          peerAddress: SecureChatConstants.DEFAULT_GLOBAL_CHAT_PEER,
          isOnline: true,
          lastMessage: { text: SecureChatConstants.DEFAULT_GLOBAL_CONNECTED_TEXT, ts: now, from: 'System' },
        },
        ...prev,
      ];
    });
  }, []);

  const handleIncomingRoomMessage = useMemo(
    () =>
      createIncomingRoomMessageHandler({
        setMessagesByChat,
        setChats,
        notifyIncomingRef,
        resolveAuthorNameRef,
      }),
    [setChats, setMessagesByChat],
  );

  const { participantCount, sendBroadcast, sendTyping } = useRealtimeRoom({
    roomId,
    presenceKey: typingSenderId,
    presencePayload,
    onIncomingMessage: handleIncomingRoomMessage,
    onTyping: (payload: TypingPayload) => {
      const safePayload = payload as unknown as Record<string, unknown>;
      const readString = (key: string) => {
        const value = safePayload[key];
        return typeof value === 'string' ? value : undefined;
      };
      const readBoolean = (key: string) => {
        const value = safePayload[key];
        return typeof value === 'boolean' ? value : undefined;
      };
      const payloadChatId = readString('chatId');
      if (!payloadChatId) return;
      const payloadSenderId = readString('senderId');
      const payloadAuthorId = readString('authorId');
      const payloadAuthor = readString('author');
      const payloadIsTyping = readBoolean('isTyping') === true;

      const senderIdentity = payloadSenderId ?? payloadAuthorId;
      if (senderIdentity && senderIdentity === typingSenderId) return;

      if (payloadIsTyping) {
        const label = payloadAuthor ?? getChatById(payloadChatId)?.name ?? 'Someone';
        setTypingByChatId((prev) => ({ ...prev, [payloadChatId]: `${label} is typing...` }));
        if (typingTimersRef.current[payloadChatId]) {
          clearTimeout(typingTimersRef.current[payloadChatId] as ReturnType<typeof setTimeout>);
        }
        typingTimersRef.current[payloadChatId] = setTimeout(() => {
          setTypingByChatId((prev) => ({ ...prev, [payloadChatId]: null }));
          typingTimersRef.current[payloadChatId] = null;
        }, 2500);
      } else {
        if (typingTimersRef.current[payloadChatId]) {
          clearTimeout(typingTimersRef.current[payloadChatId] as ReturnType<typeof setTimeout>);
          typingTimersRef.current[payloadChatId] = null;
        }
        setTypingByChatId((prev) => ({ ...prev, [payloadChatId]: null }));
      }
    },
    onSubscribed: handleRealtimeSubscribed,
    onError: handleRealtimeError,
    onPresenceChange: handlePresenceChange,
  });

  const { sendText: transportSendText, sendImage: transportSendImage } = useChatTransport({
    displayLabel,
    authorId,
    effectiveUserId,
    userAvatarType,
    userAvatarUri,
    setMessagesByChat,
    setChats,
    onConnectionLog: (message) => {
      setConnectionLog((prev) => [message, ...prev]);
    },
    sendRoomBroadcast: async (payload) => {
      await sendBroadcast(payload);
    },
  });

  const sendText = useCallback(
    async ({ chatId, content, isDM }: { chatId: string; content: string; isDM: boolean }) => {
      if (isDM || chatId.startsWith('dm:')) {
        return sendXmtpDmText({ chatId, content });
      }
      return transportSendText({ chatId, content, isDM: false });
    },
    [sendXmtpDmText, transportSendText],
  );

  const sendImage = useCallback(
    async ({
      chatId,
      imageUri,
      isDM,
      content,
    }: {
      chatId: string;
      imageUri: string;
      isDM: boolean;
      content?: string;
    }) => {
      if (isDM || chatId.startsWith('dm:')) {
        return { sent: false, error: 'Image attachments over XMTP are not enabled in this build.' };
      }
      return transportSendImage({ chatId, imageUri, isDM: false, content });
    },
    [transportSendImage],
  );

  const sendFile = useCallback(
    async ({ chatId, isDM }: { chatId: string; file: PendingFile; isDM: boolean }) => {
      const isDirectMessage = isDM || chatId.startsWith('dm:');
      if (isDirectMessage) {
        return { sent: false, error: 'File attachments are not enabled for direct messages in this build.' };
      }
      return { sent: false, error: 'File attachments are currently disabled.' };
    },
    [],
  );

  const handleLoadMoreMessages = useCallback(() => {
    if (!selectedChat) return;
    if (selectedChat.id.startsWith('dm:')) return;
    loadOlder(selectedChat.id);
  }, [loadOlder, selectedChat]);

  // Combine global chats with DM channels
  const allChats = useMemo(() => {
    const globalChats = chats.filter((c) => !c.id.startsWith('dm:'));
    return [...globalChats, ...dmChannels];
  }, [chats, dmChannels]);

  // Handle starting a DM from profile view
  const handleStartDM = useCallback(async (otherUserId: string, otherUserName: string) => {
    try {
      const candidate = otherUserId.trim();
      if (!candidate) {
        setTab('connect');
        setView('list');
        setConnectionLog((prev) => [
          'Enter a peer wallet address (Ethereum 0x... or Solana base58).',
          ...prev,
        ]);
        scopedShowToast({
          type: 'default',
          text1: 'Wallet address required',
          text2: 'Open Connect and enter a peer wallet address to start XMTP DM.',
          position: 'top',
          visibilityTime: 3500,
        });
        return;
      }
      const channelId = await startDM(candidate, otherUserName);
      selectChat(channelId);
      setRoomId(channelId);
      setTab('chats');
    } catch (error) {
      console.error('Failed to start DM:', error);
      const message = error instanceof Error ? error.message : 'Failed to start DM.';
      Alert.alert('Direct message error', message);
    }
  }, [selectChat, scopedShowToast, setTab, setView, startDM]);

  // Update handleSelectChat to load DM messages
  const handleSelectChat = useCallback(async (chatId: string) => {
    selectChat(chatId);
    setRoomId(chatId);
    if (chatId.startsWith('dm:')) {
      await loadThread(chatId);
    } else {
      ensureChatInitialized(chatId);
      await loadInitial(chatId);
    }
  }, [ensureChatInitialized, loadInitial, loadThread, selectChat]);

  useEffect(() => {
    if (!selectedChat) return;
    if (!draft.trim()) {
      if (typingSentRef.current.isTyping && typingSentRef.current.chatId === selectedChat.id) {
        typingSentRef.current.isTyping = false;
        sendTyping({
          chatId: selectedChat.id,
          senderId: typingSenderId,
          authorId,
          author: displayLabel,
          isTyping: false,
        }).catch(() => undefined);
      }
      return;
    }

    const now = Date.now();
    const isSameChat = typingSentRef.current.chatId === selectedChat.id;
    const throttleMs = 2000;
    if (!typingSentRef.current.isTyping || !isSameChat || now - typingSentRef.current.lastSentAt > throttleMs) {
      typingSentRef.current.chatId = selectedChat.id;
      typingSentRef.current.isTyping = true;
      typingSentRef.current.lastSentAt = now;
      sendTyping({
        chatId: selectedChat.id,
        senderId: typingSenderId,
        authorId,
        author: displayLabel,
        isTyping: true,
      }).catch(() => undefined);
    }
  }, [authorId, displayLabel, draft, selectedChat, sendTyping, typingSenderId]);

  useEffect(() => {
    return () => {
      Object.values(typingTimersRef.current).forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, []);

  const handleSendMessage = useMemo(
    () =>
      createSendMessageHandler({
        selectedChat,
        draft,
        pendingImageUri,
        pendingFile,
        editingMessage,
        messagesByChat,
        setMessagesByChat,
        setChats,
        setDraft,
        setEditingMessage,
        setAttachment,
        setFileAttachment: setPendingFile,
        sendText,
        sendImage,
        sendFile,
        resolveAuthorName,
        showAlert: Alert.alert,
        sendingImageUriRef,
        sendingFileUriRef,
      }),
    [
      selectedChat,
      draft,
      pendingImageUri,
      pendingFile,
      editingMessage,
      messagesByChat,
      setMessagesByChat,
      setChats,
      setDraft,
      setEditingMessage,
      setAttachment,
      setPendingFile,
      sendText,
      sendImage,
      sendFile,
      resolveAuthorName,
    ],
  );

  const {
    handleCopyMessage,
    handleReplyMessage,
    handleEditMessage,
    handleDeleteMessage,
    handleToggleMute,
  } = useMemo(
    () =>
      createSecureChatUserActions({
        setClipboard: Clipboard.setStringAsync,
        showToast: scopedShowToast,
        resolveAuthorName,
        setDraft,
        isOwnMessage,
        setEditingMessage,
        messagesByChat,
        setMessagesByChat,
        setChats,
        selectedChatId: selectedChat?.id,
        setMutedChatIds,
      }),
    [
      scopedShowToast,
      resolveAuthorName,
      setDraft,
      isOwnMessage,
      setEditingMessage,
      messagesByChat,
      setMessagesByChat,
      setChats,
      selectedChat?.id,
      setMutedChatIds,
    ],
  );

  const handleConnectPeer = useCallback(async () => {
    const address = connectAddress.trim();
    const name = connectName.trim() || `Peer @ ${address}`;
    if (!address) {
      setConnectionLog((prev) => ['Enter a peer wallet address (Ethereum 0x... or Solana base58) to start XMTP DM.', ...prev]);
      return;
    }
    try {
      const chatId = await startDM(address, name);
      setConnectionLog((prev) => [`XMTP DM ready with ${address}.`, ...prev]);
      selectChat(chatId);
      setRoomId(chatId);
      setTab('chats');
      setConnectAddress('');
      setConnectName('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start XMTP DM.';
      setConnectionLog((prev) => [`XMTP connect error: ${message}`, ...prev]);
      Alert.alert('XMTP connection error', message);
    }
  }, [connectAddress, connectName, selectChat, setConnectAddress, setConnectName, setTab, startDM]);

  const handleStartServer = () => {
    if (serverInfo?.status === 'running') return;
    const address = SecureChatConstants.DEFAULT_HOST_ADDRESS;
    const port =
      SecureChatConstants.DEFAULT_HOST_PORT_BASE +
      Math.floor(Math.random() * SecureChatConstants.DEFAULT_HOST_PORT_RANGE);

    setServerInfo({ address, port, status: 'starting' });
    setConnectionLog((prev) => [`Starting secure server on ${address}:${port}...`, ...prev]);

    setTimeout(() => {
      setServerInfo({ address, port, status: 'running' });
      setConnectionLog((prev) => [`Server ready at ${address}:${port}`, ...prev]);
      setChats((prev) => {
        const payload: ChatThread = {
          id: 'hosted-server',
          name: 'Hosted Server',
          participants: ['You'],
          peerAddress: `${address}:${port}`,
          isOnline: true,
          lastMessage: {
            text: 'Server is advertising to peers.',
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            from: 'System',
          },
        };
        const exists = prev.find((chat) => chat.id === payload.id);
        return exists ? prev.map((chat) => (chat.id === payload.id ? payload : chat)) : [payload, ...prev];
      });
    }, 650);
  };

  const handleTabChange = (tab: 'chats' | 'connect') => {
    setTab(tab);
  };

  const handleOpenConnect = useCallback(() => {
    setTab('connect');
    setView('list');
  }, [setTab, setView]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) return;
    const onBackPress = () => {
      if (secureTab === 'chats' && chatView === 'thread') {
        Keyboard.dismiss();
        setView('list');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [chatView, isActive, secureTab]);

  useEffect(() => {
    onChatViewChange?.(chatView);
  }, [chatView, onChatViewChange]);

  return (
    <View style={styles.screenRoot}>
      <SecureChatLayout
        isCompact={isCompact}
        secureTab={secureTab}
        chatView={chatView}
        timeLabel={timeLabel}
        onTabChange={handleTabChange}
      >
        <SecureChatContent
          secureTab={secureTab}
          chatView={chatView}
          connect={{
            connectAddress,
            connectName,
            connectionLog,
            devicePublicKey,
            serverInfo,
            onConnectAddressChange: setConnectAddress,
            onConnectNameChange: setConnectName,
            onConnectPress: handleConnectPeer,
            onStartServer: handleStartServer,
          }}
          thread={{
            chat: selectedChat,
            messages: selectedMessages,
            draft,
            serverInfo,
            participantCount,
            currentUserId: threadCurrentUserId,
            currentUserLabel: displayLabel,
            onBack: () => setView('list'),
            onDraftChange: setDraft,
            onSend: handleSendMessage,
            onPickImage: handlePickImage,
            onPickFile: undefined,
            onClearAttachment: handleClearAttachment,
            onClearFile: undefined,
            onLoadMore: handleLoadMoreMessages,
            isLoadingMore: selectedHistoryState?.loading ?? false,
            hasMoreMessages: selectedHistoryState?.hasMore ?? false,
            attachmentUri: pendingImageUri,
            fileAttachment: null,
            typingLabel: selectedChatId ? typingByChatId[selectedChatId] : null,
            resolveAvatar,
            resolveAuthorName,
            onCopyMessage: handleCopyMessage,
            onReplyMessage: handleReplyMessage,
            onEditMessage: handleEditMessage,
            onDeleteMessage: handleDeleteMessage,
            isMuted: selectedChat ? mutedChatIds.has(selectedChat.id) : false,
            onToggleMute: handleToggleMute,
          }}
          list={{
            chats: allChats,
            selectedChatId,
            onSelectChat: handleSelectChat,
            onOpenSelected: handleSelectChat,
          }}
        />
      </SecureChatLayout>

      {secureTab === 'chats' && chatView !== 'thread' ? (
        <TouchableOpacity
          style={[
            styles.floatingConnectButton,
            {
              backgroundColor: colors.accent,
              bottom: 116,
            },
          ]}
          onPress={handleOpenConnect}
          activeOpacity={0.9}
          accessibilityRole="button"
          accessibilityLabel="Open connect screen"
        >
          <MaterialCommunityIcons name="plus" size={22} color={colors.accentText} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
  },
  floatingConnectButton: {
    position: 'absolute',
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 900,
  },
});
