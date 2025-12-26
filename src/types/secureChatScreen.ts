export type SecureChatScreenProps = {
  isActive?: boolean;
};

export type SecureChatMessageRow = {
  id: string;
  room_id: string;
  author: string;
  author_id?: string | null;
  content: string;
  created_at?: string | null;
};
