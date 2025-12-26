import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, useWindowDimensions } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage, ChatThread, ServerInfo } from '@app-types/secureChat';
import type { SecureChatMessageRow, SecureChatScreenProps } from '@app-types/secureChatScreen';
import * as date from 'date-and-time';
import Toast from 'react-native-toast-message';
import SecureChatContent from './components/SecureChatContent';
import SecureChatLayout from './components/SecureChatLayout';
import {
  CHAT_HISTORY_PAGE_SIZE,
  DM_POLL_INTERVAL_ACTIVE_MS,
  DM_POLL_INTERVAL_IDLE_MS,
  CHAT_COMPACT_WIDTH,
  DEFAULT_GLOBAL_CHAT_ID,
  DEFAULT_GLOBAL_CHAT_NAME,
  DEFAULT_GLOBAL_CHAT_PEER,
  DEFAULT_GLOBAL_CHAT_JOIN_TEXT,
  DEFAULT_GLOBAL_CONNECTED_TEXT,
  DEFAULT_CONNECTION_LOG,
  DEFAULT_HOST_ADDRESS,
  DEFAULT_HOST_PORT_BASE,
  DEFAULT_HOST_PORT_RANGE,
} from '@constants/secureChatScreen';
import { useSecureChatIdentity } from '@hooks/useSecureChatIdentity';
import { useSecureChatImageAttachment } from '@hooks/useSecureChatImageAttachment';
import { useSecureChatUIState } from '@hooks/secureChat/useSecureChatUIState';
import { useTickingClock } from '@hooks/useTickingClock';
import { useRoomHistory } from '@hooks/useRoomHistory';
import { uploadChatImage } from '@services/chatImageStorage';
import { encodeChatImageContent, resolveChatImageMessage, resolveChatImageMessages } from '@utils/secureChatImages';
import { createOutgoingImageMessage, createOutgoingTextMessage, isUuid, mapRowToMessage } from '@utils/secureChatUtils';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { useChatAvatar } from '../../hooks/useChatAvatar';
import { useChatProfiles } from '../../hooks/useChatProfiles';
import {
  getOrCreateDMChannel,
  getDMMessages,
  getDMMessagesSince,
  sendDMMessage,
  getUserDMChannels,
  getUserDMChannelHeads,
  dmChannelToChatThread,
  subscribeToDMMessages,
} from '../../services/directMessages';

