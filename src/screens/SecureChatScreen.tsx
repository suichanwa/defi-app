import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import ChatHeader from '../components/secureChat/ChatHeader';
import ChatTabs from '../components/secureChat/ChatTabs';
import ChatListScreen from '../components/secureChat/ChatListScreen';
import ChatThreadScreen from '../components/secureChat/ChatThreadScreen';
import ConnectScreen from '../components/secureChat/ConnectScreen';
import type { ChatMessage, ChatThread, ServerInfo } from '../types/secureChat';
import * as date from 'date-and-time';
import * as Location from 'expo-location';
import { useTheme } from '../theme/ThemeProvider';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { getAuthSession, onAuthStateChange, type AuthSession } from '../services/auth';
import { getAnonymousId } from '../services/identity';
import { loadProfileSettings } from '../services/profileStore';

export default function SecureChatScreen() {
  const { colors } = useTheme();
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
  const [selectedChatId, setSelectedChatId] = useState<string>('global');
  const [draft, setDraft] = useState('');
  const [connectAddress, setConnectAddress] = useState('');
  const [connectName, setConnectName] = useState('');
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>(['No active peer connections yet.']);
  const [timeLabel, setTimeLabel] = useState('');
  const [locationLabel, setLocationLabel] = useState('Location: requesting...');
  const [session, setSession] = useState<AuthSession>(null);
  const [userLabel, setUserLabel] = useState<string>('Anonymous');
  const [roomId, setRoomId] = useState<string>('global');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [userAvatarUri, setUserAvatarUri] = useState<string | undefined>(undefined);
  const { width } = useWindowDimensions();
  const isCompact = width < 720;

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  const devicePublicKey = useMemo(() => `user:${userLabel}`, [userLabel]);

  const selectedMessages = useMemo(
    () => messagesByChat[selectedChatId] ?? [],
    [messagesByChat, selectedChatId],
  );

  const mapRowToMessage = (row: { id: string; room_id: string; author: string; content: string; created_at?: string }) => {
    const ts = row.created_at ? new Date(row.created_at) : new Date();
    return {
      id: row.id,
      chatId: row.room_id,
      author: row.author,
      content: row.content,
      timestamp: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      outgoing: row.author === userLabel,
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
      const anonId = await getAnonymousId();
      const label = current?.user?.email ?? current?.user?.id ?? `anon-${anonId.slice(-6)}`;
      setUserLabel(label);
    });
    const sub = onAuthStateChange((next) => setSession(next));
    return () => {
      active = false;
      sub?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    loadProfileSettings().then((settings) => {
      if (!mounted) return;
      if (settings.alias) {
        setUserLabel(settings.alias);
      }
      setUserAvatarUri(settings.avatarUri);
    });
    return () => {
      mounted = false;
    };
  }, []);

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

    // Tear down previous channel.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`chat:${roomId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: session?.user?.id ?? userLabel },
      },
    });

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const msg = payload as ChatMessage;
        setMessagesByChat((prev) => {
          const existing = prev[msg.chatId] ?? [];
          const seen = existing.some((m) => m.id === msg.id);
          if (seen) return prev;
          return { ...prev, [msg.chatId]: [...existing, msg] };
        });
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === msg.chatId
              ? { ...chat, lastMessage: { text: msg.content, ts: msg.timestamp, from: msg.author } }
              : chat,
          ),
        );
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const keys = Object.keys(state);
        setChats((prev) =>
          prev.map((chat) => (chat.id === roomId ? { ...chat, isOnline: keys.length > 0 } : chat)),
        );
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user: userLabel, room: roomId });
          setConnectionLog((prev) => [`Joined room ${roomId}.`, ...prev]);
          setServerInfo({ address: 'supabase', port: 0, status: 'running' });
          setChats((prev) =>
            prev.map((chat) => (chat.id === roomId ? { ...chat, isOnline: true } : chat)),
          );
          await loadHistory(roomId);
        }
        if (status === 'CHANNEL_ERROR') {
          setConnectionLog((prev) => [`Failed to join room ${roomId}. Check Supabase Realtime keys.`, ...prev]);
        }
      });

    channelRef.current = channel;
    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [roomId, session, userLabel]);

  const loadHistory = async (room: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select('id, room_id, author, content, created_at')
      .eq('room_id', room)
      .order('created_at', { ascending: true })
      .limit(200);

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
          chat.id === room ? { ...chat, lastMessage: { text: last.content, ts: last.timestamp, from: last.author } } : chat,
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

  useEffect(() => {
    let active = true;
    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (active) setLocationLabel('Location: permission denied');
          return;
        }

        const current = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = current.coords;
        let label = `Lat ${latitude.toFixed(3)}, Lon ${longitude.toFixed(3)}`;

        try {
          const results = await Location.reverseGeocodeAsync({ latitude, longitude });
          const place = results[0];
          if (place) {
            const parts = [place.city, place.region, place.country].filter(Boolean);
            if (parts.length > 0) {
              label = parts.join(', ');
            }
          }
        } catch (error) {
          // Keep coordinate fallback.
        }

        if (active) setLocationLabel(`Location: ${label}`);
      } catch (error) {
        if (active) setLocationLabel('Location: unavailable');
      }
    };

    requestLocation();
    return () => {
      active = false;
    };
  }, []);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setRoomId(chatId);
    setChatView('thread');
    setMessagesByChat((prev) => (prev[chatId] ? prev : { ...prev, [chatId]: [] }));
  };

  const handleSendMessage = async () => {
    if (!draft.trim() || !selectedChat) return;
    if (!isSupabaseConfigured || !supabase) {
      Alert.alert('Supabase not configured', 'Set SUPABASE_URL and SUPABASE_ANON_KEY to send messages.');
      return;
    }
    const now = new Date();
    const message: ChatMessage = {
      id: now.getTime().toString(),
      chatId: selectedChat.id,
      author: userLabel,
      content: draft.trim(),
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
          ? { ...chat, lastMessage: { text: message.content, ts: message.timestamp, from: 'You' } }
          : chat,
      ),
    );
    setDraft('');

    // Persist to Supabase (best-effort).
    supabase
      .from('messages')
      .insert({
        room_id: selectedChat.id,
        author: userLabel,
        content: message.content,
        created_at: new Date().toISOString(),
      })
      .then(({ error }) => {
        if (error) {
          setConnectionLog((prev) => [`Save error: ${error.message}`, ...prev]);
        }
      });

    // Broadcast to room (ephemeral).
    const channel = channelRef.current;
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'message',
        payload: { ...message, outgoing: false },
      });
    }
  };

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

  return (
    <View
      style={[
        styles.container,
        isCompact && styles.containerCompact,
        { backgroundColor: colors.background },
      ]}
    >
      <ChatHeader
        isCompact={isCompact}
        timeLabel={timeLabel}
        locationLabel={locationLabel}
      />
      <ChatTabs activeTab={secureTab} onTabChange={handleTabChange} />

      {secureTab === 'connect' ? (
        <ConnectScreen
          connectAddress={connectAddress}
          connectName={connectName}
          connectionLog={connectionLog}
          devicePublicKey={devicePublicKey}
          serverInfo={serverInfo}
          onConnectAddressChange={setConnectAddress}
          onConnectNameChange={setConnectName}
          onConnectPress={handleConnectPeer}
          onStartServer={handleStartServer}
        />
      ) : chatView === 'thread' ? (
        <View style={styles.threadWrapper}>
          <ChatThreadScreen
            chat={selectedChat}
            messages={selectedMessages}
            draft={draft}
            serverInfo={serverInfo}
            userAvatarUri={userAvatarUri}
            onBack={() => setChatView('list')}
            onDraftChange={setDraft}
            onSend={handleSendMessage}
          />
        </View>
      ) : (
        <ChatListScreen
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          onOpenSelected={handleSelectChat}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 112,
  },
  containerCompact: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  threadWrapper: {
    marginTop: 16,
    flex: 1,
  },
});
