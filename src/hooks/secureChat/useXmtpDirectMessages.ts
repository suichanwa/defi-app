import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, ChatThread } from '@app-types/securechat-types/secureChat';
import type { Dm, ConsentState, DecodedMessageUnion } from '@xmtp/react-native-sdk';
import { useXmtpClient } from '@context/XmtpProvider';
import { MAX_MESSAGES_IN_MEMORY } from '@constants/secureChat.constants';
import {
  mapXmtpDmToChatThread,
  mapXmtpMessageToChatMessage,
  xmtpChatIdToConversationId,
  xmtpConversationIdToChatId,
} from '@services/xmtp/mappers';
import { resolvePeerXmtpAddress } from '@services/xmtp/addressResolver';
import { isXmtpNativeModuleAvailable, XmtpConversationVersion, XmtpPublicIdentity } from '@services/xmtp/sdk';
import { hydrateSecureChatMessageContent, parseSecureChatMessageContent } from '@utils/secureChatMessageEnvelope';

type UseXmtpDirectMessagesArgs = {
  displayLabel: string;
  isActive: boolean;
  selectedChatId?: string | null;
  isThreadOpen?: boolean;
  notifyIncoming: (chatId: string, message: ChatMessage) => void;
  setMessagesByChat: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
  isConversationHidden?: (chatId: string) => boolean;
  isMessageHidden?: (chatId: string, messageId: string) => boolean;
  restoreConversation?: (chatId: string) => Promise<void> | void;
  onError?: (message: string) => void;
};

type SendTextArgs = {
  chatId: string;
  content: string;
};

const DM_CONSENT_STATES: ConsentState[] = ['allowed', 'unknown'];
const READ_RECEIPT_CONTENT_TYPE_ID = 'xmtp.org/readReceipt:1.0';

const parseSentNs = (value?: number): number => {
  if (!value || !Number.isFinite(value)) return 0;
  return value;
};

const messageCreatedAtNs = (message: ChatMessage): number => {
  const timeMs = message.createdAt ? new Date(message.createdAt).getTime() : 0;
  if (!Number.isFinite(timeMs) || timeMs <= 0) return 0;
  return timeMs * 1_000_000;
};

const isReadReceiptMessage = (message: DecodedMessageUnion): boolean =>
  message.contentTypeId === READ_RECEIPT_CONTENT_TYPE_ID ||
  Boolean((message as unknown as { nativeContent?: { readReceipt?: unknown } }).nativeContent?.readReceipt);

const latestPeerReadReceiptNs = (messages: DecodedMessageUnion[], currentInboxId: string): number =>
  messages.reduce((latest, message) => {
    if (message.senderInboxId === currentInboxId || !isReadReceiptMessage(message)) return latest;
    return Math.max(latest, parseSentNs(message.sentNs));
  }, 0);

const createOutgoingXmtpMessage = ({
  id,
  chatId,
  authorId,
  author,
  content,
}: {
  id: string;
  chatId: string;
  authorId: string;
  author: string;
  content: string;
}): ChatMessage => {
  const now = new Date();
  return hydrateSecureChatMessageContent({
    id,
    chatId,
    authorId,
    author,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: now.toISOString(),
    outgoing: true,
    deliveryStatus: 'sent',
    type: 'text',
    content,
  });
};

const isDmConversation = (value: unknown): value is Dm =>
  !!value &&
  typeof value === 'object' &&
  XmtpConversationVersion !== null &&
  (value as Dm).version === XmtpConversationVersion.DM;

