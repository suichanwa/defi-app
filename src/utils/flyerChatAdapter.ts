import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import type { MessageType } from '@flyerhq/react-native-chat-ui';

export function convertToFlyerMessage(
  msg: ChatMessage,
  currentUserId?: string
): MessageType.Text | MessageType.Image | MessageType.File {
  const author = {
    id: msg.authorId || msg.author || 'unknown',
    firstName: msg.author || 'User',
  };

  const baseMessage = {
    author,
    createdAt: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
    id: msg.id,
    status: msg.authorId === currentUserId ? ('delivered' as const) : undefined,
  };

  // Handle image messages
  if (msg.type === 'image' && msg.imageUri) {
    return {
      ...baseMessage,
      type: 'image' as const,
      uri: msg.imageUri,
      name: 'image.jpg',
      size: 0,
      height: 200,
      width: 200,
    };
  }

  // Handle file messages
  if (msg.type === 'file' && msg.fileUri) {
    return {
      ...baseMessage,
      type: 'file' as const,
      uri: msg.fileUri,
      name: msg.fileName || 'file',
      size: msg.fileSize || 0,
      mimeType: msg.fileMime,
    };
  }

  // Default to text message
  return {
    ...baseMessage,
    type: 'text' as const,
    text: msg.content || '',
  };
}

export function convertFromFlyerMessage(
  msg: MessageType.Any,
  chatId: string
): Partial<ChatMessage> {
  const createdAtValue = msg.createdAt ?? Date.now();
  const baseMessage = {
    id: msg.id,
    chatId,
    authorId: msg.author.id,
    author: msg.author.firstName || 'User',
    timestamp: new Date(createdAtValue).toISOString(),
    createdAt: new Date(createdAtValue).toISOString(),
    outgoing: true,
  };

  switch (msg.type) {
    case 'text':
      return {
        ...baseMessage,
        content: msg.text,
        type: 'text',
      };

    case 'image':
      return {
        ...baseMessage,
        content: 'Photo',
        type: 'image',
        imageUri: msg.uri,
      };

    case 'file':
      return {
        ...baseMessage,
        content: msg.name,
        type: 'file',
        fileUri: msg.uri,
        fileName: msg.name,
        fileSize: msg.size,
        fileMime: msg.mimeType,
      };

    default:
      return {
        ...baseMessage,
        content: '',
        type: 'text',
      };
  }
}

export function sortMessagesByNewest(messages: MessageType.Any[]): MessageType.Any[] {
  return [...messages].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}
