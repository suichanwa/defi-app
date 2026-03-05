import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import type { MessageType } from '@flyerhq/react-native-chat-ui';

/**
 * Convert ChatMessage to Flyer Chat UI message format
 */
export function convertToFlyerMessage(
  msg: ChatMessage,
  currentUserId?: string
): MessageType.Text | MessageType.Image {
  const isOwn = msg.outgoing === true || 
                (currentUserId && msg.authorId === currentUserId);

  const author = {
    id: msg.authorId || msg.author,
    firstName: msg.author,
  };

  const createdAt = msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now();
  const status = isOwn ? 'sent' : undefined;

  // Handle image messages
  if (msg.type === 'image' && msg.imageUri) {
    return {
      author,
      createdAt,
      id: msg.id,
      name: msg.fileName || 'image.jpg',
      size: 0, // Size not tracked yet
      type: 'image',
      uri: msg.imageUri,
      status,
    } as MessageType.Image;
  }

  // Default to text message
  return {
    author,
    createdAt,
    id: msg.id,
    text: msg.content,
    type: 'text',
    status,
  } as MessageType.Text;
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
