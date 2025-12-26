import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, useWindowDimensions } from 'react-native';
import type { ChatMessage, ChatThread, ServerInfo } from '@app-types/secureChat';
import type { SecureChatMessageRow, SecureChatScreenProps } from '@app-types/secureChatScreen';
import * as date from 'date-and-time';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import SecureChatContent from './components/SecureChatContent';
import SecureChatLayout from './components/SecureChatLayout';
import * as SecureChatConstants from '@constants/secureChatScreen';
import { useSecureChatIdentity } from '@hooks/useSecureChatIdentity';
import { useSecureChatImageAttachment } from '@hooks/useSecureChatImageAttachment';
import { useSecureChatUIState } from '@hooks/secureChat/useSecureChatUIState';
import { useDirectMessages } from '@hooks/secureChat/useDirectMessages';
import { useRealtimeRoom } from '@hooks/secureChat/useRealtimeRoom';
import { useChatTransport } from '@hooks/secureChat/useChatTransport';
import { useTickingClock } from '@hooks/useTickingClock';
import { useRoomHistory } from '@hooks/useRoomHistory';
import { resolveChatImageMessage, resolveChatImageMessages } from '@utils/secureChatImages';
import { mapRowToMessage } from '@utils/secureChatUtils';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { useChatAvatar } from '../../hooks/useChatAvatar';
import { useChatProfiles } from '../../hooks/useChatProfiles';

