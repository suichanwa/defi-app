import React, { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '../components/PulseBadge';
import { secureChatStyles as styles } from '../styles/SecureChatStyles';

type ChatMessage = {
  id: string;
  chatId: string;
  author: string;
  content: string;
  timestamp: string;
  outgoing?: boolean;
  type?: 'text' | 'system';
};

type ChatThread = {
  id: string;
  name: string;
  participants: string[];
  peerAddress?: string;
  isOnline?: boolean;
  lastMessage?: { text: string; ts: string; from: string };
};

type ServerInfo = {
  address: string;
  port: number;
  status: 'starting' | 'running';
};

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
  const [chats, setChats] = useState<ChatThread[]>(initialChats);
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>(initialMessages);
  const [selectedChatId, setSelectedChatId] = useState<string>(initialChats[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const [connectAddress, setConnectAddress] = useState('');
  const [connectName, setConnectName] = useState('');
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [connectionLog, setConnectionLog] = useState<string[]>(['No active peer connections yet.']);
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

  const renderMessages = () => {
    if (!selectedChat) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="message-text-lock-outline" size={48} color="#9ca3af" />
          <Text style={styles.chatTitle}>No chat selected</Text>
          <Text style={styles.chatSubtitle}>Choose a chat or start a secure connection.</Text>
        </View>
      );
    }

    const serverStatus = serverInfo
      ? serverInfo.status === 'running'
        ? `Hosting on ${serverInfo.address}:${serverInfo.port}`
        : 'Starting server...'
      : 'Server offline';

    return (
      <View style={styles.chatPaneInner}>
        <View style={styles.chatPaneHeader}>
          <View>
            <Text style={styles.chatTitle}>{selectedChat.name}</Text>
            <Text style={styles.chatSubtitle}>
              {selectedChat.peerAddress ? `Peer: ${selectedChat.peerAddress}` : 'Local secure store'}
            </Text>
          </View>
          <View style={styles.serverStatus}>
            <PulseBadge size={10} color={serverInfo ? '#22c55e' : '#f97316'} />
            <Text style={styles.serverStatusText}>{serverStatus}</Text>
          </View>
        </View>

        <ScrollView style={styles.messagesPane} contentContainerStyle={styles.messagesContent}>
          {selectedMessages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.type === 'system'
                  ? styles.messageSystem
                  : msg.outgoing
                  ? styles.messageOutgoing
                  : styles.messageIncoming,
              ]}
            >
              <Text style={styles.messageAuthor}>{msg.author}</Text>
              <Text style={styles.messageText}>{msg.content}</Text>
              <Text style={styles.messageTs}>{msg.timestamp}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.chatInputBar}>
          <TextInput
            placeholder="Type a secure message..."
            placeholderTextColor="#9ca3af"
            style={styles.chatInput}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={handleSendMessage} activeOpacity={0.85}>
            <MaterialCommunityIcons name="send" size={22} color="#4f46e5" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderConnectContent = () => (
    <View style={[styles.connectGrid, isCompact && styles.connectGridCompact]}>
      <View style={styles.connectCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.chatTitle}>Connect to a peer</Text>
          <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#4f46e5" />
        </View>
        <Text style={styles.chatSubtitle}>Mirror of secureChat ConnectionForm in React Native</Text>
        <TextInput
          placeholder="192.168.1.20:8080"
          placeholderTextColor="#9ca3af"
          style={styles.connectInput}
          value={connectAddress}
          onChangeText={setConnectAddress}
          autoCapitalize="none"
        />
        <Text style={styles.connectHint}>Peer address (IP:Port or hostname)</Text>
        <TextInput
          placeholder="Chat name (optional)"
          placeholderTextColor="#9ca3af"
          style={styles.connectInput}
          value={connectName}
          onChangeText={setConnectName}
        />
        <TouchableOpacity style={styles.primaryButton} onPress={handleConnectPeer} activeOpacity={0.9}>
          <MaterialCommunityIcons name="access-point-network" size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Connect securely</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.connectCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.chatTitle}>Host a server</Text>
          <MaterialCommunityIcons name="server" size={22} color="#111827" />
        </View>
        <Text style={styles.chatSubtitle}>Adapted from secureChat InfoPanel</Text>
        <View style={styles.serverRow}>
          <PulseBadge size={10} color={serverInfo ? '#22c55e' : '#f97316'} />
          <Text style={styles.serverStatusText}>
            {serverInfo
              ? serverInfo.status === 'running'
                ? `Running on ${serverInfo.address}:${serverInfo.port}`
                : 'Starting...'
              : 'Server offline'}
          </Text>
        </View>
        <Text style={styles.connectHint}>Share this address with peers once running.</Text>
        <Text style={styles.addressPill}>
          {serverInfo ? `${serverInfo.address}:${serverInfo.port}` : 'Not started yet'}
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, serverInfo?.status === 'running' && styles.primaryButtonDisabled]}
          onPress={handleStartServer}
          activeOpacity={serverInfo?.status === 'running' ? 1 : 0.9}
        >
          <MaterialCommunityIcons name={serverInfo?.status === 'running' ? 'check' : 'rocket-launch'} size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>
            {serverInfo?.status === 'running' ? 'Server running' : 'Start server'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.connectCard}>
        <Text style={styles.chatTitle}>Connection activity</Text>
        <Text style={styles.chatSubtitle}>Recent events from transport / clipboard helpers</Text>
        <ScrollView style={styles.connectionLog}>
          {connectionLog.map((line, idx) => (
            <Text key={`${line}-${idx}`} style={styles.logLine}>
              - {line}
            </Text>
          ))}
        </ScrollView>
        <Text style={styles.connectHint}>Public key preview (from secureChat crypto API):</Text>
        <Text style={styles.keyPreview}>{devicePublicKey}</Text>
      </View>
    </View>
  );

  const renderConnect = () =>
    isCompact ? (
      <ScrollView contentContainerStyle={styles.connectScrollContent} showsVerticalScrollIndicator={false}>
        {renderConnectContent()}
      </ScrollView>
    ) : (
      renderConnectContent()
    );

  return (
    <View style={[styles.chatShell, isCompact && styles.chatShellCompact]}>
      <View style={[styles.chatTopBar, isCompact && styles.chatTopBarCompact]}>
        <View>
          <Text style={styles.chatTitle}>Secure Chat</Text>
          <Text style={styles.chatSubtitle}>Components mirrored from repo/secureChat</Text>
        </View>
        <View style={[styles.chatActions, isCompact && styles.chatActionsCompact]}>
          <TouchableOpacity
            style={[styles.secondaryButton, isCompact && styles.secondaryButtonCompact]}
            onPress={() => setSecureTab('connect')}
            activeOpacity={0.9}
          >
            <MaterialCommunityIcons name="lan-connect" color="#111827" size={18} />
            <Text style={styles.secondaryButtonText}>Connect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, isCompact && styles.primaryButtonCompact]}
            onPress={handleStartServer}
            activeOpacity={0.9}
          >
            <MaterialCommunityIcons name="rocket-launch" color="#ffffff" size={18} />
            <Text style={styles.primaryButtonText}>Host server</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.chatTabs, isCompact && styles.chatTabsCompact]}>
        <TouchableOpacity
          style={[styles.chatTab, secureTab === 'chats' && styles.chatTabActive]}
          onPress={() => setSecureTab('chats')}
        >
          <MaterialCommunityIcons
            name="message-outline"
            size={18}
            color={secureTab === 'chats' ? '#ffffff' : '#111827'}
          />
          <Text style={[styles.chatTabText, secureTab === 'chats' && styles.chatTabTextActive]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chatTab, secureTab === 'connect' && styles.chatTabActive]}
          onPress={() => setSecureTab('connect')}
        >
          <MaterialCommunityIcons
            name="access-point"
            size={18}
            color={secureTab === 'connect' ? '#ffffff' : '#111827'}
          />
          <Text style={[styles.chatTabText, secureTab === 'connect' && styles.chatTabTextActive]}>Connect</Text>
        </TouchableOpacity>
      </View>

      {secureTab === 'chats' ? (
        <View style={[styles.chatMain, isCompact && styles.chatMainCompact]}>
          <View style={[styles.chatListPanel, isCompact && styles.chatListPanelCompact]}>
            <View style={styles.chatListHeader}>
              <View>
                <Text style={styles.chatTitle}>Chats</Text>
                <Text style={styles.chatSubtitle}>Borrowed from secureChat flow</Text>
              </View>
              <TouchableOpacity
                style={[styles.secondaryButton, isCompact && styles.secondaryButtonCompact]}
                onPress={() => setSecureTab('connect')}
                activeOpacity={0.9}
              >
                <MaterialCommunityIcons name="access-point" color="#111827" size={18} />
                <Text style={styles.secondaryButtonText}>Connect</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={[styles.chatList, isCompact && styles.chatListCompact]}>
              {chats.map((chat) => (
                <TouchableOpacity
                  key={chat.id}
                  style={[styles.chatCard, selectedChatId === chat.id && styles.chatCardActive]}
                  onPress={() => {
                    setSelectedChatId(chat.id);
                    setSecureTab('chats');
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.chatCardRow}>
                    <View style={styles.chatCardMeta}>
                      <Text style={styles.chatName}>{chat.name}</Text>
                      <Text style={styles.chatPreview}>{chat.lastMessage?.text || 'No messages yet.'}</Text>
                    </View>
                    <View style={styles.chatBadge}>
                      <PulseBadge size={9} color={chat.isOnline ? '#22c55e' : '#f97316'} />
                      <Text style={styles.chatBadgeText}>{chat.isOnline ? 'Online' : 'Offline'}</Text>
                    </View>
                  </View>
                  {chat.peerAddress ? (
                    <Text style={styles.chatPeer}>Peer: {chat.peerAddress}</Text>
                  ) : (
                    <Text style={styles.chatPeer}>Ready to sync when server is running</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <View style={[styles.chatPane, isCompact && styles.chatPaneCompact]}>{renderMessages()}</View>
        </View>
      ) : (
        renderConnect()
      )}
    </View>
  );
}
