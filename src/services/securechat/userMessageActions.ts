import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import type {
  ClipboardFn,
  SetState,
  ToastFn,
} from '@app-types/securechat-types/secureChatHandleMessage';
import {
  createCopyMessageHandler,
  createDeleteMessageHandler,
  createEditMessageHandler,
  createReplyMessageHandler,
} from '@services/securechat/handlemessage';

export const createToggleMuteHandler = (
  selectedChatId: string | undefined,
  setMutedChatIds: SetState<Set<string>>,
) => () => {
  if (!selectedChatId) return;
  setMutedChatIds((prev) => {
    const next = new Set(prev);
    if (next.has(selectedChatId)) {
      next.delete(selectedChatId);
    } else {
      next.add(selectedChatId);
    }
    return next;
  });
};

export const createSecureChatUserActions = ({
  setClipboard,
  showToast,
  resolveAuthorName,
  setDraft,
  isOwnMessage,
  setEditingMessage,
  messagesByChat,
  setMessagesByChat,
  setChats,
  selectedChatId,
  setMutedChatIds,
}: {
  setClipboard: ClipboardFn;
  showToast: ToastFn;
  resolveAuthorName: (message: ChatMessage) => string;
  setDraft: (value: string) => void;
  isOwnMessage: (message: ChatMessage) => boolean;
  setEditingMessage: (value: ChatMessage | null) => void;
  messagesByChat: Record<string, ChatMessage[]>;
  setMessagesByChat: SetState<Record<string, ChatMessage[]>>;
  setChats: SetState<import('@app-types/securechat-types/secureChat').ChatThread[]>;
  selectedChatId?: string;
  setMutedChatIds: SetState<Set<string>>;
}) => ({
  handleCopyMessage: createCopyMessageHandler(setClipboard, showToast),
  handleReplyMessage: createReplyMessageHandler(resolveAuthorName, setDraft),
  handleEditMessage: createEditMessageHandler(isOwnMessage, setEditingMessage, setDraft),
  handleDeleteMessage: createDeleteMessageHandler(
    isOwnMessage,
    messagesByChat,
    setMessagesByChat,
    setChats,
    resolveAuthorName,
    showToast,
  ),
  handleToggleMute: createToggleMuteHandler(selectedChatId, setMutedChatIds),
});
