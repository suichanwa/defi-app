import type { ChatMessage, ChatThread } from '@app-types/securechat-types/secureChat';
import { decodeChatImageContent, resolveChatImageMessage } from '@utils/secureChatImages';
import { CHAT_IMAGE_BUCKET } from '@constants/chatImages';
import { isSupabaseConfigured, supabase } from '@services/supabaseClient';

import type * as HandleMessageTypes from '@app-types/securechat-types/secureChatHandleMessage';

export const createIsOwnMessage = (displayLabel: string, effectiveUserId: string) => (message: ChatMessage) => {
  if (message.outgoing === true) return true;
  if (message.authorId && effectiveUserId && message.authorId === effectiveUserId) return true;
  if (!message.authorId && message.author === displayLabel) return true;
  return false;
};

export const createNotifyIncomingMessage = ({
  effectiveUserId,
  displayLabel,
  mutedChatIds,
  secureTab,
  chatView,
  selectedChatId,
  getChatById,
  showToast,
  notifyNative,
}: {
  effectiveUserId: string;
  displayLabel: string;
  mutedChatIds: Set<string>;
  secureTab: HandleMessageTypes.SecureChatTab;
  chatView: HandleMessageTypes.SecureChatView;
  selectedChatId: string;
  getChatById: HandleMessageTypes.GetChatById;
  showToast: HandleMessageTypes.ToastFn;
  notifyNative?: HandleMessageTypes.NotifyNativeFn;
}) => (chatId: string, message: ChatMessage) => {
  if (message.type === 'system') return;
  if (message.outgoing === true) return;
  if (message.authorId && message.authorId === effectiveUserId) return;
  if (!message.authorId && message.author === displayLabel) return;
  if (mutedChatIds.has(chatId)) return;
  if (secureTab === 'chats' && chatView === 'thread' && selectedChatId === chatId) return;

  const chatName = getChatById(chatId)?.name ?? message.author ?? 'New message';
  showToast({
    type: 'chat',
    text1: chatName,
    text2: message.content,
    position: 'top',
    visibilityTime: 3500,
  });
  if (notifyNative) {
    void notifyNative(chatId, message);
  }
};

export const createIncomingRoomMessageHandler = ({
  setMessagesByChat,
  setChats,
  notifyIncomingRef,
  resolveAuthorNameRef,
}: {
  setMessagesByChat: HandleMessageTypes.SetState<Record<string, ChatMessage[]>>;
  setChats: HandleMessageTypes.SetState<ChatThread[]>;
  notifyIncomingRef: HandleMessageTypes.MessageNotifierRef;
  resolveAuthorNameRef: HandleMessageTypes.ResolveAuthorRef;
}) => (msg: ChatMessage) => {
  resolveChatImageMessage(msg)
    .then((resolved) => {
      setMessagesByChat((prev) => {
        const existing = prev[resolved.chatId] ?? [];
        const seen = existing.some((m) => m.id === resolved.id);
        if (seen) return prev;
        notifyIncomingRef.current(resolved.chatId, resolved);
        return { ...prev, [resolved.chatId]: [...existing, resolved] };
      });
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === resolved.chatId
            ? {
                ...chat,
                lastMessage: {
                  text: resolved.content,
                  ts: resolved.timestamp,
                  from: resolveAuthorNameRef.current(resolved),
                  authorId: resolved.authorId,
                },
              }
            : chat,
        ),
      );
    })
    .catch((error) => {
      console.warn('Failed to resolve chat image URL:', error);
      setMessagesByChat((prev) => {
        const existing = prev[msg.chatId] ?? [];
        const seen = existing.some((m) => m.id === msg.id);
        if (seen) return prev;
        notifyIncomingRef.current(msg.chatId, msg);
        return { ...prev, [msg.chatId]: [...existing, msg] };
      });
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === msg.chatId
            ? {
                ...chat,
                lastMessage: {
                  text: msg.content,
                  ts: msg.timestamp,
                  from: resolveAuthorNameRef.current(msg),
                  authorId: msg.authorId,
                },
              }
            : chat,
        ),
      );
    });
};

