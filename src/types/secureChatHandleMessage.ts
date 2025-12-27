import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage, ChatThread } from '@app-types/secureChat';

export type ToastFn = (options: {
  type: string;
  text1: string;
  text2?: string;
  position?: 'top' | 'bottom';
  visibilityTime?: number;
}) => void;

export type AlertFn = (title: string, message: string) => void;

export type ClipboardFn = (text: string) => Promise<void> | Promise<boolean>;

export type MessageNotifierRef = {
  current: (chatId: string, message: ChatMessage) => void;
};

export type ResolveAuthorRef = {
  current: (message: ChatMessage) => string;
};

export type GetChatById = (chatId: string) => ChatThread | null;

export type SetState<T> = Dispatch<SetStateAction<T>>;

export type SecureChatTab = 'chats' | 'connect';

export type SecureChatView = 'list' | 'thread';
