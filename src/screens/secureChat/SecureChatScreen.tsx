import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Keyboard, Platform, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { ChatMessage, ChatThread, ServerInfo } from '@app-types/securechat-types/secureChat';
import type { SecureChatMessageRow, SecureChatScreenProps } from '@app-types/securechat-types/secureChatScreen';
import type { ToastFn } from '@app-types/securechat-types/secureChatHandleMessage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as date from 'date-and-time';
import { showToast } from '@services/toast';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import SecureChatContent from './components/SecureChatContent';
import SecureChatLayout from './components/SecureChatLayout';
import * as SecureChatConstants from '@constants/secureChat.constants';
import { useSecureChatIdentity } from '@hooks/useSecureChatIdentity';
import { useSecureChatImageAttachment } from '@hooks/useSecureChatImageAttachment';
import { useSecureChatUIState } from '@hooks/secureChat/useSecureChatUIState';
import { useDirectMessages } from '@hooks/secureChat/useDirectMessages';
import { useRealtimeRoom, type TypingPayload } from '@hooks/secureChat/useRealtimeRoom';
import { useChatTransport } from '@hooks/secureChat/useChatTransport';
import { useTickingClock } from '@hooks/useTickingClock';
import { useRoomHistory } from '@hooks/useRoomHistory';
import { useP2PDirectMessages } from '@hooks/secureChat/useP2PDirectMessages';
import { resolveChatImageMessages } from '@utils/secureChatImages';
import { isUuid, mapRowToMessage } from '@utils/secureChatUtils';
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

type PendingFile = {
  uri: string;
  name: string;
  size: number;
  mime: string;
};

