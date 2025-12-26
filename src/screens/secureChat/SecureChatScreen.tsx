import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Platform, useWindowDimensions } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage, ChatThread, ServerInfo } from '@app-types/secureChat';
import type { AvatarType } from '@app-types/profile';
import * as date from 'date-and-time';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import SecureChatContent from './components/SecureChatContent';
import SecureChatLayout from './components/SecureChatLayout';
import { supabase, isSupabaseConfigured } from '../../services/supabaseClient';
import { getAuthSession, onAuthStateChange, type AuthSession } from '../../services/auth';
import { getAnonymousId, toAnonymousProfileId } from '../../services/identity';
import { loadProfileSettings } from '../../services/profileStore';
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

type Props = {
  isActive?: boolean;
};

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value: string) => uuidRegex.test(value);
const DM_POLL_INTERVAL_ACTIVE_MS = 1200;
const DM_POLL_INTERVAL_IDLE_MS = 3000;

export default function SecureChatScreen({ isActive = false }: Props) {
  const [secureTab, setSecureTab] = useState<'chats' | 'connect'>('chats');
  const [chatView, setChatView] = useState<'list' | 'thread'>('list');
  const [chats, setChats] = useState<ChatThread[]>([
    {
      id: 'global',
      name: 'Global room',
      participants: ['You'],
      peerAddress: 'supabase-realtime',
      isOnline: false,
      lastMessage: { text: 'Join to start chatting.', ts: date.format(new Date(), 'HH:mm'), from: 'System' },
    },
  ]);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [dmChannels, setDmChannels] = useState<ChatThread[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('global');
  const [draft, setDraft] = useState('');
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [connectAddress, setConnectAddress] = useState('');
  const [connectName, setConnectName] = useState('');
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>(['No active peer connections yet.']);
  const [timeLabel, setTimeLabel] = useState('');
  const [session, setSession] = useState<AuthSession>(null);
  const [anonId, setAnonId] = useState<string>('');
  const [authLabel, setAuthLabel] = useState<string>('');
  const [profileAlias, setProfileAlias] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('global');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userAvatarUri, setUserAvatarUri] = useState<string | undefined>(undefined);
  const [userAvatarType, setUserAvatarType] = useState<AvatarType>('identicon');
  const [userAvatarSeed, setUserAvatarSeed] = useState<string | undefined>(undefined);
  const [isChannelReady, setIsChannelReady] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [mutedChatIds, setMutedChatIds] = useState<Set<string>>(() => new Set());
  const lastDmFetchRef = useRef<Record<string, string>>({});
  const dmChannelHeadsRef = useRef<Record<string, string | null>>({});
  const dmPollInFlightRef = useRef(false);
  const { width } = useWindowDimensions();
  const isCompact = width < 720;
  const authorId = useMemo(
    () => session?.user?.id ?? (anonId ? toAnonymousProfileId(anonId) : undefined),
    [anonId, session],
  );
  const displayLabel = profileAlias || authLabel || 'Anonymous';

  // Generate a fallback ID for anonymous users
  const effectiveUserId = useMemo(() => {
    if (authorId) return authorId;
    if (displayLabel && displayLabel !== 'Anonymous') {
      return `anon-${displayLabel.replace(/[^a-zA-Z0-9]/g, '-')}`;
    }
    return `anon-${Date.now()}`;
  }, [authorId, displayLabel]);

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

  const selectedMessages = useMemo(
    () => messagesByChat[selectedChatId] ?? [],
    [messagesByChat, selectedChatId],
  );

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

  const handlePickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow photo access to attach images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0]?.uri;
      if (uri) setPendingImageUri(uri);
    }
  }, []);

  const handleClearAttachment = useCallback(() => {
    setPendingImageUri(null);
  }, []);

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

  type MessageRow = {
    id: string;
    room_id: string;
    author: string;
    author_id?: string | null;
    content: string;
    created_at?: string | null;
  };

  const mapRowToMessage = (row: MessageRow) => {
    const ts = row.created_at ? new Date(row.created_at) : new Date();
    const isOutgoing = authorId ? row.author_id === authorId : row.author === displayLabel;
    const outgoingAvatarUri = isOutgoing && userAvatarType === 'custom' ? userAvatarUri : undefined;
    return {
      id: row.id,
      chatId: row.room_id,
      authorId: row.author_id ?? undefined,
      author: row.author,
      content: row.content,
      timestamp: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: row.created_at ?? ts.toISOString(),
      outgoing: isOutgoing,
      avatarUri: isOutgoing ? outgoingAvatarUri : undefined,
      type: 'text' as const,
    };
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setConnectionLog((prev) => [
        'Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY to enable chat.',
        ...prev,
      ]);
      return undefined;
    }
    let active = true;
    getAuthSession().then(async (current) => {
      if (!active) return;
      setSession(current);
      const anonIdValue = await getAnonymousId();
      setAnonId(anonIdValue);
      const label = current?.user?.email ?? current?.user?.id ?? `anon-${anonIdValue.slice(-6)}`;
      setAuthLabel(label);
    });
    const sub = onAuthStateChange(async (next) => {
      setSession(next);
      const anonIdValue = await getAnonymousId();
      setAnonId(anonIdValue);
      const label = next?.user?.email ?? next?.user?.id ?? `anon-${anonIdValue.slice(-6)}`;
      setAuthLabel(label);
    });
    return () => {
      active = false;
      sub?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isActive) return;
    let mounted = true;
    loadProfileSettings().then((settings) => {
      if (!mounted) return;
      if (settings.alias) {
        setProfileAlias(settings.alias);
      } else {
        setProfileAlias('');
      }
      setUserAvatarUri(settings.avatarUri);
      setUserAvatarType(settings.avatarType ?? 'identicon');
      setUserAvatarSeed(settings.avatarSeed);
    });
    return () => {
      mounted = false;
    };
  }, [isActive]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (!supabase) return;

    // Always keep a "global" room available.
    setChats((prev) => {
      if (prev.find((c) => c.id === 'global')) return prev;
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return [
        {
          id: 'global',
          name: 'Global room',
          participants: ['You'],
          peerAddress: 'supabase-realtime',
          isOnline: true,
          lastMessage: { text: 'Connected to Supabase Realtime.', ts: now, from: 'System' },
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
          await loadHistory(roomId);
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

  const loadHistory = async (room: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    const supabaseClient = supabase;
    setHistoryLoading(true);
    let data: MessageRow[] | null = null;
    let error: { message?: string } | null = null;
    {
      const response = await supabaseClient
        .from('messages')
        .select('id, room_id, author, author_id, content, created_at')
        .eq('room_id', room)
        .order('created_at', { ascending: true })
        .limit(200);
      data = response.data as MessageRow[] | null;
      error = response.error;
    }

    if (error && error.message?.includes('author_id')) {
      const response = await supabaseClient
        .from('messages')
        .select('id, room_id, author, content, created_at')
        .eq('room_id', room)
        .order('created_at', { ascending: true })
        .limit(200);
      data = response.data as MessageRow[] | null;
      error = response.error;
    }

    if (error) {
      setConnectionLog((prev) => [`History error: ${error.message}`, ...prev]);
      setHistoryLoading(false);
      return;
    }

    const mapped = (data ?? []).map(mapRowToMessage);
    setMessagesByChat((prev) => ({ ...prev, [room]: mapped }));
    if (mapped.length > 0) {
      const last = mapped[mapped.length - 1];
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === room
            ? {
                ...chat,
                lastMessage: {
                  text: last.content,
                  ts: last.timestamp,
                  from: resolveAuthorName(last),
                  authorId: last.authorId,
                },
              }
            : chat,
        ),
      );
    }
    setHistoryLoading(false);
  };

  useEffect(() => {
    const tick = () => setTimeLabel(date.format(new Date(), 'HH:mm:ss'));
    tick();
    const interval = setInterval(tick, 1_000);
    return () => clearInterval(interval);
  }, []);

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
  }, [effectiveUserId]);

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
      setSelectedChatId(channel.id);
      setRoomId(channel.id);
      setChatView('thread');
      setSecureTab('chats');
    } catch (error) {
      console.error('Failed to start DM:', error);
      const message = error instanceof Error ? error.message : 'Failed to start DM.';
      Alert.alert('Direct message error', message);
    }
  }, [effectiveUserId, displayLabel]);

  // Update handleSelectChat to load DM messages
  const handleSelectChat = useCallback(async (chatId: string) => {
    setSelectedChatId(chatId);
    setRoomId(chatId);
    setChatView('thread');
    setPendingImageUri(null);
    
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
      setMessagesByChat((prev) => (prev[chatId] ? prev : { ...prev, [chatId]: [] }));
    }
  }, [effectiveUserId]);

  const appendLocalImageMessage = useCallback(
    (chatId: string, imageUri: string) => {
      const now = new Date();
      const outgoingAvatarUri = userAvatarType === 'custom' ? userAvatarUri : undefined;
      const message: ChatMessage = {
        id: `${now.getTime()}-image`,
        chatId,
        authorId,
        author: displayLabel,
        content: 'Photo',
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: now.toISOString(),
        avatarUri: outgoingAvatarUri,
        outgoing: true,
        type: 'image',
        imageUri,
      };

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
        const now = new Date();
        const outgoingAvatarUri = userAvatarType === 'custom' ? userAvatarUri : undefined;
        const message: ChatMessage = {
          id: now.getTime().toString(),
          chatId: selectedChat.id,
          authorId,
          author: displayLabel,
          content: trimmed,
          timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          createdAt: now.toISOString(),
          avatarUri: outgoingAvatarUri,
          outgoing: true,
          type: 'text',
        };

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
      appendLocalImageMessage(selectedChat.id, pendingImageUri);
      setPendingImageUri(null);
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
    setSelectedChatId(chatId);
    setRoomId(chatId);
    setSecureTab('chats');
    setChatView('thread');
    setConnectAddress('');
    setConnectName('');
  };

  const handleStartServer = () => {
    if (serverInfo?.status === 'running') return;
    const address = '192.168.0.24';
    const port = 9_000 + Math.floor(Math.random() * 300);

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
    setSecureTab(tab);
    if (tab === 'chats') {
      setChatView('list');
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) return;
    const onBackPress = () => {
      if (secureTab === 'chats' && chatView === 'thread') {
        setChatView('list');
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
          onBack: () => setChatView('list'),
          onDraftChange: setDraft,
          onSend: handleSendMessage,
          onPickImage: handlePickImage,
          onClearAttachment: handleClearAttachment,
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
