import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type TabKey = 'chats' | 'connect';

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
};

export default function ChatTabs({ activeTab, onTabChange }: Props) {
  return (
    <View className="mt-4 flex-row flex-wrap">
      <TouchableOpacity
        className={`mr-2 mb-2 flex-row items-center rounded-xl px-4 py-2 ${
          activeTab === 'chats' ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
        onPress={() => onTabChange('chats')}
      >
        <MaterialCommunityIcons
          name="message-outline"
          size={18}
          color={activeTab === 'chats' ? '#ffffff' : '#111827'}
        />
        <Text className={`ml-2 font-semibold ${activeTab === 'chats' ? 'text-white' : 'text-slate-900'}`}>
          Chats
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        className={`mb-2 flex-row items-center rounded-xl px-4 py-2 ${
          activeTab === 'connect' ? 'bg-indigo-600' : 'bg-slate-200'
        }`}
        onPress={() => onTabChange('connect')}
      >
        <MaterialCommunityIcons
          name="access-point"
          size={18}
          color={activeTab === 'connect' ? '#ffffff' : '#111827'}
        />
        <Text className={`ml-2 font-semibold ${activeTab === 'connect' ? 'text-white' : 'text-slate-900'}`}>
          Connect
        </Text>
      </TouchableOpacity>
    </View>
  );
}
