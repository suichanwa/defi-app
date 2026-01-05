export type SecureChatScreenProps = {
  isActive?: boolean;
  onChatViewChange?: (view: 'list' | 'thread') => void;
};

export type SecureChatMessageRow = {
  id: string;
  room_id: string;
  author: string;
  author_id?: string | null;
  content: string;
  created_at?: string | null;
  image_path?: string | null;
  message_type?: 'text' | 'system' | 'image' | null;
};
