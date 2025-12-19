export type ChatMessage = {
  id: string;
  chatId: string;
  author: string;
  content: string;
  timestamp: string;
  avatarUri?: string;
  outgoing?: boolean;
  type?: 'text' | 'system';
};

export type ChatAvatarSource =
  | { kind: 'image'; uri: string }
  | { kind: 'identicon'; seed: string }
  | { kind: 'initials'; initials: string };

export type ChatThread = {
  id: string;
  name: string;
  participants: string[];
  peerAddress?: string;
  isOnline?: boolean;
  lastMessage?: { text: string; ts: string; from: string };
};

export type ServerInfo = {
  address: string;
  port: number;
  status: 'starting' | 'running';
};
