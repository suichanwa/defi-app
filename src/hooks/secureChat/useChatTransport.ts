import { useCallback } from 'react';
import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import type { AvatarType } from '@app-types/profile';
import { createOutgoingImageMessage, createOutgoingTextMessage, isUuid } from '@utils/secureChatUtils';
import { encodeChatImageContent } from '@utils/secureChatImages';
import { uploadChatImage } from '@services/chatImageStorage';
import { supabase as supabaseClient, isSupabaseConfigured } from '@services/supabaseClient';
import { sendDMMessage } from '@services/directMessages';

type TransportArgs = {
  displayLabel: string;
  authorId?: string;
  effectiveUserId: string;
  userAvatarType: AvatarType;
  userAvatarUri?: string;
  setMessagesByChat: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
  setChats: React.Dispatch<React.SetStateAction<any>>;
  onConnectionLog?: (message: string) => void;
  sendRoomBroadcast: (payload: ChatMessage) => Promise<void>;
  refreshDmChannels: () => Promise<void>;
  markDmFetched: (channelId: string, createdAt?: string | null) => void;
};

type SendTextArgs = {
  chatId: string;
  content: string;
  isDM: boolean;
};

type SendImageArgs = {
  chatId: string;
  imageUri: string;
  isDM: boolean;
};

