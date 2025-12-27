import type { Dispatch, SetStateAction } from 'react';
import type { ChatMessage, ChatThread } from '@app-types/secureChat';
import type { ToastShowParams } from 'toastify-react-native';

export type ToastFn = (options: ToastShowParams) => void;

export type AlertFn = (title: string, message: string) => void;

export type ClipboardFn = (text: string) => Promise<void> | Promise<boolean>;

export type MessageNotifierRef = {
  current: (chatId: string, message: ChatMessage) => void;
};

export type ResolveAuthorRef = {
  current: (message: ChatMessage) => string;
};

export type GetChatById = (chatId: string) => ChatThread | null;

export type NotifyNativeFn = (chatId: string, message: ChatMessage) => void | Promise<void>;

export type PendingFile = {
  uri: string;
  name: string;
  size: number;
  mime: string;
};

export type SetState<T> = Dispatch<SetStateAction<T>>;

export type SecureChatTab = 'chats' | 'connect';

export type SecureChatView = 'list' | 'thread';