export function useXmtpDirectMessages({
  displayLabel,
  isActive,
  selectedChatId,
  isThreadOpen = false,
  notifyIncoming,
  setMessagesByChat,
  isConversationHidden,
  isMessageHidden,
  restoreConversation,
  onError,
}: UseXmtpDirectMessagesArgs) {
  const { client, status: xmtpStatus, error: xmtpError } = useXmtpClient();
  const [dmChannels, setDmChannels] = useState<ChatThread[]>([]);
  const conversationCacheRef = useRef<Map<string, Dm>>(new Map());
  const preferredNameByChatIdRef = useRef<Record<string, string>>({});
  const streamStartNsRef = useRef(0);
  const lastReadReceiptSentNsRef = useRef<Record<string, number>>({});
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const resolveDmConversation = useCallback(
    async (chatId: string): Promise<Dm | null> => {
      if (!client) return null;

      const cached = conversationCacheRef.current.get(chatId);
      if (cached) return cached;

      const conversationId = xmtpChatIdToConversationId(chatId);
      if (!conversationId) return null;

      const found = await client.conversations.findConversation(conversationId as any);
      if (!isDmConversation(found)) return null;

      conversationCacheRef.current.set(chatId, found);
      return found;
    },
    [client],
  );

  const refreshChannels = useCallback(async () => {
    if (!isXmtpNativeModuleAvailable()) {
      setDmChannels([]);
      return;
    }
    if (!client) {
      setDmChannels([]);
      return;
    }

    try {
      await client.conversations.sync();
      const dms = await client.conversations.listDms(
        { lastMessage: true, consentState: true },
        undefined,
        DM_CONSENT_STATES,
      );

      const mapped: ChatThread[] = [];
      for (const dm of dms) {
        const chatId = xmtpConversationIdToChatId(dm.id as string);
        if (isConversationHidden?.(chatId)) continue;
        conversationCacheRef.current.set(chatId, dm);
        const preferredName = preferredNameByChatIdRef.current[chatId];
        mapped.push(
          await mapXmtpDmToChatThread(dm, {
            displayLabel,
            currentInboxId: client.inboxId,
            preferredName,
          }),
        );
      }
      setDmChannels(mapped);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh XMTP conversations.';
      onErrorRef.current?.(message);
    }
  }, [client, displayLabel, isConversationHidden]);

  const setThreadMessages = useCallback(
    (chatId: string, incoming: ChatMessage[]) => {
      setMessagesByChat((prev) => {
        const next = [...incoming];
        const limited =
          next.length > MAX_MESSAGES_IN_MEMORY
            ? next.slice(next.length - MAX_MESSAGES_IN_MEMORY)
            : next;
        return { ...prev, [chatId]: limited };
      });
    },
    [setMessagesByChat],
  );

  const markOutgoingMessagesSeen = useCallback(
    (chatId: string, readReceiptNs: number) => {
      if (readReceiptNs <= 0) return;
      setMessagesByChat((prev) => {
        const existing = prev[chatId] ?? [];
        let changed = false;
        const next = existing.map((message) => {
          if (!message.outgoing || message.deliveryStatus === 'seen') return message;
          if (messageCreatedAtNs(message) > readReceiptNs) return message;
          changed = true;
          return { ...message, deliveryStatus: 'seen' as const };
        });
        return changed ? { ...prev, [chatId]: next } : prev;
      });
    },
    [setMessagesByChat],
  );

  const sendReadReceipt = useCallback(async (chatId: string, latestIncomingNs: number) => {
    if (!client || latestIncomingNs <= 0) return;
    const previousReceiptNs = lastReadReceiptSentNsRef.current[chatId] ?? 0;
    if (latestIncomingNs <= previousReceiptNs) return;

    const dm = await resolveDmConversation(chatId);
    if (!dm) return;

    lastReadReceiptSentNsRef.current[chatId] = latestIncomingNs;
    try {
      await dm.send({ readReceipt: {} } as any);
    } catch (error) {
      lastReadReceiptSentNsRef.current[chatId] = previousReceiptNs;
      console.warn('Failed to send XMTP read receipt.', error);
    }
  }, [client, resolveDmConversation]);

  const loadThread = useCallback(
    async (chatId: string) => {
      if (!isXmtpNativeModuleAvailable()) return;
      const dm = await resolveDmConversation(chatId);
      if (!client || !dm) return;

      try {
        await dm.sync();
        const messages = await dm.messages({
          direction: 'ASCENDING',
          limit: MAX_MESSAGES_IN_MEMORY,
        });
        const readReceiptNs = latestPeerReadReceiptNs(messages, client.inboxId);
        const latestIncomingNs = messages.reduce((latest, message) => {
          if (message.senderInboxId === client.inboxId || isReadReceiptMessage(message)) return latest;
          return Math.max(latest, parseSentNs(message.sentNs));
        }, 0);
        const mapped = messages
          .filter((message) => !isReadReceiptMessage(message))
          .map((message) => {
            const mappedMessage = mapXmtpMessageToChatMessage(message, chatId, displayLabel, client.inboxId);
            if (mappedMessage.outgoing && parseSentNs(message.sentNs) <= readReceiptNs) {
              return { ...mappedMessage, deliveryStatus: 'seen' as const };
            }
            return mappedMessage;
          });
        setThreadMessages(
          chatId,
          isMessageHidden ? mapped.filter((message) => !isMessageHidden(chatId, message.id)) : mapped,
        );
        if (isConversationHidden?.(chatId)) {
          await restoreConversation?.(chatId);
        }
        if (selectedChatId === chatId && isThreadOpen) {
          await sendReadReceipt(chatId, latestIncomingNs);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load XMTP thread.';
        onErrorRef.current?.(message);
      }
    },
    [
      client,
      displayLabel,
      isConversationHidden,
      isMessageHidden,
      isThreadOpen,
      resolveDmConversation,
      restoreConversation,
      selectedChatId,
      sendReadReceipt,
      setThreadMessages,
    ],
  );

  const startDM = useCallback(
    async (peerAddress: string, peerName: string) => {
      if (!client) {
        if (xmtpError) {
          throw new Error(xmtpError);
        }
        if (xmtpStatus === 'unsupported') {
          throw new Error('XMTP is unavailable for the active wallet. Switch to Ethereum and unlock it.');
        }
        throw new Error('XMTP client is not ready yet. Unlock your Ethereum wallet first.');
      }
      if (!isXmtpNativeModuleAvailable() || !XmtpPublicIdentity) {
        throw new Error('XMTP native module is unavailable in this build.');
      }
      const resolved = await resolvePeerXmtpAddress(peerAddress);
      const normalizedAddress = resolved.xmtpEvmAddress;

      const identity = new XmtpPublicIdentity(normalizedAddress, 'ETHEREUM');
      const dm = await client.conversations.findOrCreateDmWithIdentity(identity);
      const chatId = xmtpConversationIdToChatId(dm.id as string);
      const preferredName = peerName.trim() || resolved.alias || '';
      if (preferredName) preferredNameByChatIdRef.current[chatId] = preferredName;
      conversationCacheRef.current.set(chatId, dm);

      await refreshChannels();
      await loadThread(chatId);
      return chatId;
    },
    [client, loadThread, refreshChannels, xmtpError, xmtpStatus],
  );

  const sendText = useCallback(
    async ({ chatId, content }: SendTextArgs) => {
      const dm = await resolveDmConversation(chatId);
      if (!dm || !client) {
        return { sent: false, error: 'XMTP conversation is not ready.' };
      }

      try {
        const sentMessageId = await dm.send(content);
        setMessagesByChat((prev) => {
          const existing = prev[chatId] ?? [];
          if (existing.some((message) => message.id === sentMessageId)) return prev;
          const sentMessage = createOutgoingXmtpMessage({
            id: sentMessageId as string,
            chatId,
            authorId: client.inboxId,
            author: displayLabel,
            content,
          });
          const limited = [...existing, sentMessage].slice(-MAX_MESSAGES_IN_MEMORY);
          return { ...prev, [chatId]: limited };
        });
        await loadThread(chatId);
        await refreshChannels();
        return { sent: true as const };
      } catch (error) {
        return {
          sent: false as const,
          error: error instanceof Error ? error.message : 'Failed to send XMTP message.',
        };
      }
    },
    [client, displayLabel, loadThread, refreshChannels, resolveDmConversation, setMessagesByChat],
  );

  useEffect(() => {
    if (!client || !isActive) return;

    streamStartNsRef.current = Date.now() * 1_000_000;
    let cancelled = false;

    const handleMessage = async (message: DecodedMessageUnion) => {
      if (cancelled) return;
      const conversation = await client.conversations.findConversationByTopic(message.topic);
      if (!isDmConversation(conversation)) return;

      const chatId = xmtpConversationIdToChatId(conversation.id as string);
      conversationCacheRef.current.set(chatId, conversation);

      if (isReadReceiptMessage(message)) {
        if (message.senderInboxId !== client.inboxId) {
          markOutgoingMessagesSeen(chatId, parseSentNs(message.sentNs));
        }
        return;
      }

      if (isConversationHidden?.(chatId)) {
        await restoreConversation?.(chatId);
      }

      const mapped = mapXmtpMessageToChatMessage(message, chatId, displayLabel, client.inboxId);
      if (isMessageHidden?.(chatId, mapped.id)) {
        return;
      }

      let shouldNotify = false;
      setMessagesByChat((prev) => {
        const existing = prev[chatId] ?? [];
        if (existing.some((item) => item.id === mapped.id)) return prev;
        const limited = [...existing, mapped].slice(-MAX_MESSAGES_IN_MEMORY);
        shouldNotify = !mapped.outgoing && parseSentNs(message.sentNs) >= streamStartNsRef.current;
        return { ...prev, [chatId]: limited };
      });

      if (shouldNotify) {
        notifyIncoming(chatId, mapped);
      }

      if (!mapped.outgoing && isThreadOpen && selectedChatId === chatId) {
        await sendReadReceipt(chatId, parseSentNs(message.sentNs));
      }

      setDmChannels((prev) => {
        const next = [...prev];
        const index = next.findIndex((item) => item.id === chatId);
        const lastMessage = {
          text: mapped.content,
          ts: mapped.timestamp,
          from: mapped.author,
          authorId: mapped.authorId,
        };
        if (index >= 0) {
          const updated = { ...next[index], lastMessage };
          next.splice(index, 1);
          next.unshift(updated);
          return next;
        }
        const preferredName = preferredNameByChatIdRef.current[chatId];
        const fallbackName = preferredName?.trim() || mapped.author || 'XMTP contact';
        next.unshift({
          id: chatId,
          name: fallbackName,
          participants: [displayLabel, fallbackName],
          peerAddress: mapped.authorId ?? 'xmtp',
          isOnline: true,
          isDM: true,
          lastMessage,
        });
        return next;
      });
    };

    void client.conversations
      .streamAllMessages(handleMessage, 'dms', DM_CONSENT_STATES)
      .catch((error) => {
        if (cancelled) return;
        onErrorRef.current?.(error instanceof Error ? error.message : 'XMTP stream failed.');
      });

    return () => {
      cancelled = true;
      client.conversations.cancelStreamAllMessages();
    };
  }, [
    client,
    displayLabel,
    isConversationHidden,
    isActive,
    isMessageHidden,
    isThreadOpen,
    markOutgoingMessagesSeen,
    notifyIncoming,
    restoreConversation,
    selectedChatId,
    sendReadReceipt,
    setMessagesByChat,
  ]);

  useEffect(() => {
    if (!client) {
      conversationCacheRef.current.clear();
      setDmChannels([]);
      return;
    }
    void refreshChannels();
  }, [client, refreshChannels]);

  return useMemo(
    () => ({
      dmChannels,
      refreshChannels,
      startDM,
      loadThread,
      sendText,
      xmtpStatus,
      xmtpError,
    }),
    [dmChannels, loadThread, refreshChannels, sendText, startDM, xmtpError, xmtpStatus],
  );
}
