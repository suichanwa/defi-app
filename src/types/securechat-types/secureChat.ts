import type { AvatarType } from '../profile';

export type ChatMessage = {
  id: string;
  chatId: string;
  authorId?: string;
  author: string;
  content: string;
  timestamp: string;
  createdAt?: string;
  avatarUri?: string;
  outgoing?: boolean;
  deliveryStatus?: 'sent' | 'seen';
  type?: 'text' | 'system' | 'image' | 'file';
  imageUri?: string;
  imagePath?: string;
  fileUri?: string;
  fileName?: string;
  fileSize?: number;
  fileMime?: string;
  replyTo?: ChatReplyReference;
};

export type ChatAuthorProfile = {
  id: string;
  alias?: string;
  avatarType?: AvatarType;
  avatarUri?: string;
  avatarSeed?: string;
  updatedAt?: string;
};

export type ChatAvatarSource = {
  avatarType: 'identicon' | 'custom' | 'none';
  uri?: string;
  seed?: string;
};

export type ChatReplyAttachment = {
  kind: 'text' | 'image' | 'file';
  label: string;
  uri?: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

export type ChatReplyReference = {
  messageId?: string;
  authorId?: string;
  author: string;
  content: string;
  attachment?: ChatReplyAttachment;
  source?: 'xmtp' | 'supabase' | 'local';
};

export type ChatThread = {
  id: string;
  name: string;
  participants: string[];
  peerAddress: string;
  isOnline: boolean;
  isDM?: boolean; // Optional flag to identify DM threads
  avatarSource?: ChatAvatarSource;
  lastMessage?: {
    text: string;
    ts: string;
    from: string;
    authorId?: string;
  };
};

export type ServerInfo = {
  address: string;
  port: number;
  status: 'starting' | 'running';
};
