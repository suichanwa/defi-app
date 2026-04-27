import type { ChatMessage, ChatReplyAttachment, ChatReplyReference } from '@app-types/securechat-types/secureChat';

const SECURE_CHAT_ENVELOPE_PREFIX = '__securechat_envelope__:';

type SecureChatMessageEnvelope = {
  version: 1;
  text: string;
  replyTo?: ChatReplyReference;
};

const sanitizeText = (value: unknown): string => (typeof value === 'string' ? value : '');

const sanitizeAttachment = (value: unknown): ChatReplyAttachment | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const typed = value as Partial<ChatReplyAttachment>;
  if (typed.kind !== 'text' && typed.kind !== 'image' && typed.kind !== 'file') return undefined;
  const label = sanitizeText(typed.label).trim();
  if (!label) return undefined;
  return {
    kind: typed.kind,
    label,
    uri: sanitizeText(typed.uri) || undefined,
    name: sanitizeText(typed.name) || undefined,
    mimeType: sanitizeText(typed.mimeType) || undefined,
    size: typeof typed.size === 'number' && Number.isFinite(typed.size) ? typed.size : undefined,
  };
};

const sanitizeReplyReference = (value: unknown): ChatReplyReference | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const typed = value as Partial<ChatReplyReference>;
  const author = sanitizeText(typed.author).trim();
  const content = sanitizeText(typed.content).trim();
  if (!author || !content) return undefined;
  return {
    messageId: sanitizeText(typed.messageId) || undefined,
    authorId: sanitizeText(typed.authorId) || undefined,
    author,
    content,
    attachment: sanitizeAttachment(typed.attachment),
    source: typed.source === 'xmtp' || typed.source === 'supabase' || typed.source === 'local' ? typed.source : undefined,
  };
};

export const buildReplyAttachmentLabel = (message: ChatMessage): ChatReplyAttachment | undefined => {
  if (message.type === 'image') {
    return {
      kind: 'image',
      label: 'Photo',
      uri: message.imageUri,
    };
  }
  if (message.type === 'file') {
    return {
      kind: 'file',
      label: message.fileName?.trim() || 'File',
      uri: message.fileUri,
      name: message.fileName,
      mimeType: message.fileMime,
      size: message.fileSize,
    };
  }
  return undefined;
};

export const buildReplyReferenceFromMessage = (
  message: ChatMessage,
  resolveAuthorName?: (message: ChatMessage) => string,
): ChatReplyReference => ({
  messageId: message.id,
  authorId: message.authorId,
  author: resolveAuthorName?.(message) ?? message.author,
  content:
    message.type === 'image'
      ? message.content?.trim() && message.content !== 'Photo'
        ? message.content.trim()
        : 'Photo'
      : message.type === 'file'
        ? message.fileName?.trim() || message.content.trim() || 'File'
        : message.content.trim(),
  attachment: buildReplyAttachmentLabel(message),
  source: message.chatId.startsWith('dm:') ? 'xmtp' : 'supabase',
});

export const parseSecureChatMessageContent = (
  rawContent: string,
): {
  text: string;
  replyTo?: ChatReplyReference;
  isEnvelope: boolean;
} => {
  if (!rawContent.startsWith(SECURE_CHAT_ENVELOPE_PREFIX)) {
    return { text: rawContent, isEnvelope: false };
  }

  const payload = rawContent.slice(SECURE_CHAT_ENVELOPE_PREFIX.length);
  try {
    const parsed = JSON.parse(payload) as Partial<SecureChatMessageEnvelope>;
    const text = sanitizeText(parsed.text);
    const replyTo = sanitizeReplyReference(parsed.replyTo);
    return {
      text,
      replyTo,
      isEnvelope: true,
    };
  } catch {
    return {
      text: payload,
      isEnvelope: true,
    };
  }
};

export const serializeSecureChatMessageContent = (
  text: string,
  replyTo?: ChatReplyReference | null,
): string => {
  const normalizedText = text ?? '';
  if (!replyTo) return normalizedText;
  const envelope: SecureChatMessageEnvelope = {
    version: 1,
    text: normalizedText,
    replyTo,
  };
  return `${SECURE_CHAT_ENVELOPE_PREFIX}${JSON.stringify(envelope)}`;
};

export const hydrateSecureChatMessageContent = (message: ChatMessage): ChatMessage => {
  const parsed = parseSecureChatMessageContent(message.content ?? '');
  const fallbackText =
    message.type === 'image' ? 'Photo' : message.type === 'file' ? message.fileName?.trim() || 'File' : '';
  const text = parsed.text.trim() ? parsed.text : fallbackText;
  return {
    ...message,
    content: text,
    replyTo: message.replyTo ?? parsed.replyTo,
  };
};

export const getReplyPreviewText = (reference: ChatReplyReference): string => {
  const content = reference.content.trim().replace(/\s+/g, ' ');
  if (reference.attachment?.kind === 'image') {
    return content && content !== 'Photo' ? `${content}` : 'Photo';
  }
  if (reference.attachment?.kind === 'file') {
    return reference.attachment.label;
  }
  return content || 'Message';
};
