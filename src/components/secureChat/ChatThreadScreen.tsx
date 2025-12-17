import React from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '../PulseBadge';
import type { ChatMessage, ChatThread, ServerInfo } from '../../types/secureChat';

type Props = {
  chat: ChatThread | null;
  messages: ChatMessage[];
  draft: string;
  serverInfo: ServerInfo | null;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
};

export default function ChatThreadScreen({
  chat,
  messages,
  draft,
  serverInfo,
  onBack,
  onDraftChange,
  onSend,
}: Props) {
  if (!chat) {
    return (
      <View className="flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white p-6">
        <MaterialCommunityIcons name="message-text-lock-outline" size={48} color="#9ca3af" />
        <Text className="mt-4 text-xl font-semibold text-slate-900">No chat selected</Text>
        <Text className="mt-2 text-center text-slate-500">Choose a chat or start a secure connection.</Text>
      </View>
    );
  }

  const serverStatus = serverInfo
    ? serverInfo.status === 'running'
      ? `Hosting on ${serverInfo.address}:${serverInfo.port}`
      : 'Starting server...'
    : 'Server offline';

  return (
    <View className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={onBack} className="mr-2 rounded-full bg-slate-100 p-2">
              <MaterialCommunityIcons name="arrow-left" size={18} color="#111827" />
            </TouchableOpacity>
            <View>
              <Text className="text-xl font-semibold text-slate-900">{chat.name}</Text>
              <Text className="text-slate-500">
                {chat.peerAddress ? `Peer: ${chat.peerAddress}` : 'Local secure store'}
              </Text>
            </View>
          </View>
        </View>
        <View className="flex-row items-center">
          <PulseBadge size={10} color={serverInfo ? '#22c55e' : '#f97316'} />
          <Text className="ml-2 text-xs font-semibold text-slate-800">{serverStatus}</Text>
        </View>
      </View>

      <ScrollView
        className="mt-4 flex-1"
        contentContainerStyle={{ paddingBottom: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={{ maxWidth: '85%' }}
            className={`mb-3 rounded-xl px-4 py-3 ${
              msg.type === 'system'
                ? 'self-center bg-sky-100'
                : msg.outgoing
                ? 'self-end bg-indigo-600'
                : 'self-start bg-indigo-100'
            }`}
          >
            <Text className={`font-semibold ${msg.outgoing ? 'text-white' : 'text-slate-900'}`}>{msg.author}</Text>
            <Text className={`mt-1 ${msg.outgoing ? 'text-white' : 'text-slate-900'}`}>{msg.content}</Text>
            <Text className={`mt-2 text-xs ${msg.outgoing ? 'text-indigo-100' : 'text-slate-500'}`}>
              {msg.timestamp}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <TextInput
          placeholder="Type a secure message..."
          placeholderTextColor="#9ca3af"
          className="flex-1 text-slate-900"
          value={draft}
          onChangeText={onDraftChange}
          onSubmitEditing={onSend}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={onSend} className="rounded-full bg-indigo-600 p-2">
          <MaterialCommunityIcons name="send" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
