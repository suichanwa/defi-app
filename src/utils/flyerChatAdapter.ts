import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import type { MessageType } from '@flyerhq/react-native-chat-ui';

/**
 * Convert ChatMessage to Flyer Chat UI message format
 */
export function convertToFlyerMessage(
  msg: ChatMessage,
  currentUserId?: string
): MessageType.Text {
  const isOwn = msg.outgoing === true || 
                (currentUserId && msg.authorId === currentUserId);

  return {
    author: {
      id: msg.authorId || msg.author,
      firstName: msg.author,
    },
    createdAt: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
    id: msg.id,
    text: msg.content,
    type: 'text',
    status: isOwn ? 'sent' : undefined,
  };
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
