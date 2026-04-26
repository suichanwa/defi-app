import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage, ChatThread } from '@app-types/securechat-types/secureChat';
import type { ShowToastParams } from '@services/toast';

export type ToastFn = (options: ShowToastParams) => void;

export type AlertFn = (title: string, message: string) => void;

export type ClipboardFn = (text: string) => Promise<void> | Promise<boolean>;

export type MessageNotifierRef = {
  current: (chatId: string, message: ChatMessage) => void;
};

export type ResolveAuthorRef = {
  current: (message: ChatMessage) => string;
};

export type GetChatById = (chatId: string) => ChatThread | null;

export type NotifyNativeFn = (payload: {
  chatId: string;
  chatName: string;
  message: ChatMessage;
}) => void | Promise<void>;

export type PendingFile = {
  uri: string;
  name: string;
  size: number;
  mime: string;
};

export type SetState<T> = Dispatch<SetStateAction<T>>;

export type SecureChatTab = 'chats' | 'connect';

export type SecureChatView = 'list' | 'thread';
