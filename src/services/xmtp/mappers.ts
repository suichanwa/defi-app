import type { ChatMessage, ChatThread } from '@app-types/securechat-types/secureChat';
import type { DecodedMessageUnion, Dm } from '@xmtp/react-native-sdk';
import { XMTP_DM_CHAT_ID_PREFIX } from './constants';
import { parseSecureChatMessageContent } from '@utils/secureChatMessageEnvelope';

const shortPeerLabel = (value: string) =>
  value.length > 16 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value;

const UNSUPPORTED_XMTP_CONTENT_PLACEHOLDER = '[Unsupported XMTP content]';

const nsToDate = (sentNs: number): Date => {
  const millis = Math.floor(sentNs / 1_000_000);
  if (!Number.isFinite(millis) || millis <= 0) return new Date();
  return new Date(millis);
};

const readMessageContent = (message: DecodedMessageUnion): string => {
  try {
    const content = message.content();
    if (typeof content === 'string') return content;
    if (content === null || content === undefined) return message.fallback ?? '';
    return message.fallback ?? '[Unsupported XMTP content]';
  } catch {
    return message.fallback ?? '[Unsupported XMTP content]';
  }
};

export const xmtpConversationIdToChatId = (conversationId: string) =>
  `${XMTP_DM_CHAT_ID_PREFIX}${conversationId}`;

export const xmtpChatIdToConversationId = (chatId: string): string | null => {
  if (!chatId.startsWith(XMTP_DM_CHAT_ID_PREFIX)) return null;
  const conversationId = chatId.slice(XMTP_DM_CHAT_ID_PREFIX.length);
  return conversationId || null;
};

export const mapXmtpMessageToChatMessage = (
  message: DecodedMessageUnion,
  chatId: string,
  senderLabel: string,
  currentInboxId: string,
): ChatMessage | null => {
  const sentAt = nsToDate(message.sentNs);
  const outgoing = message.senderInboxId === currentInboxId;
  const rawContent = readMessageContent(message);
  const normalizedRawContent = rawContent.trim();
  if (!normalizedRawContent || normalizedRawContent === UNSUPPORTED_XMTP_CONTENT_PLACEHOLDER) {
    return null;
  }
  const parsed = parseSecureChatMessageContent(rawContent);
  return {
    id: message.id as string,
    chatId,
    authorId: message.senderInboxId,
    author: outgoing ? senderLabel : shortPeerLabel(message.senderInboxId),
    content: parsed.text || rawContent,
    timestamp: sentAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: sentAt.toISOString(),
    outgoing,
    type: 'text',
    replyTo: parsed.replyTo,
  };
};

type DmThreadOptions = {
  displayLabel: string;
  currentInboxId: string;
  preferredName?: string;
};

export const mapXmtpDmToChatThread = async (
  dm: Dm,
  { displayLabel, currentInboxId, preferredName }: DmThreadOptions,
): Promise<ChatThread> => {
  const peerInboxId = await dm.peerInboxId();
  const label = preferredName?.trim() || shortPeerLabel(peerInboxId);
  const chatId = xmtpConversationIdToChatId(dm.id as string);
  const lastMessage = dm.lastMessage ? mapXmtpMessageToChatMessage(dm.lastMessage, chatId, displayLabel, currentInboxId) : null;

  return {
    id: chatId,
    name: label,
    participants: [displayLabel, label],
    peerAddress: peerInboxId,
    isOnline: true,
    isDM: true,
    avatarSource: {
      avatarType: 'identicon',
      seed: peerInboxId,
    },
    lastMessage: lastMessage
      ? {
          text: lastMessage.content,
          ts: lastMessage.timestamp,
          from: lastMessage.author,
          authorId: lastMessage.authorId,
        }
      : undefined,
  };
};
