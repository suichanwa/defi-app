import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import ChatHeader from '../components/secureChat/ChatHeader';
import ChatTabs from '../components/secureChat/ChatTabs';
import ChatListScreen from '../components/secureChat/ChatListScreen';
import ChatThreadScreen from '../components/secureChat/ChatThreadScreen';
import ConnectScreen from '../components/secureChat/ConnectScreen';
import type { ChatMessage, ChatThread, ServerInfo } from '../types/secureChat';
import * as date from 'date-and-time';
import * as Location from 'expo-location';

const initialChats: ChatThread[] = [
  {
    id: 'support',
    name: 'Secure Support',
    participants: ['You', 'Support'],
    peerAddress: 'local',
    isOnline: true,
    lastMessage: { text: 'Welcome to Secure Chat.', ts: '10:00', from: 'Support' },
  },
  {
    id: 'saved',
    name: 'Saved Messages',
    participants: ['You'],
    peerAddress: '',
    isOnline: false,
    lastMessage: { text: 'Start the server to sync peers.', ts: '09:45', from: 'System' },
  },
];

const initialMessages: Record<string, ChatMessage[]> = {
  support: [
    { id: '1', chatId: 'support', author: 'Support', content: 'Welcome to Secure Chat.', timestamp: '10:00' },
    {
      id: '2',
      chatId: 'support',
      author: 'You',
      content: 'Show me my latest transactions.',
      timestamp: '10:02',
      outgoing: true,
    },
  ],
  saved: [
    {
      id: '3',
      chatId: 'saved',
      author: 'System',
      content: 'Saved messages live here once your server is running.',
      timestamp: '09:45',
      type: 'system',
    },
  ],
};

export default function SecureChatScreen() {
  const [secureTab, setSecureTab] = useState<'chats' | 'connect'>('chats');
  const [chatView, setChatView] = useState<'list' | 'thread'>('list');
  const [chats, setChats] = useState<ChatThread[]>(initialChats);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>(initialMessages);
  const [selectedChatId, setSelectedChatId] = useState<string>(initialChats[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const [connectAddress, setConnectAddress] = useState('');
  const [connectName, setConnectName] = useState('');
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>(['No active peer connections yet.']);
  const [timeLabel, setTimeLabel] = useState('');
  const [locationLabel, setLocationLabel] = useState('Location: requesting...');
  const { width } = useWindowDimensions();
  const isCompact = width < 720;

  const devicePublicKey =
    'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAw5R9LJ0ExamplePublicKeyForDemoOnly';

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) ?? null,
    [chats, selectedChatId],
  );

  const selectedMessages = useMemo(
    () => messagesByChat[selectedChatId] ?? [],
    [messagesByChat, selectedChatId],
  );

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
    setChatView('thread');
  };

  const handleSendMessage = () => {
    if (!draft.trim() || !selectedChat) return;
    const now = new Date();
    const message: ChatMessage = {
      id: now.getTime().toString(),
      chatId: selectedChat.id,
      author: 'You',
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
  };

  const handleConnectPeer = () => {
    if (!connectAddress.trim()) {
      setConnectionLog((prev) => ['Enter a peer address to connect.', ...prev]);
      return;
    }

    const address = connectAddress.trim();
    const name = connectName.trim() || `Peer @ ${address}`;
    const chatId = `peer-${Date.now()}`;
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
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <ChatHeader
        isCompact={isCompact}
        onConnectPress={() => handleTabChange('connect')}
        onHostPress={handleStartServer}
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
          onConnectPress={() => handleTabChange('connect')}
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
