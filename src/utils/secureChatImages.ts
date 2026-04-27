import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import { CHAT_IMAGE_CONTENT_PREFIX, CHAT_IMAGE_SIGNED_URL_TTL_SECONDS } from '@constants/chatImages.constants';
import { createSignedChatImageUrl } from '@services/chatImageStorage';
import { parseSecureChatMessageContent } from './secureChatMessageEnvelope';

type SignedUrlCacheEntry = {
  url: string;
  expiresAt: number;
};

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

export const encodeChatImageContent = (path: string) => `${CHAT_IMAGE_CONTENT_PREFIX}${path}`;

export const decodeChatImageContent = (content: string) =>
  content.startsWith(CHAT_IMAGE_CONTENT_PREFIX) ? content.slice(CHAT_IMAGE_CONTENT_PREFIX.length) : null;

export const resolveChatImageMessage = async (message: ChatMessage): Promise<ChatMessage> => {
  const imagePath = message.imagePath ?? decodeChatImageContent(message.content);
  if (!imagePath) return message;
  const parsed = parseSecureChatMessageContent(message.content ?? '');
  const displayContent = parsed.text.trim() || 'Photo';

  try {
    const cached = signedUrlCache.get(imagePath);
    const now = Date.now();
    const cachedUrl = cached && cached.expiresAt > now ? cached.url : null;
    const imageUri =
      message.imageUri ??
      cachedUrl ??
      (await createSignedChatImageUrl(imagePath));
    if (!cachedUrl && imageUri) {
      // Cache slightly under the TTL to avoid edge expiration.
      const ttlMs = Math.max(CHAT_IMAGE_SIGNED_URL_TTL_SECONDS - 60, 30) * 1000;
      signedUrlCache.set(imagePath, { url: imageUri, expiresAt: now + ttlMs });
    }
    return {
      ...message,
      type: 'image',
      imagePath,
      imageUri,
      content: displayContent,
      replyTo: message.replyTo ?? parsed.replyTo,
    };
  } catch (error) {
    return {
      ...message,
      type: 'image',
      imagePath,
      content: displayContent,
      replyTo: message.replyTo ?? parsed.replyTo,
    };
  }
};

export const resolveChatImageMessages = async (messages: ChatMessage[]): Promise<ChatMessage[]> => {
  const resolved = await Promise.all(messages.map((message) => resolveChatImageMessage(message)));
  return resolved;
};
