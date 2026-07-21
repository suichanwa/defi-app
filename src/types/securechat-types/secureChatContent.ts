import type { ChatAvatarSource, ChatMessage, ChatReplyReference, ChatThread, ServerInfo } from './secureChat';

export type SecureChatConnectProps = {
  connectAddress: string;
  connectName: string;
  connectionLog: string[];
  devicePublicKey: string;
  serverInfo: ServerInfo | null;
  xmtpStatus: 'idle' | 'unsupported' | 'initializing' | 'ready' | 'error';
  onBackToChats: () => void;
  onConnectAddressChange: (value: string) => void;
  onConnectNameChange: (value: string) => void;
  onConnectPress: () => void;
  onStartServer: () => void;
  onClearLog?: () => void;
};

export type SecureChatThreadProps = {
  chat: ChatThread | null;
  messages: ChatMessage[];
  draft: string;
  replyTarget?: ChatReplyReference | null;
  serverInfo: ServerInfo | null;
  participantCount: number;
  unreadCount?: number;
  currentUserId?: string;
  currentUserLabel?: string;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onClearReplyTarget?: () => void;
  onPickImage: () => void;
  onPickFile?: () => void;
  onClearAttachment: () => void;
  onClearFile?: () => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMoreMessages?: boolean;
  attachmentUri?: string | null;
  fileAttachment?: { uri: string; name: string } | null;
  typingLabel?: string | null;
  resolveAvatar: (message: ChatMessage) => ChatAvatarSource;
  resolveAuthorName: (message: ChatMessage) => string;
  onCopyMessage?: (message: ChatMessage) => void;
  onReplyMessage?: (message: ChatMessage) => void;
  onEditMessage?: (message: ChatMessage) => void;
  onDeleteMessage?: (message: ChatMessage) => void;
  onDeleteChat?: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
};

export type SecureChatListProps = {
  chats: ChatThread[];
  selectedChatId: string;
  unreadCountByChatId?: Record<string, number>;
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