export function useChatTransport({
  displayLabel,
  authorId,
  effectiveUserId,
  userAvatarType,
  userAvatarUri,
  setMessagesByChat,
  setChats,
  onConnectionLog,
  sendRoomBroadcast,
  refreshDmChannels,
  markDmFetched,
}: TransportArgs) {
  const appendLocalMessage = useCallback(
    (chatId: string, message: ChatMessage) => {
      setMessagesByChat((prev) => {
        const existing = prev[chatId] ?? [];
        return { ...prev, [chatId]: [...existing, message] };
      });

      setChats((prev: any[]) =>
        prev.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                lastMessage: { text: message.content, ts: message.timestamp, from: 'You', authorId },
              }
            : chat,
        ),
      );
    },
    [authorId, setChats, setMessagesByChat],
  );

  const persistRoomMessage = useCallback(
    async (chatId: string, message: ChatMessage) => {
      if (!supabaseClient) return;
      const { error } = await supabaseClient.from('messages').insert({
        room_id: chatId,
        author: displayLabel,
        author_id: authorId ?? null,
        content: message.content,
        message_type: message.type ?? 'text',
        created_at: new Date().toISOString(),
      });

      if (!error) return;
      if (error.message?.includes('author_id') || error.message?.includes('message_type')) {
        const fallback = await supabaseClient.from('messages').insert({
          room_id: chatId,
          author: displayLabel,
          author_id: authorId ?? null,
          content: message.content,
          created_at: new Date().toISOString(),
        });
        if (fallback.error) {
          onConnectionLog?.(`Save error: ${fallback.error.message}`);
        }
        return;
      }
      onConnectionLog?.(`Save error: ${error.message}`);
    },
    [authorId, displayLabel, onConnectionLog],
  );

  const persistRoomImage = useCallback(
    async (chatId: string, payload: ChatMessage, imagePath: string) => {
      if (!supabaseClient) return;
      const { error } = await supabaseClient.from('messages').insert({
        room_id: chatId,
        author: payload.author,
        author_id: payload.authorId ?? null,
        content: payload.content,
        message_type: payload.type ?? 'image',
        image_path: imagePath,
        created_at: payload.createdAt ?? new Date().toISOString(),
      });

      if (!error) return;
      if (error.message?.includes('image_path') || error.message?.includes('message_type')) {
        const fallbackContent = encodeChatImageContent(imagePath);
        const fallback = await supabaseClient.from('messages').insert({
          room_id: chatId,
          author: payload.author,
          author_id: payload.authorId ?? null,
          content: fallbackContent,
          created_at: payload.createdAt ?? new Date().toISOString(),
        });
        if (fallback.error) {
          onConnectionLog?.(`Save error: ${fallback.error.message}`);
        }
        return;
      }
      onConnectionLog?.(`Save error: ${error.message}`);
    },
    [onConnectionLog],
  );

  const sendText = useCallback(
    async ({ chatId, content, isDM }: SendTextArgs) => {
      if (isDM) {
        if (isSupabaseConfigured && !isUuid(effectiveUserId)) {
          return { sent: false, error: 'Sign in with a Supabase account to send synced DMs.' };
        }
        const outgoingAvatarUri = userAvatarType === 'custom' ? userAvatarUri : undefined;
        const optimistic = createOutgoingTextMessage({
          chatId,
          authorId: effectiveUserId,
          author: displayLabel,
          content,
          avatarUri: outgoingAvatarUri,
        });
        const optimisticId = `pending-${optimistic.id}`;
        const optimisticMessage = { ...optimistic, id: optimisticId };
        setMessagesByChat((prev) => {
          const existing = prev[chatId] ?? [];
          const seen = existing.some((m) => m.id === optimisticId);
          if (seen) return prev;
          return { ...prev, [chatId]: [...existing, optimisticMessage] };
        });
        const message = await sendDMMessage(chatId, {
          chatId,
          authorId: effectiveUserId,
          author: displayLabel,
          content,
          avatarUri: outgoingAvatarUri,
          outgoing: true,
          type: 'text',
        });

        if (message) {
          setMessagesByChat((prev) => {
            const existing = prev[chatId] ?? [];
            const withoutPending = existing.filter(
              (m) =>
                !(
                  m.id?.startsWith('pending-') &&
                  m.outgoing === true &&
                  m.authorId === effectiveUserId &&
                  m.content === content
                ),
            );
            const seen = withoutPending.some((m) => m.id === message.id);
            if (seen) return { ...prev, [chatId]: withoutPending };
            return { ...prev, [chatId]: [...withoutPending, message] };
          });
          markDmFetched(chatId, message.createdAt ?? null);
          await refreshDmChannels();
        }
        return { sent: true };
      }

      if (!isSupabaseConfigured || !supabaseClient) {
        return { sent: false, error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY to send messages.' };
      }

      const outgoingAvatarUri = userAvatarType === 'custom' ? userAvatarUri : undefined;
      const message = createOutgoingTextMessage({
        chatId,
        authorId,
        author: displayLabel,
        content,
        avatarUri: outgoingAvatarUri,
      });

      appendLocalMessage(chatId, message);
      await persistRoomMessage(chatId, message);
      await sendRoomBroadcast({ ...message, outgoing: false });
      return { sent: true };
    },
    [
      appendLocalMessage,
      authorId,
      displayLabel,
      effectiveUserId,
      markDmFetched,
      refreshDmChannels,
      sendRoomBroadcast,
      setMessagesByChat,
      userAvatarType,
      userAvatarUri,
    ],
  );

  const sendImage = useCallback(
    async ({ chatId, imageUri, isDM }: SendImageArgs) => {
      if (!isSupabaseConfigured || !supabaseClient) {
        return { sent: false, error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY to send images.' };
      }

      const upload = await uploadChatImage({
        fileUri: imageUri,
        chatId,
        authorId: authorId ?? effectiveUserId,
      });

      const imagePayload = createOutgoingImageMessage({
        chatId,
        authorId,
        author: displayLabel,
        avatarUri: userAvatarType === 'custom' ? userAvatarUri : undefined,
        imagePath: upload.path,
        imageUri: upload.signedUrl,
      });

      appendLocalMessage(chatId, imagePayload);

      if (isDM) {
        await sendDMMessage(chatId, imagePayload);
        markDmFetched(chatId, imagePayload.createdAt ?? null);
        await refreshDmChannels();
        return { sent: true };
      }

      await persistRoomImage(chatId, imagePayload, upload.path);
      await sendRoomBroadcast({ ...imagePayload, outgoing: false });
      return { sent: true };
    },
    [
      appendLocalMessage,
      authorId,
      displayLabel,
      effectiveUserId,
      markDmFetched,
      refreshDmChannels,
      sendRoomBroadcast,
      userAvatarType,
      userAvatarUri,
    ],
  );

  return {
    sendText,
    sendImage,
  };
}
