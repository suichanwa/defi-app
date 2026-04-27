import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import type { AvatarType } from '@app-types/profile';
import type { SecureChatMessageRow } from '@app-types/securechat-types/secureChatScreen';
import { UUID_REGEX } from '@constants/secureChat.constants';
import { decodeChatImageContent } from '@utils/secureChatImages';
import { hydrateSecureChatMessageContent, parseSecureChatMessageContent } from '@utils/secureChatMessageEnvelope';

type MapRowOptions = {
  authorId?: string;
  displayLabel: string;
  userAvatarType: AvatarType;
  userAvatarUri?: string;
};

type OutgoingTextArgs = {
  chatId: string;
  authorId?: string;
  author: string;
  content: string;
  avatarUri?: string;
  now?: Date;
};

type OutgoingImageArgs = {
  chatId: string;
  authorId?: string;
  author: string;
  avatarUri?: string;
  imageUri: string;
  imagePath?: string;
  content?: string;
  now?: Date;
};

export const isUuid = (value: string) => UUID_REGEX.test(value);

export const mapRowToMessage = (row: SecureChatMessageRow, options: MapRowOptions): ChatMessage => {
  const ts = row.created_at ? new Date(row.created_at) : new Date();
  const isOutgoing = options.authorId
    ? row.author_id === options.authorId
    : row.author === options.displayLabel;
  const outgoingAvatarUri = isOutgoing && options.userAvatarType === 'custom' ? options.userAvatarUri : undefined;
  const imagePath = row.image_path ?? decodeChatImageContent(row.content);
  const type = row.message_type ?? (imagePath ? 'image' : 'text');
  const parsed = parseSecureChatMessageContent(row.content);
  const content = imagePath
    ? parsed.isEnvelope
      ? parsed.text.trim() || 'Photo'
      : 'Photo'
    : parsed.text || row.content;

  return {
    id: row.id,
    chatId: row.room_id,
    authorId: row.author_id ?? undefined,
    author: row.author,
    content,
    timestamp: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: row.created_at ?? ts.toISOString(),
    outgoing: isOutgoing,
    avatarUri: outgoingAvatarUri,
    type,
    imagePath: imagePath ?? undefined,
    replyTo: parsed.replyTo,
  };
};

export const createOutgoingTextMessage = ({
  chatId,
  authorId,
  author,
  content,
  avatarUri,
  now = new Date(),
}: OutgoingTextArgs): ChatMessage =>
  hydrateSecureChatMessageContent({
    id: now.getTime().toString(),
    chatId,
    authorId,
    author,
    content,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: now.toISOString(),
    avatarUri,
    outgoing: true,
    type: 'text',
  });

export const createOutgoingImageMessage = ({
  chatId,
  authorId,
  author,
  avatarUri,
  imageUri,
  imagePath,
  content,
  now = new Date(),
}: OutgoingImageArgs): ChatMessage =>
  hydrateSecureChatMessageContent({
    id: `${now.getTime()}-image`,
    chatId,
    authorId,
    author,
    content: content?.trim() ? content : 'Photo',
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: now.toISOString(),
    avatarUri,
    outgoing: true,
    type: 'image',
    imageUri,
    imagePath,
  });
