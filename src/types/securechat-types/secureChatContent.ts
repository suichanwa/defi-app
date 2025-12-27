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
  p2p: {
    status: string;
    peerLabel?: string | null;
    localOffer: string;
    localAnswer: string;
    localCandidates: string;
    remoteOffer: string;
    remoteAnswer: string;
    remoteCandidates: string;
    onRemoteOfferChange: (value: string) => void;
    onRemoteAnswerChange: (value: string) => void;
    onRemoteCandidatesChange: (value: string) => void;
    onCreateOffer: () => void;
    onCreateAnswer: () => void;
    onAcceptAnswer: () => void;
    onAddCandidates: () => void;
    onReset: () => void;
  };
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
  onStartP2P?: (userId: string, userName: string) => void;
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