export default function SecureChatScreen({ isActive = false, onChatViewChange }: SecureChatScreenProps) {
  const { colors } = useTheme();
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

  const devicePublicKey = useMemo(() => `user:${displayLabel}`, [displayLabel]);
  const [p2pRemoteOffer, setP2pRemoteOffer] = useState('');
  const [p2pRemoteAnswer, setP2pRemoteAnswer] = useState('');
  const [p2pRemoteCandidates, setP2pRemoteCandidates] = useState('');

  const handlePickImage = useCallback(async () => {
    setPendingFile(null);
    await pickImage();
  }, [pickImage]);

  const handleClearAttachment = useCallback(() => {
    clearImage();
  }, [clearImage]);

  const handlePickFile = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset?.uri) return;
    setAttachment(null);
    setPendingFile({
      uri: asset.uri,
      name: asset.name ?? `file-${Date.now()}`,
      size: asset.size ?? 0,
      mime: asset.mimeType ?? 'application/octet-stream',
    });
  }, [setAttachment]);

  const handleClearFile = useCallback(() => {
    setPendingFile(null);
  }, []);

  const notifyIncomingRef = useRef<(chatId: string, message: ChatMessage) => void>(() => undefined);
  const notifyIncoming = useCallback(
    (chatId: string, message: ChatMessage) => notifyIncomingRef.current(chatId, message),
    [],
  );
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
        const fallbackName = message.author || 'P2P Peer';
        return [
          {
            id: chatId,
            name: fallbackName,
            participants: [displayLabel, fallbackName],
            peerAddress: 'p2p',
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

  const {
    status: p2pStatus,
    chatId: p2pChatId,
    peerLabel: p2pPeerLabel,
    localOffer: p2pLocalOffer,
    localAnswer: p2pLocalAnswer,
    localCandidates: p2pLocalCandidates,
    createOffer: p2pCreateOffer,
    createAnswer: p2pCreateAnswer,
    acceptAnswer: p2pAcceptAnswer,
    addRemoteCandidates: p2pAddRemoteCandidates,
    reset: p2pReset,
    sendText: p2pSendText,
    sendFile: p2pSendFile,
  } = useP2PDirectMessages({
    displayLabel,
    authorId: authorId ?? effectiveUserId,
    onMessage: (message, chatId) => {
      appendMessageToChat(chatId, message);
      notifyIncoming(chatId, message);
    },
    onLog: (line) => {
      setConnectionLog((prev) => [line, ...prev]);
    },
  });

  const loadInitialRef = useRef(loadInitial);
  useEffect(() => {
    loadInitialRef.current = loadInitial;
  }, [loadInitial]);

  const selectedMessages = useMemo(
    () => messagesByChat[selectedChatId] ?? [],
    [messagesByChat, selectedChatId],
  );

  const selectedHistoryState = historyStateByChat[selectedChatId];

  const {
    dmChannels,
    refreshChannels: refreshDmChannels,
    startDM,
    loadThread,
    markDmFetched,
  } = useDirectMessages({
    effectiveUserId,
    displayLabel,
    isActive,
    selectedChatId,
    secureTab,
    chatView,
    notifyIncoming,
    setMessagesByChat,
    onError: (message) => {
      setConnectionLog((prev) => [`DM sync error: ${message}`, ...prev]);
    },
  });

  const getChatById = useCallback(
    (chatId: string) =>
      dmChannels.find((chat) => chat.id === chatId) ??
      chats.find((chat) => chat.id === chatId) ??
      null,
    [chats, dmChannels],
  );

  const selectedChat = useMemo(() => {
    return getChatById(selectedChatId);
  }, [getChatById, selectedChatId]);

  useEffect(() => {
    if (!p2pChatId || p2pStatus !== 'connected') return;
    const peerName = p2pPeerLabel ?? 'P2P Peer';
    setChats((prev) => {
      const existing = prev.find((chat) => chat.id === p2pChatId);
      if (existing) {
        return prev.map((chat) => (chat.id === p2pChatId ? { ...chat, name: peerName } : chat));
      }
      return [
        {
          id: p2pChatId,
          name: peerName,
          participants: [displayLabel, peerName],
          peerAddress: 'p2p',
          isOnline: true,
          isDM: true,
          lastMessage: {
            text: 'P2P session connected',
            ts: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            from: 'System',
          },
        },
        ...prev,
      ];
    });
    if (selectedChatId !== p2pChatId) {
      selectChat(p2pChatId);
      setTab('chats');
    }
  }, [displayLabel, p2pChatId, p2pPeerLabel, p2pStatus, selectChat, selectedChatId, setTab]);

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
      }),
    [chatView, displayLabel, effectiveUserId, getChatById, mutedChatIds, scopedShowToast, secureTab, selectedChatId],
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
    presenceKey: authorId ?? displayLabel,
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
      const payloadAuthorId = readString('authorId');
      const payloadAuthor = readString('author');
      const payloadIsTyping = readBoolean('isTyping') === true;

      if (payloadAuthorId && payloadAuthorId === effectiveUserId) return;
      if (!payloadAuthorId && payloadAuthor === displayLabel) return;

      if (payloadIsTyping) {
        const label = payloadAuthor ?? 'Someone';
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
    refreshDmChannels,
    markDmFetched,
  });

  const inferMimeFromName = useCallback((name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }, []);

  const sendText = useCallback(
    async ({ chatId, content, isDM }: { chatId: string; content: string; isDM: boolean }) => {
      if (chatId.startsWith('p2p:')) {
        const message = p2pSendText(content);
        if (!message) return { sent: false, error: 'P2P channel not connected.' };
        appendMessageToChat(chatId, message);
        return { sent: true };
      }
      return transportSendText({ chatId, content, isDM });
    },
    [appendMessageToChat, p2pSendText, transportSendText],
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
      if (chatId.startsWith('p2p:')) {
        const name = imageUri.split('/').pop() ?? `image-${Date.now()}.jpg`;
        const file = {
          uri: imageUri,
          name,
          size: 0,
          mime: inferMimeFromName(name),
        };
        const message = await p2pSendFile({ ...file, isImage: true, caption: content });
        if (!message) return { sent: false, error: 'P2P channel not connected.' };
        appendMessageToChat(chatId, message);
        return { sent: true };
      }
      return transportSendImage({ chatId, imageUri, isDM, content });
    },
    [appendMessageToChat, inferMimeFromName, p2pSendFile, transportSendImage],
  );

  const sendFile = useCallback(
    async ({ chatId, file, isDM }: { chatId: string; file: PendingFile; isDM: boolean }) => {
      if (!chatId.startsWith('p2p:')) {
        return { sent: false, error: 'File sending only works in P2P chats.' };
      }
      const message = await p2pSendFile({ ...file, isImage: false });
      if (!message) return { sent: false, error: 'P2P channel not connected.' };
      appendMessageToChat(chatId, message);
      return { sent: true };
    },
    [appendMessageToChat, p2pSendFile],
  );

  const handleLoadMoreMessages = useCallback(() => {
    if (!selectedChat) return;
    if (selectedChat.id.startsWith('dm:')) return;
    if (selectedChat.id.startsWith('p2p:')) return;
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
      const requiresSupabase =
        !isSupabaseConfigured || !isUuid(effectiveUserId) || !isUuid(otherUserId);
      if (requiresSupabase) {
        setTab('connect');
        setView('list');
        setConnectionLog((prev) => [
          'Local-only accounts cannot sync DMs. Use P2P DM from + Connect (offer/answer + ICE).',
          ...prev,
        ]);
        scopedShowToast({
          type: 'default',
          text1: 'P2P DM required',
          text2: 'Tap + to open Connect and exchange offer/answer for this DM.',
          position: 'top',
          visibilityTime: 3500,
        });
        return;
      }
      const channelId = await startDM(otherUserId, otherUserName);
      selectChat(channelId);
      setRoomId(channelId);
      setTab('chats');
    } catch (error) {
      console.error('Failed to start DM:', error);
      const message = error instanceof Error ? error.message : 'Failed to start DM.';
      Alert.alert('Direct message error', message);
    }
  }, [selectChat, setTab, startDM]);

  const handleStartP2P = useCallback((otherUserId: string, otherUserName: string) => {
    setTab('connect');
    setView('list');
    setConnectionLog((prev) => [
      `Start a P2P DM with ${otherUserName}. Exchange offer/answer + ICE.`,
      ...prev,
    ]);
    scopedShowToast({
      type: 'default',
      text1: 'P2P DM',
      text2: 'Use + Connect to exchange offer/answer.',
      position: 'top',
      visibilityTime: 3000,
    });
  }, [setTab, setView]);

  // Update handleSelectChat to load DM messages
  const handleSelectChat = useCallback(async (chatId: string) => {
    selectChat(chatId);
    if (chatId.startsWith('p2p:')) {
      return;
    }
    setRoomId(chatId);
    if (chatId.startsWith('dm:')) {
      await loadThread(chatId);
    } else {
      ensureChatInitialized(chatId);
      await loadInitial(chatId);
    }
  }, [ensureChatInitialized, loadInitial, loadThread, selectChat]);

  const allowFileAttachment = Boolean(selectedChat?.id.startsWith('p2p:'));

  useEffect(() => {
    if (!selectedChat) return;
    if (selectedChat.id.startsWith('p2p:')) return;
    if (!draft.trim()) {
      if (typingSentRef.current.isTyping && typingSentRef.current.chatId === selectedChat.id) {
        typingSentRef.current.isTyping = false;
        sendTyping({
          chatId: selectedChat.id,
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
        authorId,
        author: displayLabel,
        isTyping: true,
      }).catch(() => undefined);
    }
  }, [authorId, displayLabel, draft, selectedChat, sendTyping]);

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

  const handleConnectPeer = () => {
    if (!connectAddress.trim()) {
      setConnectionLog((prev) => ['Enter a peer address to connect.', ...prev]);
      return;
    }

    const address = connectAddress.trim();
    const name = connectName.trim() || `Peer @ ${address}`;
    const chatId = address.toLowerCase().replace(/[^a-z0-9-_]/gi, '-') || `peer-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChats((prev) => [
      {
        id: chatId,
        name,
        participants: ['You', name],
        peerAddress: address,
        isOnline: true,
        lastMessage: { text: 'Secure handshake started.', ts: timestamp, from: 'System' },
      },
      ...prev,
    ]);

    setMessagesByChat((prev) => ({
      ...prev,
      [chatId]: [
        ...(prev[chatId] ?? []),
        {
          id: `${chatId}-sys`,
          chatId,
          author: 'System',
          content: `Secure channel negotiated with ${address}.`,
          timestamp,
          type: 'system',
        },
      ],
    }));

    setConnectionLog((prev) => [`Connected to ${address}.`, ...prev]);
    selectChat(chatId);
    setRoomId(chatId);
    setTab('chats');
    setConnectAddress('');
    setConnectName('');
  };

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

  const handleCreateP2POffer = useCallback(async () => {
    try {
      await p2pCreateOffer();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create offer.';
      setConnectionLog((prev) => [`P2P offer error: ${message}`, ...prev]);
    }
  }, [p2pCreateOffer]);

  const handleCreateP2PAnswer = useCallback(async () => {
    if (!p2pRemoteOffer.trim()) return;
    try {
      await p2pCreateAnswer(p2pRemoteOffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create answer.';
      setConnectionLog((prev) => [`P2P answer error: ${message}`, ...prev]);
    }
  }, [p2pCreateAnswer, p2pRemoteOffer]);

  const handleAcceptP2PAnswer = useCallback(async () => {
    if (!p2pRemoteAnswer.trim()) return;
    try {
      await p2pAcceptAnswer(p2pRemoteAnswer);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept answer.';
      setConnectionLog((prev) => [`P2P answer error: ${message}`, ...prev]);
    }
  }, [p2pAcceptAnswer, p2pRemoteAnswer]);

  const handleAddP2PCandidates = useCallback(async () => {
    if (!p2pRemoteCandidates.trim()) return;
    try {
      await p2pAddRemoteCandidates(p2pRemoteCandidates);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add ICE candidates.';
      setConnectionLog((prev) => [`P2P ICE error: ${message}`, ...prev]);
    }
  }, [p2pAddRemoteCandidates, p2pRemoteCandidates]);

  const handleResetP2P = useCallback(() => {
    p2pReset();
    setP2pRemoteOffer('');
    setP2pRemoteAnswer('');
    setP2pRemoteCandidates('');
    setConnectionLog((prev) => ['P2P session reset.', ...prev]);
  }, [p2pReset]);

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
            p2p: {
              status: p2pStatus,
              peerLabel: p2pPeerLabel,
              localOffer: p2pLocalOffer,
              localAnswer: p2pLocalAnswer,
              localCandidates: p2pLocalCandidates,
              remoteOffer: p2pRemoteOffer,
              remoteAnswer: p2pRemoteAnswer,
              remoteCandidates: p2pRemoteCandidates,
              onRemoteOfferChange: setP2pRemoteOffer,
              onRemoteAnswerChange: setP2pRemoteAnswer,
              onRemoteCandidatesChange: setP2pRemoteCandidates,
              onCreateOffer: handleCreateP2POffer,
              onCreateAnswer: handleCreateP2PAnswer,
              onAcceptAnswer: handleAcceptP2PAnswer,
              onAddCandidates: handleAddP2PCandidates,
              onReset: handleResetP2P,
            },
          }}
          thread={{
            chat: selectedChat,
            messages: selectedMessages,
            draft,
            serverInfo,
            participantCount,
            currentUserId: effectiveUserId,
            currentUserLabel: displayLabel,
            onBack: () => setView('list'),
            onDraftChange: setDraft,
            onSend: handleSendMessage,
            onPickImage: handlePickImage,
            onPickFile: allowFileAttachment ? handlePickFile : undefined,
            onClearAttachment: handleClearAttachment,
            onClearFile: allowFileAttachment ? handleClearFile : undefined,
            onLoadMore: handleLoadMoreMessages,
            isLoadingMore: selectedHistoryState?.loading ?? false,
            hasMoreMessages: selectedHistoryState?.hasMore ?? false,
            attachmentUri: pendingImageUri,
            fileAttachment: allowFileAttachment && pendingFile ? { uri: pendingFile.uri, name: pendingFile.name } : null,
            typingLabel: selectedChatId ? typingByChatId[selectedChatId] : null,
            resolveAvatar,
            resolveAuthorName,
            onCopyMessage: handleCopyMessage,
            onReplyMessage: handleReplyMessage,
            onEditMessage: handleEditMessage,
            onDeleteMessage: handleDeleteMessage,
            onStartP2P: handleStartP2P,
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

      {secureTab === 'chats' ? (
        <TouchableOpacity
          style={[
            styles.floatingConnectButton,
            {
              backgroundColor: colors.accent,
              bottom: chatView === 'thread' ? 28 : 116,
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
