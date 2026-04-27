import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import type { MessageType } from '@flyerhq/react-native-chat-ui';
import type { ChatReplyReference } from '@app-types/securechat-types/secureChat';

export type FlyerMessageMeta = {
  timeLabel?: string;
  createdAtMs?: number;
  caption?: string;
  reply?: ChatReplyReference;
};

export type FlyerMessageWithMeta = (MessageType.Text | MessageType.Image) & {
  metadata?: FlyerMessageMeta;
};

/**
 * Convert ChatMessage to Flyer Chat UI message format
 */
export function convertToFlyerMessage(
  msg: ChatMessage,
  currentUserId?: string,
  createdAtOverrideMs?: number
): FlyerMessageWithMeta {
  const isOwn = msg.outgoing === true || 
                (currentUserId && msg.authorId === currentUserId);

  const author = {
    id: isOwn && currentUserId ? currentUserId : (msg.authorId || msg.author),
    firstName: msg.author,
    imageUrl: msg.avatarUri ?? undefined,
  };

  const createdAtMs =
    createdAtOverrideMs ?? (msg.createdAt ? new Date(msg.createdAt).getTime() : undefined);
  const status = isOwn ? msg.deliveryStatus ?? 'sent' : undefined;
  const rawCaption = msg.type === 'image' ? msg.content?.trim() : undefined;
  const caption =
    rawCaption && rawCaption !== 'Photo' && !rawCaption.startsWith('__image__:') ? rawCaption : undefined;
  const metadata: FlyerMessageMeta = {
    timeLabel: msg.timestamp,
    createdAtMs: msg.createdAt ? new Date(msg.createdAt).getTime() : undefined,
    caption,
    reply: msg.replyTo,
  };

  // Handle image messages
  if (msg.type === 'image' && msg.imageUri) {
    return {
      author,
      id: msg.id,
      name: msg.fileName || 'image.jpg',
      size: 0, // Size not tracked yet
      type: 'image',
      uri: msg.imageUri,
      status,
      metadata,
      createdAt: createdAtMs,
    } as FlyerMessageWithMeta;
  }

  // Default to text message
  return {
    author,
    id: msg.id,
    text: msg.content,
    type: 'text',
    status,
    metadata,
    createdAt: createdAtMs,
  } as FlyerMessageWithMeta;
}

/**
 * Sort messages by newest first (Flyer requirement)
 */
export function sortMessagesByNewest(messages: MessageType.Any[]): MessageType.Any[] {
  return [...messages].sort((a, b) => {
    const aTime = a.createdAt ?? 0;
    const bTime = b.createdAt ?? 0;
    return bTime - aTime;
  });
}