export default function SecureChatScreen({ isActive = false }: SecureChatScreenProps) {
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

  const handlePickImage = useCallback(async () => {
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

  const notifyIncomingMessage = useCallback(
    (chatId: string, message: ChatMessage) => {
      if (message.type === 'system') return;
      if (message.outgoing === true) return;
      if (message.authorId && message.authorId === effectiveUserId) return;
      if (!message.authorId && message.author === displayLabel) return;
      if (mutedChatIds.has(chatId)) return;
      if (secureTab === 'chats' && chatView === 'thread' && selectedChatId === chatId) return;

      const chatName = getChatById(chatId)?.name ?? message.author ?? 'New message';
      Toast.show({
        type: 'chat',
        text1: chatName,
        text2: message.content,
        position: 'top',
        visibilityTime: 3500,
      });
    },
    [chatView, displayLabel, effectiveUserId, getChatById, mutedChatIds, secureTab, selectedChatId],
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
  }, [selectedChatId]);

  const isOwnMessage = useCallback(
    (message: ChatMessage) => {
      if (message.outgoing === true) return true;
      if (message.authorId && effectiveUserId && message.authorId === effectiveUserId) return true;
      if (!message.authorId && message.author === displayLabel) return true;
      return false;
    },
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

  const handleIncomingRoomMessage = useCallback(
    (msg: ChatMessage) => {
      resolveChatImageMessage(msg)
        .then((resolved) => {
          setMessagesByChat((prev) => {
            const existing = prev[resolved.chatId] ?? [];
            const seen = existing.some((m) => m.id === resolved.id);
            if (seen) return prev;
            notifyIncomingRef.current(resolved.chatId, resolved);
            return { ...prev, [resolved.chatId]: [...existing, resolved] };
          });
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === resolved.chatId
                ? {
                    ...chat,
                    lastMessage: {
                      text: resolved.content,
                      ts: resolved.timestamp,
                      from: resolveAuthorNameRef.current(resolved),
                      authorId: resolved.authorId,
                    },
                  }
                : chat,
            ),
          );
        })
        .catch((error) => {
          console.warn('Failed to resolve chat image URL:', error);
          setMessagesByChat((prev) => {
            const existing = prev[msg.chatId] ?? [];
            const seen = existing.some((m) => m.id === msg.id);
            if (seen) return prev;
            notifyIncomingRef.current(msg.chatId, msg);
            return { ...prev, [msg.chatId]: [...existing, msg] };
          });
          setChats((prev) =>
            prev.map((chat) =>
              chat.id === msg.chatId
                ? {
                    ...chat,
                    lastMessage: {
                      text: msg.content,
                      ts: msg.timestamp,
                      from: resolveAuthorNameRef.current(msg),
                      authorId: msg.authorId,
                    },
                  }
                : chat,
            ),
          );
        });
    },
    [setChats, setMessagesByChat],
  );

  const { participantCount, sendBroadcast } = useRealtimeRoom({
    roomId,
    presenceKey: authorId ?? displayLabel,
    presencePayload,
    onIncomingMessage: handleIncomingRoomMessage,
    onSubscribed: handleRealtimeSubscribed,
    onError: handleRealtimeError,
    onPresenceChange: handlePresenceChange,
  });

  const { sendText, sendImage } = useChatTransport({
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

  const handleSendMessage = async () => {
    if (!selectedChat) return;
    const trimmed = draft.trim();
    const hasText = trimmed.length > 0;
    const hasImage = Boolean(pendingImageUri);
    const isDM = selectedChat.id.startsWith('dm:');

    if (editingMessage && selectedChat.id === editingMessage.chatId) {
      if (!hasText) {
        Alert.alert('Edit message', 'Message cannot be empty.');
        return;
      }
      const currentList = messagesByChat[selectedChat.id] ?? [];
      const isLastMessage = currentList[currentList.length - 1]?.id === editingMessage.id;
      const nextList = currentList.map((message) =>
        message.id === editingMessage.id ? { ...message, content: trimmed } : message,
      );
      setMessagesByChat((prev) => ({ ...prev, [selectedChat.id]: nextList }));
      if (isLastMessage) {
        const updatedAuthor = resolveAuthorName(editingMessage);
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === selectedChat.id
              ? {
                  ...chat,
                  lastMessage: {
                    text: trimmed,
                    ts: editingMessage.timestamp,
                    from: updatedAuthor,
                    authorId: editingMessage.authorId,
                  },
                }
              : chat,
          ),
        );
      }
      setDraft('');
      setEditingMessage(null);
      return;
    }

    if (!hasText && !hasImage) return;

    if (hasText) {
      const result = await sendText({ chatId: selectedChat.id, content: trimmed, isDM });
      if (!result.sent && result.error) {
        Alert.alert(isDM ? 'Direct message unavailable' : 'Supabase not configured', result.error);
      } else {
        setDraft('');
      }
    }

    if (hasImage && pendingImageUri) {
      try {
        const result = await sendImage({ chatId: selectedChat.id, imageUri: pendingImageUri, isDM });
        if (!result.sent && result.error) {
          Alert.alert('Image upload error', result.error);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send image.';
        Alert.alert('Image upload error', message);
      } finally {
        setAttachment(null);
      }
    }
  };

  const handleCopyMessage = useCallback(async (message: ChatMessage) => {
    const text = message.type === 'image' ? message.imageUri ?? '' : message.content;
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Toast.show({
      type: 'chat',
      text1: 'Copied to clipboard',
      text2: message.type === 'image' ? 'Image link copied.' : text.length > 80 ? `${text.slice(0, 80)}...` : text,
      position: 'top',
      visibilityTime: 2000,
    });
  }, []);

  const handleReplyMessage = useCallback(
    (message: ChatMessage) => {
      const author = resolveAuthorName(message);
      setDraft(`@${author} `);
    },
    [resolveAuthorName, setDraft],
  );

  const handleEditMessage = useCallback(
    (message: ChatMessage) => {
      if (!isOwnMessage(message)) return;
      if (message.type === 'image') return;
      setEditingMessage(message);
      setDraft(message.content);
    },
    [isOwnMessage, setDraft, setEditingMessage],
  );

  const handleDeleteMessage = useCallback(
    (message: ChatMessage) => {
      if (!isOwnMessage(message)) return;
      const currentList = messagesByChat[message.chatId] ?? [];
      const isLastMessage = currentList[currentList.length - 1]?.id === message.id;
      const nextList = currentList.filter((item) => item.id !== message.id);
      setMessagesByChat((prev) => ({ ...prev, [message.chatId]: nextList }));
      if (isLastMessage) {
        const last = nextList[nextList.length - 1];
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === message.chatId
              ? {
                  ...chat,
                  lastMessage: last
                    ? {
                        text: last.content,
                        ts: last.timestamp,
                        from: resolveAuthorName(last),
                        authorId: last.authorId,
                      }
                    : undefined,
                }
              : chat,
          ),
        );
      }
    },
    [isOwnMessage, messagesByChat, resolveAuthorName, setMessagesByChat, setChats],
  );

  const handleToggleMute = useCallback(() => {
    if (!selectedChat) return;
    setMutedChatIds((prev) => {
      const next = new Set(prev);
      if (next.has(selectedChat.id)) {
        next.delete(selectedChat.id);
      } else {
        next.add(selectedChat.id);
      }
      return next;
    });
  }, [selectedChat]);

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

  const handleTabChange = (tab: 'chats' | 'connect') => {
    setTab(tab);
  };

  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) return;
    const onBackPress = () => {
      if (secureTab === 'chats' && chatView === 'thread') {
        setView('list');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [chatView, isActive, secureTab]);

  return (
    <SecureChatLayout
      isCompact={isCompact}
      secureTab={secureTab}
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
          currentUserId: effectiveUserId,
          currentUserLabel: displayLabel,
          onBack: () => setView('list'),
          onDraftChange: setDraft,
          onSend: handleSendMessage,
          onPickImage: handlePickImage,
          onClearAttachment: handleClearAttachment,
          onLoadMore: handleLoadMoreMessages,
          isLoadingMore: selectedHistoryState?.loading ?? false,
          hasMoreMessages: selectedHistoryState?.hasMore ?? false,
          attachmentUri: pendingImageUri,
          resolveAvatar,
          resolveAuthorName,
          onCopyMessage: handleCopyMessage,
          onReplyMessage: handleReplyMessage,
          onEditMessage: handleEditMessage,
          onDeleteMessage: handleDeleteMessage,
          onStartDM: handleStartDM,
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
  );
}