export const createSendMessageHandler = ({
  selectedChat,
  draft,
  pendingImageUri,
  pendingFile,
  editingMessage,
  messagesByChat,
  setMessagesByChat,
  setChats,
  setDraft,
  setEditingMessage,
  setAttachment,
  setFileAttachment,
  sendText,
  sendImage,
  sendFile,
  resolveAuthorName,
  showAlert,
  sendingImageUriRef,
  sendingFileUriRef,
}: {
  selectedChat: ChatThread | null;
  draft: string;
  pendingImageUri: string | null;
  pendingFile?: HandleMessageTypes.PendingFile | null;
  editingMessage: ChatMessage | null;
  messagesByChat: Record<string, ChatMessage[]>;
  setMessagesByChat: HandleMessageTypes.SetState<Record<string, ChatMessage[]>>;
  setChats: HandleMessageTypes.SetState<ChatThread[]>;
  setDraft: (value: string) => void;
  setEditingMessage: (value: ChatMessage | null) => void;
  setAttachment: (value: string | null) => void;
  setFileAttachment?: (value: HandleMessageTypes.PendingFile | null) => void;
  sendText: (args: { chatId: string; content: string; isDM: boolean }) => Promise<{ sent: boolean; error?: string }>;
  sendImage: (args: { chatId: string; imageUri: string; isDM: boolean }) => Promise<{ sent: boolean; error?: string }>;
  sendFile?: (args: { chatId: string; file: HandleMessageTypes.PendingFile; isDM: boolean }) => Promise<{ sent: boolean; error?: string }>;
  resolveAuthorName: (message: ChatMessage) => string;
  showAlert: HandleMessageTypes.AlertFn;
  sendingImageUriRef: { current: string | null };
  sendingFileUriRef?: { current: string | null };
}) => async () => {
  if (!selectedChat) return;
  const trimmed = draft.trim();
  const hasText = trimmed.length > 0;
  const hasImage = Boolean(pendingImageUri);
  const hasFile = Boolean(pendingFile);
  const isDM = selectedChat.id.startsWith('dm:');

  if (editingMessage && selectedChat.id === editingMessage.chatId) {
    if (!hasText) {
      showAlert('Edit message', 'Message cannot be empty.');
      return;
    }
    const currentList = messagesByChat[selectedChat.id] ?? [];
    const isLastMessage = currentList[currentList.length - 1]?.id === editingMessage.id;
    const nextList = currentList.map((message) =>
      message.id === editingMessage.id ? { ...message, content: trimmed } : message,
    );
    setMessagesByChat((prev) => ({ ...prev, [selectedChat.id]: nextList }));
    if (isLastMessage) {
      const updatedAuthor = resolveAuthorName(editingMessage);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === selectedChat.id
            ? {
                ...chat,
                lastMessage: {
                  text: trimmed,
                  ts: editingMessage.timestamp,
                  from: updatedAuthor,
                  authorId: editingMessage.authorId,
                },
              }
            : chat,
        ),
      );
    }
    setDraft('');
    setEditingMessage(null);
    return;
  }

  if (!hasText && !hasImage && !hasFile) return;

  if (hasText) {
    setDraft('');
    const result = await sendText({ chatId: selectedChat.id, content: trimmed, isDM });
    if (!result.sent && result.error) {
      showAlert(isDM ? 'Direct message unavailable' : 'Supabase not configured', result.error);
    }
  }

  if (hasImage && pendingImageUri) {
    const imageUri = pendingImageUri;
    if (sendingImageUriRef.current === imageUri) return;
    sendingImageUriRef.current = imageUri;
    setAttachment(null);
    try {
      const result = await sendImage({ chatId: selectedChat.id, imageUri, isDM });
      if (!result.sent && result.error) {
        showAlert('Image upload error', result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send image.';
      showAlert('Image upload error', message);
    } finally {
      if (sendingImageUriRef.current === imageUri) {
        sendingImageUriRef.current = null;
      }
    }
  }

  if (hasFile && pendingFile) {
    if (!sendFile) {
      showAlert('File upload error', 'File sending is only available for P2P chats.');
      return;
    }
    const fileUri = pendingFile.uri;
    if (sendingFileUriRef?.current === fileUri) return;
    if (sendingFileUriRef) {
      sendingFileUriRef.current = fileUri;
    }
    setFileAttachment?.(null);
    try {
      const result = await sendFile({ chatId: selectedChat.id, file: pendingFile, isDM });
      if (!result.sent && result.error) {
        showAlert('File upload error', result.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send file.';
      showAlert('File upload error', message);
    } finally {
      if (sendingFileUriRef?.current === fileUri) {
        sendingFileUriRef.current = null;
      }
    }
  }
};

export const createCopyMessageHandler =
  (setClipboard: HandleMessageTypes.ClipboardFn, showToast: HandleMessageTypes.ToastFn) =>
  async (message: ChatMessage) => {
    const text =
      message.type === 'image'
        ? message.imageUri ?? ''
        : message.type === 'file'
          ? message.fileUri ?? message.content
          : message.content;
    if (!text) return;
    await setClipboard(text);
    showToast({
      type: 'chat',
      text1: 'Copied to clipboard',
      text2:
        message.type === 'image'
          ? 'Image link copied.'
          : message.type === 'file'
            ? 'File link copied.'
            : text.length > 80
              ? `${text.slice(0, 80)}...`
              : text,
      position: 'top',
      visibilityTime: 2000,
    });
  };

export const createReplyMessageHandler =
  (resolveAuthorName: (message: ChatMessage) => string, setDraft: (value: string) => void) =>
  (message: ChatMessage) => {
    const author = resolveAuthorName(message);
    setDraft(`@${author} `);
  };

export const createEditMessageHandler =
  (isOwnMessage: (message: ChatMessage) => boolean, setEditingMessage: (value: ChatMessage | null) => void, setDraft: (value: string) => void) =>
  (message: ChatMessage) => {
    if (!isOwnMessage(message)) return;
    if (message.type === 'image' || message.type === 'file') return;
    setEditingMessage(message);
    setDraft(message.content);
  };

export const createDeleteMessageHandler =
  (
    isOwnMessage: (message: ChatMessage) => boolean,
    messagesByChat: Record<string, ChatMessage[]>,
    setMessagesByChat: HandleMessageTypes.SetState<Record<string, ChatMessage[]>>,
    setChats: HandleMessageTypes.SetState<ChatThread[]>,
    resolveAuthorName: (message: ChatMessage) => string,
    showToast: HandleMessageTypes.ToastFn,
  ) =>
  async (message: ChatMessage) => {
    if (!isOwnMessage(message)) return;
    const currentList = messagesByChat[message.chatId] ?? [];
    const isLastMessage = currentList[currentList.length - 1]?.id === message.id;
    const nextList = currentList.filter((item) => item.id !== message.id);
    setMessagesByChat((prev) => ({ ...prev, [message.chatId]: nextList }));
    if (isLastMessage) {
      const last = nextList[nextList.length - 1];
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === message.chatId
            ? {
                ...chat,
                lastMessage: last
                  ? {
                      text: last.content,
                      ts: last.timestamp,
                      from: resolveAuthorName(last),
                      authorId: last.authorId,
                    }
                  : undefined,
              }
            : chat,
        ),
      );
    }
    showToast({
      type: 'chat',
      text1: 'Message successfully deleted',
      position: 'top',
      visibilityTime: 2000,
    });

    if (!isSupabaseConfigured || !supabase) return;
    if (message.chatId.startsWith('dm:')) return;

    try {
      const imagePath = message.imagePath ?? decodeChatImageContent(message.content ?? '') ?? undefined;
      let deleteQuery = supabase.from('messages').delete();
      if (message.id) {
        deleteQuery = deleteQuery.eq('id', message.id);
      } else {
        deleteQuery = deleteQuery
          .eq('room_id', message.chatId)
          .eq('created_at', message.createdAt ?? '')
          .eq(message.authorId ? 'author_id' : 'author', message.authorId ?? message.author ?? '');
      }
      const { error } = await deleteQuery;
      if (error) {
        showToast({
          type: 'chat',
          text1: 'Delete failed',
          text2: error.message,
          position: 'top',
          visibilityTime: 3000,
        });
        console.warn('Failed to delete message:', error.message);
      }
      if (imagePath) {
        const { error: storageError } = await supabase.storage.from(CHAT_IMAGE_BUCKET).remove([imagePath]);
        if (storageError) {
          showToast({
            type: 'chat',
            text1: 'Image delete failed',
            text2: storageError.message,
            position: 'top',
            visibilityTime: 3000,
          });
          console.warn('Failed to delete chat image:', storageError.message);
        }
      }
    } catch (error) {
      showToast({
        type: 'chat',
        text1: 'Delete failed',
        text2: error instanceof Error ? error.message : 'Unknown error.',
        position: 'top',
        visibilityTime: 3000,
      });
      console.warn('Failed to delete message:', error);
    }
  };
