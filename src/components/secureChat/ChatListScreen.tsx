import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '../PulseBadge';
import type { ChatThread } from '../../types/secureChat';

type Props = {
  chats: ChatThread[];
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
  onConnectPress: () => void;
};

export default function ChatListScreen({ chats, selectedChatId, onSelectChat, onConnectPress }: Props) {
  return (
    <View className="mt-4 flex-1">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-slate-900">Chats</Text>
          <Text className="mt-1 text-slate-500">Borrowed from secureChat flow</Text>
        </View>
        <TouchableOpacity
          className="flex-row items-center rounded-xl bg-slate-200 px-4 py-3"
          onPress={onConnectPress}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="access-point" color="#111827" size={18} />
          <Text className="ml-2 font-semibold text-slate-900">Connect</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="mt-4"
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {chats.map((chat) => {
          const isActive = chat.id === selectedChatId;
          return (
            <TouchableOpacity
              key={chat.id}
              className={`mb-3 rounded-xl border px-4 py-3 ${
                isActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'
              }`}
              onPress={() => onSelectChat(chat.id)}
              activeOpacity={0.85}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-2">
                  <Text className="font-semibold text-slate-900">{chat.name}</Text>
                  <Text className="mt-1 text-slate-500">{chat.lastMessage?.text || 'No messages yet.'}</Text>
                </View>
                <View className="flex-row items-center">
                  <PulseBadge size={9} color={chat.isOnline ? '#22c55e' : '#f97316'} />
                  <Text className="ml-2 text-xs text-slate-800">{chat.isOnline ? 'Online' : 'Offline'}</Text>
                </View>
              </View>
              <Text className="mt-2 text-xs text-slate-500">
                {chat.peerAddress ? `Peer: ${chat.peerAddress}` : 'Ready to sync when server is running'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
