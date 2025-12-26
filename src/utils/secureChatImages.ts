import type { ChatMessage } from '@app-types/secureChat';
import { CHAT_IMAGE_CONTENT_PREFIX } from '@constants/chatImages';
import { createSignedChatImageUrl } from '@services/chatImageStorage';

export const encodeChatImageContent = (path: string) => `${CHAT_IMAGE_CONTENT_PREFIX}${path}`;

export const decodeChatImageContent = (content: string) =>
  content.startsWith(CHAT_IMAGE_CONTENT_PREFIX) ? content.slice(CHAT_IMAGE_CONTENT_PREFIX.length) : null;

export const resolveChatImageMessage = async (message: ChatMessage): Promise<ChatMessage> => {
  const imagePath = message.imagePath ?? decodeChatImageContent(message.content);
  if (!imagePath) return message;

  try {
    const imageUri = message.imageUri ?? (await createSignedChatImageUrl(imagePath));
    return {
      ...message,
      type: 'image',
      imagePath,
      imageUri,
      content: message.content.startsWith(CHAT_IMAGE_CONTENT_PREFIX) ? 'Photo' : message.content,
    };
  } catch (error) {
    return {
      ...message,
      type: 'image',
      imagePath,
      content: message.content.startsWith(CHAT_IMAGE_CONTENT_PREFIX) ? 'Photo' : message.content,
    };
  }
};

export const resolveChatImageMessages = async (messages: ChatMessage[]): Promise<ChatMessage[]> => {
  const resolved = await Promise.all(messages.map((message) => resolveChatImageMessage(message)));
  return resolved;
};
