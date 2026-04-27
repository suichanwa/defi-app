import { useCallback } from 'react';
import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import type { AvatarType } from '@app-types/profile';
import { createOutgoingImageMessage, createOutgoingTextMessage } from '@utils/secureChatUtils';
import { encodeChatImageContent } from '@utils/secureChatImages';
import { uploadChatImage } from '@services/chatImageStorage';
import { supabase as supabaseClient, isSupabaseConfigured } from '@services/supabaseClient';
import { MAX_MESSAGES_IN_MEMORY } from '@constants/secureChat.constants';

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
  content?: string;
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
}: TransportArgs) {
  const appendLocalMessage = useCallback(
    (chatId: string, message: ChatMessage) => {
      setMessagesByChat((prev) => {
        const existing = prev[chatId] ?? [];
        const updated = [...existing, message];
        
        // Limit messages in memory to prevent crashes
        const limited = updated.length > MAX_MESSAGES_IN_MEMORY
          ? updated.slice(-MAX_MESSAGES_IN_MEMORY)
          : updated;
        
        return { ...prev, [chatId]: limited };
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
    async (chatId: string, message: ChatMessage, wireContent: string) => {
      if (!supabaseClient) return;
      const { error } = await supabaseClient.from('messages').insert({
        room_id: chatId,
        author: displayLabel,
        author_id: authorId ?? null,
        content: wireContent,
        message_type: message.type ?? 'text',
        created_at: new Date().toISOString(),
      });

      if (!error) return;
      if (error.message?.includes('author_id') || error.message?.includes('message_type')) {
        const fallback = await supabaseClient.from('messages').insert({
          room_id: chatId,
          author: displayLabel,
          author_id: authorId ?? null,
          content: wireContent,
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
    async (chatId: string, payload: ChatMessage, imagePath: string, wireContent: string) => {
      if (!supabaseClient) return;
      const { error } = await supabaseClient.from('messages').insert({
        room_id: chatId,
        author: payload.author,
        author_id: payload.authorId ?? null,
        content: wireContent,
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
        return { sent: false, error: 'Direct messages are handled by the XMTP transport layer.' };
      }

      if (!isSupabaseConfigured || !supabaseClient) {
        return { sent: false, error: 'Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY to send messages.' };
      }

      const outgoingAvatarUri = userAvatarType === 'custom' ? userAvatarUri : undefined;
      const wireContent = content;
      const message = createOutgoingTextMessage({
        chatId,
        authorId,
        author: displayLabel,
        content: wireContent,
        avatarUri: outgoingAvatarUri,
      });

      appendLocalMessage(chatId, message);
      await persistRoomMessage(chatId, message, wireContent);
      await sendRoomBroadcast({ ...message, content: wireContent, outgoing: false });
      return { sent: true };
    },
    [
      appendLocalMessage,
      authorId,
      displayLabel,
      sendRoomBroadcast,
      userAvatarType,
      userAvatarUri,
    ],
  );

  const sendImage = useCallback(
    async ({ chatId, imageUri, isDM, content }: SendImageArgs) => {
      if (isDM) {
        return { sent: false, error: 'Image attachments over XMTP are not enabled in this build.' };
      }

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
        content,
      });

      appendLocalMessage(chatId, imagePayload);

      const wireContent = content ?? imagePayload.content;
      await persistRoomImage(chatId, imagePayload, upload.path, wireContent);
      await sendRoomBroadcast({ ...imagePayload, content: wireContent, outgoing: false });
      return { sent: true };
    },
    [
      appendLocalMessage,
      authorId,
      displayLabel,
      effectiveUserId,
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
