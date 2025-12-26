import React from 'react';
import { StyleSheet, View } from 'react-native';
import ChatListScreen from '@components/secureChat/ChatListScreen';
import ChatThreadScreen from '@components/secureChat/ChatThreadScreen';
import ConnectScreen from '@components/secureChat/ConnectScreen';
import type { ChatAvatarSource, ChatMessage, ChatThread, ServerInfo } from '@app-types/secureChat';

type ConnectProps = {
  connectAddress: string;
  connectName: string;
  connectionLog: string[];
  devicePublicKey: string;
  serverInfo: ServerInfo | null;
  onConnectAddressChange: (value: string) => void;
  onConnectNameChange: (value: string) => void;
  onConnectPress: () => void;
  onStartServer: () => void;
};

type ThreadProps = {
  chat: ChatThread | null;
  messages: ChatMessage[];
  draft: string;
  serverInfo: ServerInfo | null;
  participantCount: number;
  currentUserId?: string;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  onClearAttachment: () => void;
  attachmentUri?: string | null;
  resolveAvatar: (message: ChatMessage) => ChatAvatarSource;
  resolveAuthorName: (message: ChatMessage) => string;
  onStartDM?: (userId: string, userName: string) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
};

type ListProps = {
  chats: ChatThread[];
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
  onOpenSelected: (chatId: string) => void;
};

type Props = {
  secureTab: 'chats' | 'connect';
  chatView: 'list' | 'thread';
  connect: ConnectProps;
  thread: ThreadProps;
  list: ListProps;
};

export default function SecureChatContent({ secureTab, chatView, connect, thread, list }: Props) {
  if (secureTab === 'connect') {
    return <ConnectScreen {...connect} />;
  }

  if (chatView === 'thread') {
    return (
      <View style={styles.threadWrapper}>
        <ChatThreadScreen {...thread} />
      </View>
    );
  }

  return <ChatListScreen {...list} />;
}

const styles = StyleSheet.create({
  threadWrapper: {
    flex: 1,
    marginBottom: 0,
  },
});
