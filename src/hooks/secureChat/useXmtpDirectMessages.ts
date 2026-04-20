import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage, ChatThread } from '@app-types/securechat-types/secureChat';
import { ConversationVersion, Dm, PublicIdentity, type ConsentState, type DecodedMessageUnion } from '@xmtp/react-native-sdk';
import { useXmtpClient } from '@context/XmtpProvider';
import { MAX_MESSAGES_IN_MEMORY } from '@constants/secureChat.constants';
import {
  mapXmtpDmToChatThread,
  mapXmtpMessageToChatMessage,
  xmtpChatIdToConversationId,
  xmtpConversationIdToChatId,
} from '@services/xmtp/mappers';
import { isEvmAddress } from '@services/xmtp/signer';

type UseXmtpDirectMessagesArgs = {
  displayLabel: string;
  isActive: boolean;
  notifyIncoming: (chatId: string, message: ChatMessage) => void;
  setMessagesByChat: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
  onError?: (message: string) => void;
};

type SendTextArgs = {
  chatId: string;
  content: string;
};

const DM_CONSENT_STATES: ConsentState[] = ['allowed', 'unknown'];

const parseSentNs = (value?: number): number => {
  if (!value || !Number.isFinite(value)) return 0;
  return value;
};

const isDmConversation = (value: unknown): value is Dm =>
  value instanceof Dm || (!!value && typeof value === 'object' && (value as Dm).version === ConversationVersion.DM);

export function useXmtpDirectMessages({
  displayLabel,
  isActive,
  notifyIncoming,
  setMessagesByChat,
  onError,
}: UseXmtpDirectMessagesArgs) {
  const { client, status: xmtpStatus, error: xmtpError } = useXmtpClient();
  const [dmChannels, setDmChannels] = useState<ChatThread[]>([]);
  const conversationCacheRef = useRef<Map<string, Dm>>(new Map());
  const preferredNameByChatIdRef = useRef<Record<string, string>>({});
  const streamStartNsRef = useRef(0);

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
      onError?.(message);
    }
  }, [client, displayLabel, onError]);

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

  const loadThread = useCallback(
    async (chatId: string) => {
      const dm = await resolveDmConversation(chatId);
      if (!client || !dm) return;

      try {
        await dm.sync();
        const messages = await dm.messages({
          direction: 'ASCENDING',
          limit: MAX_MESSAGES_IN_MEMORY,
        });
        const mapped = messages.map((message) =>
          mapXmtpMessageToChatMessage(message, chatId, displayLabel, client.inboxId),
        );
        setThreadMessages(chatId, mapped);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load XMTP thread.';
        onError?.(message);
      }
    },
    [client, displayLabel, onError, resolveDmConversation, setThreadMessages],
  );

  const startDM = useCallback(
    async (peerAddress: string, peerName: string) => {
      if (!client) {
        throw new Error('XMTP client is not ready yet. Unlock your Ethereum wallet first.');
      }
      const normalizedAddress = peerAddress.trim().toLowerCase();
      if (!isEvmAddress(normalizedAddress)) {
        throw new Error('XMTP DMs require a valid Ethereum wallet address (0x...).');
      }

      const identity = new PublicIdentity(normalizedAddress, 'ETHEREUM');
      const dm = await client.conversations.findOrCreateDmWithIdentity(identity);
      const chatId = xmtpConversationIdToChatId(dm.id as string);
      if (peerName.trim()) {
        preferredNameByChatIdRef.current[chatId] = peerName.trim();
      }
      conversationCacheRef.current.set(chatId, dm);

      await refreshChannels();
      await loadThread(chatId);
      return chatId;
    },
    [client, loadThread, refreshChannels],
  );

  const sendText = useCallback(
    async ({ chatId, content }: SendTextArgs) => {
      const dm = await resolveDmConversation(chatId);
      if (!dm || !client) {
        return { sent: false, error: 'XMTP conversation is not ready.' };
      }

      const optimistic: ChatMessage = {
        id: `pending-${Date.now()}`,
        chatId,
        authorId: client.inboxId,
        author: displayLabel,
        content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        outgoing: true,
        type: 'text',
      };

      setMessagesByChat((prev) => {
        const existing = prev[chatId] ?? [];
        const limited = [...existing, optimistic].slice(-MAX_MESSAGES_IN_MEMORY);
        return { ...prev, [chatId]: limited };
      });

      try {
        await dm.send(content);
        await loadThread(chatId);
        await refreshChannels();
        return { sent: true as const };
      } catch (error) {
        setMessagesByChat((prev) => {
          const existing = prev[chatId] ?? [];
          return { ...prev, [chatId]: existing.filter((message) => message.id !== optimistic.id) };
        });
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
      const mapped = mapXmtpMessageToChatMessage(message, chatId, displayLabel, client.inboxId);

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
        onError?.(error instanceof Error ? error.message : 'XMTP stream failed.');
      });

    return () => {
      cancelled = true;
      client.conversations.cancelStreamAllMessages();
    };
  }, [client, displayLabel, isActive, notifyIncoming, onError, setMessagesByChat]);

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