export default function SecureChatScreen({ isActive = false }: SecureChatScreenProps) {
  const [chats, setChats] = useState<ChatThread[]>([
    {
      id: DEFAULT_GLOBAL_CHAT_ID,
      name: DEFAULT_GLOBAL_CHAT_NAME,
      participants: ['You'],
      peerAddress: DEFAULT_GLOBAL_CHAT_PEER,
      isOnline: false,
      lastMessage: { text: DEFAULT_GLOBAL_CHAT_JOIN_TEXT, ts: date.format(new Date(), 'HH:mm'), from: 'System' },
    },
  ]);
  const [dmChannels, setDmChannels] = useState<ChatThread[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>([DEFAULT_CONNECTION_LOG]);
  const [roomId, setRoomId] = useState<string>(DEFAULT_GLOBAL_CHAT_ID);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [mutedChatIds, setMutedChatIds] = useState<Set<string>>(() => new Set());
  const lastDmFetchRef = useRef<Record<string, string>>({});
  const dmChannelHeadsRef = useRef<Record<string, string | null>>({});
  const dmPollInFlightRef = useRef(false);
  const { width } = useWindowDimensions();
  const isCompact = width < CHAT_COMPACT_WIDTH;
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

  const devicePublicKey = useMemo(() => `user:${displayLabel}`, [displayLabel]);

  const handlePickImage = useCallback(async () => {
    await pickImage();
  }, [pickImage]);

  const handleClearAttachment = useCallback(() => {
    clearImage();
  }, [clearImage]);

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

  const notifyIncomingMessageRef = useRef(notifyIncomingMessage);
  useEffect(() => {
    notifyIncomingMessageRef.current = notifyIncomingMessage;
  }, [notifyIncomingMessage]);

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
      pageSize: CHAT_HISTORY_PAGE_SIZE,
      mapRow,
      resolveMessages: resolveChatImageMessages,
      onHistoryError: (message) => {
        setConnectionLog((prev) => [`History error: ${message}`, ...prev]);
      },
    });

  const selectedMessages = useMemo(
    () => messagesByChat[selectedChatId] ?? [],
    [messagesByChat, selectedChatId],
  );

  const selectedHistoryState = historyStateByChat[selectedChatId];

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
      if (prev.find((c) => c.id === DEFAULT_GLOBAL_CHAT_ID)) return prev;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return [
        {
          id: DEFAULT_GLOBAL_CHAT_ID,
          name: DEFAULT_GLOBAL_CHAT_NAME,
          participants: ['You'],
          peerAddress: DEFAULT_GLOBAL_CHAT_PEER,
          isOnline: true,
          lastMessage: { text: DEFAULT_GLOBAL_CONNECTED_TEXT, ts: now, from: 'System' },
        },
        ...prev,
      ];
    });
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsChannelReady(false);
    setParticipantCount(0);

    // Tear down previous channel.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`chat:${roomId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: authorId ?? displayLabel },
      },
    });

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const msg = payload as ChatMessage;
        resolveChatImageMessage(msg)
          .then((resolved) => {
            setMessagesByChat((prev) => {
              const existing = prev[resolved.chatId] ?? [];
              const seen = existing.some((m) => m.id === resolved.id);
              if (seen) return prev;
              notifyIncomingMessageRef.current(resolved.chatId, resolved);
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
              notifyIncomingMessageRef.current(msg.chatId, msg);
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
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const keys = Object.keys(state);
        setParticipantCount(keys.length);
        setChats((prev) =>
          prev.map((chat) => (chat.id === roomId ? { ...chat, isOnline: keys.length > 0 } : chat)),
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsChannelReady(true);
          await channel.track({ user: displayLabel, room: roomId, authorId });
          setConnectionLog((prev) => [`Joined room ${roomId}.`, ...prev]);
          setServerInfo({ address: 'supabase', port: 0, status: 'running' });
          setChats((prev) =>
            prev.map((chat) => (chat.id === roomId ? { ...chat, isOnline: true } : chat)),
          );
          await loadInitial(roomId);
        }
        if (status === 'CHANNEL_ERROR') {
          setIsChannelReady(false);
          setConnectionLog((prev) => [`Failed to join room ${roomId}. Check Supabase Realtime keys.`, ...prev]);
        }
      });

    channelRef.current = channel;
    return () => {
      setIsChannelReady(false);
      setParticipantCount(0);
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [authorId, displayLabel, roomId]);

  const handleLoadMoreMessages = useCallback(() => {
    if (!selectedChat) return;
    if (selectedChat.id.startsWith('dm:')) return;
    loadOlder(selectedChat.id);
  }, [loadOlder, selectedChat]);

  // Load DM channels when user is ready
  useEffect(() => {
    if (!effectiveUserId) return;
    let mounted = true;

    const loadChannels = async () => {
      try {
        const channels = await getUserDMChannels(effectiveUserId);
        if (!mounted) return;
        setDmChannels(channels.map((ch) => dmChannelToChatThread(ch, effectiveUserId)));
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Unknown DM sync error.';
        setConnectionLog((prev) => [`DM sync error: ${message}`, ...prev]);
      }
    };

    loadChannels();

    return () => {
      mounted = false;
    };
  }, [effectiveUserId, ensureChatInitialized]);

  // Subscribe to DM messages
  useEffect(() => {
    if (!effectiveUserId) return;

    let mounted = true;
    const unsubscribe = subscribeToDMMessages(effectiveUserId, (channelId, message) => {
      setMessagesByChat((prev) => {
        const existing = prev[channelId] ?? [];
        const seen = existing.some((m) => m.id === message.id);
        if (seen) return prev;
        notifyIncomingMessageRef.current(channelId, message);
        return { ...prev, [channelId]: [...existing, message] };
      });

      if (message.createdAt) {
        const previous = lastDmFetchRef.current[channelId];
        const nextTime = Date.parse(message.createdAt);
        const prevTime = previous ? Date.parse(previous) : 0;
        if (!Number.isNaN(nextTime) && nextTime > prevTime) {
          lastDmFetchRef.current[channelId] = message.createdAt;
        }
      }

      (async () => {
        try {
          const channels = await getUserDMChannels(effectiveUserId);
          if (!mounted) return;
          setDmChannels(channels.map((ch) => dmChannelToChatThread(ch, effectiveUserId)));
        } catch (error) {
          if (!mounted) return;
          const message = error instanceof Error ? error.message : 'Unknown DM sync error.';
          setConnectionLog((prev) => [`DM sync error: ${message}`, ...prev]);
        }
      })();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [effectiveUserId]);

  useEffect(() => {
    if (!isActive) return;
    if (!isSupabaseConfigured || !supabase) return;
    if (!isUuid(effectiveUserId)) return;

    let mounted = true;
    const poll = async () => {
      if (dmPollInFlightRef.current) return;
      dmPollInFlightRef.current = true;
      try {
        const heads = await getUserDMChannelHeads(effectiveUserId);
        if (!mounted) return;

        const nextHeads: Record<string, string | null> = {};
        let headsChanged = Object.keys(dmChannelHeadsRef.current).length !== heads.length;
        heads.forEach((head) => {
          const activityAt = head.lastMessageAt ?? head.updatedAt ?? head.createdAt ?? null;
          nextHeads[head.id] = activityAt;
          if (!headsChanged) {
            const prev = dmChannelHeadsRef.current[head.id] ?? null;
            if (prev !== activityAt) headsChanged = true;
          }
        });
        dmChannelHeadsRef.current = nextHeads;

        if (headsChanged) {
          const channels = await getUserDMChannels(effectiveUserId);
          if (!mounted) return;
          setDmChannels(channels.map((ch) => dmChannelToChatThread(ch, effectiveUserId)));
        }

        if (!selectedChatId.startsWith('dm:')) return;
        const activityAt = nextHeads[selectedChatId];
        const lastSeen = lastDmFetchRef.current[selectedChatId];
        const shouldFetch =
          Boolean(activityAt) &&
          (!lastSeen || Date.parse(activityAt as string) > Date.parse(lastSeen));
        if (!shouldFetch) return;

        const newMessages = lastSeen
          ? await getDMMessagesSince(selectedChatId, effectiveUserId, lastSeen)
          : await getDMMessages(selectedChatId, effectiveUserId);
        if (!mounted) return;

        if (newMessages.length === 0) return;
        setMessagesByChat((prev) => {
          const existing = prev[selectedChatId] ?? [];
          const next = [...existing];
          newMessages.forEach((message) => {
            if (next.some((m) => m.id === message.id)) return;
            next.push(message);
            notifyIncomingMessageRef.current(selectedChatId, message);
          });
          return { ...prev, [selectedChatId]: next };
        });

        const last = newMessages[newMessages.length - 1];
        if (last?.createdAt) {
          lastDmFetchRef.current[selectedChatId] = last.createdAt;
        }
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Unknown DM sync error.';
        setConnectionLog((prev) => [`DM sync error: ${message}`, ...prev]);
      } finally {
        dmPollInFlightRef.current = false;
      }
    };

    poll();
    const isDmThreadActive =
      secureTab === 'chats' && chatView === 'thread' && selectedChatId.startsWith('dm:');
    const intervalMs = isDmThreadActive ? DM_POLL_INTERVAL_ACTIVE_MS : DM_POLL_INTERVAL_IDLE_MS;
    const interval = setInterval(poll, intervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [effectiveUserId, isActive, selectedChatId, chatView, secureTab]);

  // Combine global chats with DM channels
  const allChats = useMemo(() => {
    const globalChats = chats.filter((c) => !c.id.startsWith('dm:'));
    return [...globalChats, ...dmChannels];
  }, [chats, dmChannels]);

  // Handle starting a DM from profile view
  const handleStartDM = useCallback(async (otherUserId: string, otherUserName: string) => {
    if (!effectiveUserId) {
      console.warn('No effective user ID available');
      return;
    }

    if (isSupabaseConfigured && (!isUuid(effectiveUserId) || !isUuid(otherUserId))) {
      Alert.alert(
        'Direct message unavailable',
        'Both users must be signed in with Supabase accounts to use synced DMs.',
      );
      return;
    }
    
    // Don't allow DM to yourself
    if (otherUserId === effectiveUserId) {
      console.warn('Cannot DM yourself');
      return;
    }
    
    try {
      const channel = await getOrCreateDMChannel(
        effectiveUserId,
        displayLabel,
        otherUserId,
        otherUserName,
      );
      
      const messages = await getDMMessages(channel.id, effectiveUserId);
      setMessagesByChat((prev) => ({ ...prev, [channel.id]: messages }));
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        if (last.createdAt) {
          lastDmFetchRef.current[channel.id] = last.createdAt;
        }
      }
      
      const channels = await getUserDMChannels(effectiveUserId);
      setDmChannels(channels.map((ch) => dmChannelToChatThread(ch, effectiveUserId)));
      
      // Navigate to the DM thread
      selectChat(channel.id);
      setRoomId(channel.id);
      setTab('chats');
    } catch (error) {
      console.error('Failed to start DM:', error);
      const message = error instanceof Error ? error.message : 'Failed to start DM.';
      Alert.alert('Direct message error', message);
    }
  }, [effectiveUserId, displayLabel, selectChat, setTab]);

  // Update handleSelectChat to load DM messages
  const handleSelectChat = useCallback(async (chatId: string) => {
    selectChat(chatId);
    setRoomId(chatId);
    
    if (chatId.startsWith('dm:')) {
      try {
        const messages = await getDMMessages(chatId, effectiveUserId);
        setMessagesByChat((prev) => ({ ...prev, [chatId]: messages }));
        if (messages.length > 0) {
          const last = messages[messages.length - 1];
          if (last.createdAt) {
            lastDmFetchRef.current[chatId] = last.createdAt;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load messages.';
        Alert.alert('Direct message error', message);
      }
    } else {
      ensureChatInitialized(chatId);
    }
  }, [effectiveUserId, ensureChatInitialized, selectChat]);

  const appendLocalImageMessage = useCallback(
    (chatId: string, imageUri: string, imagePath?: string) => {
      const outgoingAvatarUri = userAvatarType === 'custom' ? userAvatarUri : undefined;
      const message = createOutgoingImageMessage({
        chatId,
        authorId,
        author: displayLabel,
        avatarUri: outgoingAvatarUri,
        imageUri,
        imagePath,
      });

      setMessagesByChat((prev) => {
        const existing = prev[chatId] ?? [];
        return { ...prev, [chatId]: [...existing, message] };
      });

      setChats((prev) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                lastMessage: { text: message.content, ts: message.timestamp, from: 'You', authorId },
              }
            : chat,
        ),
      );
    },
    [authorId, displayLabel, userAvatarType, userAvatarUri],
  );

  const persistImageMessageFallback = async (chatId: string, payload: ChatMessage, imagePath: string) => {
    if (!supabase) return;
    const supabaseClient = supabase;
    const fallbackContent = encodeChatImageContent(imagePath);
    supabaseClient
      .from('messages')
      .insert({
        room_id: chatId,
        author: payload.author,
        author_id: payload.authorId ?? null,
        content: fallbackContent,
        created_at: payload.createdAt ?? new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          setConnectionLog((prev) => [`Save error: ${error.message}`, ...prev]);
        }
      });
  };

  const persistImageMessage = async (chatId: string, payload: ChatMessage, imagePath: string) => {
    if (!supabase) return;
    const supabaseClient = supabase;
    const { error } = await supabaseClient
      .from('messages')
      .insert({
        room_id: chatId,
        author: payload.author,
        author_id: payload.authorId ?? null,
        content: payload.content,
        message_type: payload.type ?? 'image',
        image_path: imagePath,
        created_at: payload.createdAt ?? new Date().toISOString(),
      });

    if (!error) return;
    if (error.message?.includes('image_path') || error.message?.includes('message_type')) {
      await persistImageMessageFallback(chatId, payload, imagePath);
      return;
    }
    setConnectionLog((prev) => [`Save error: ${error.message}`, ...prev]);
  };

  // Update handleSendMessage to support DMs
  const handleSendMessage = async () => {
    if (!selectedChat) return;
    const trimmed = draft.trim();
    const hasText = trimmed.length > 0;
    const hasImage = Boolean(pendingImageUri);
    let sentText = false;

    if (!hasText && !hasImage) return;

    const isDM = selectedChat.id.startsWith('dm:');

    if (hasText && isDM) {
      if (isSupabaseConfigured && !isUuid(effectiveUserId)) {
        Alert.alert(
          'Direct message unavailable',
          'Sign in with a Supabase account to send synced DMs.',
        );
      } else {
        try {
          const outgoingAvatarUri = userAvatarType === 'custom' ? userAvatarUri : undefined;
          const message = await sendDMMessage(selectedChat.id, {
            chatId: selectedChat.id,
            authorId: effectiveUserId,
            author: displayLabel,
            content: trimmed,
            avatarUri: outgoingAvatarUri,
            outgoing: true,
            type: 'text',
          });

          if (message) {
            setMessagesByChat((prev) => {
              const existing = prev[selectedChat.id] ?? [];
              const seen = existing.some((m) => m.id === message.id);
              if (seen) return prev;
              return { ...prev, [selectedChat.id]: [...existing, message] };
            });
            if (message.createdAt) {
              lastDmFetchRef.current[selectedChat.id] = message.createdAt;
            }

            const channels = await getUserDMChannels(effectiveUserId);
            setDmChannels(channels.map((ch) => dmChannelToChatThread(ch, effectiveUserId)));
          }

          sentText = true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to send DM.';
          Alert.alert('Direct message error', message);
        }
      }
    }

    if (hasText && !isDM) {
      if (!isSupabaseConfigured || !supabase) {
        Alert.alert('Supabase not configured', 'Set SUPABASE_URL and SUPABASE_ANON_KEY to send messages.');
      } else {
        const supabaseClient = supabase;
        const outgoingAvatarUri = userAvatarType === 'custom' ? userAvatarUri : undefined;
        const message = createOutgoingTextMessage({
          chatId: selectedChat.id,
          authorId,
          author: displayLabel,
          content: trimmed,
          avatarUri: outgoingAvatarUri,
        });

        setMessagesByChat((prev) => {
          const existing = prev[selectedChat.id] ?? [];
          return { ...prev, [selectedChat.id]: [...existing, message] };
        });

        setChats((prev) =>
          prev.map((chat) =>
            chat.id === selectedChat.id
              ? {
                  ...chat,
                  lastMessage: { text: message.content, ts: message.timestamp, from: 'You', authorId },
                }
              : chat,
          ),
        );

        // Persist to Supabase (best-effort).
        supabaseClient
          .from('messages')
          .insert({
            room_id: selectedChat.id,
            author: displayLabel,
            author_id: authorId ?? null,
            content: message.content,
            message_type: message.type ?? 'text',
            created_at: new Date().toISOString(),
          })
          .then(async ({ error }) => {
            if (!error) return;
            if (error.message?.includes('author_id')) {
              const fallback = await supabaseClient.from('messages').insert({
                room_id: selectedChat.id,
                author: displayLabel,
                content: message.content,
                created_at: new Date().toISOString(),
              });
              if (fallback.error) {
                setConnectionLog((prev) => [`Save error: ${fallback.error.message}`, ...prev]);
              }
              return;
            }
            if (error.message?.includes('message_type')) {
              const fallback = await supabaseClient.from('messages').insert({
                room_id: selectedChat.id,
                author: displayLabel,
                author_id: authorId ?? null,
                content: message.content,
                created_at: new Date().toISOString(),
              });
              if (fallback.error) {
                setConnectionLog((prev) => [`Save error: ${fallback.error.message}`, ...prev]);
              }
              return;
            }
            setConnectionLog((prev) => [`Save error: ${error.message}`, ...prev]);
          });

        // Broadcast to room (ephemeral).
        const channel = channelRef.current;
        if (channel) {
          const payload = { ...message, outgoing: false };
          if (isChannelReady) {
            await channel.send({
              type: 'broadcast',
              event: 'message',
              payload,
            });
          } else {
            await channel.httpSend('message', payload);
          }
        }

        sentText = true;
      }
    }

    if (sentText) {
      setDraft('');
    }

    if (hasImage && pendingImageUri) {
      if (!isSupabaseConfigured || !supabase) {
        Alert.alert('Supabase not configured', 'Set SUPABASE_URL and SUPABASE_ANON_KEY to send images.');
        return;
      }
      try {
        const upload = await uploadChatImage({
          fileUri: pendingImageUri,
          chatId: selectedChat.id,
          authorId: authorId ?? effectiveUserId,
        });
        appendLocalImageMessage(selectedChat.id, upload.signedUrl, upload.path);

        const imagePayload = createOutgoingImageMessage({
          chatId: selectedChat.id,
          authorId,
          author: displayLabel,
          avatarUri: userAvatarType === 'custom' ? userAvatarUri : undefined,
          imagePath: upload.path,
          imageUri: upload.signedUrl,
        });

        if (isDM) {
          await sendDMMessage(selectedChat.id, imagePayload);
          const channels = await getUserDMChannels(effectiveUserId);
          setDmChannels(channels.map((ch) => dmChannelToChatThread(ch, effectiveUserId)));
        } else {
          await persistImageMessage(selectedChat.id, imagePayload, upload.path);
          const channel = channelRef.current;
          if (channel) {
            const payload = { ...imagePayload, outgoing: false };
            if (isChannelReady) {
              await channel.send({
                type: 'broadcast',
                event: 'message',
                payload,
              });
            } else {
              await channel.httpSend('message', payload);
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send image.';
        Alert.alert('Image upload error', message);
      } finally {
        setAttachment(null);
      }
    }
  };

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
    const address = DEFAULT_HOST_ADDRESS;
    const port = DEFAULT_HOST_PORT_BASE + Math.floor(Math.random() * DEFAULT_HOST_PORT_RANGE);

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
