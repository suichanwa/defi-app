import type { ChatAvatarSource, ChatMessage, ChatThread, ServerInfo } from './secureChat';

export type SecureChatConnectProps = {
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

export type SecureChatThreadProps = {
  chat: ChatThread | null;
  messages: ChatMessage[];
  draft: string;
  serverInfo: ServerInfo | null;
  participantCount: number;
  currentUserId?: string;
  currentUserLabel?: string;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  onClearAttachment: () => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  attachmentUri?: string | null;
  resolveAvatar: (message: ChatMessage) => ChatAvatarSource;
  resolveAuthorName: (message: ChatMessage) => string;
  onCopyMessage?: (message: ChatMessage) => void;
  onReplyMessage?: (message: ChatMessage) => void;
  onEditMessage?: (message: ChatMessage) => void;
  onDeleteMessage?: (message: ChatMessage) => void;
  onStartDM?: (userId: string, userName: string) => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
};

export type SecureChatListProps = {
  chats: ChatThread[];
  selectedChatId: string;
  onSelectChat: (chatId: string) => void;
  onOpenSelected: (chatId: string) => void;
};

export type SecureChatContentProps = {
  secureTab: 'chats' | 'connect';
  chatView: 'list' | 'thread';
  connect: SecureChatConnectProps;
  thread: SecureChatThreadProps;
  list: SecureChatListProps;
};
