import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, ChatThread } from '@app-types/securechat-types/secureChat';
import {
  getOrCreateDMChannel,
  getDMMessages,
  getUserDMChannels,
  sendDMMessage,
  dmChannelToChatThread,
  subscribeToDMMessages,
} from '@services/directMessages';
import { MAX_MESSAGES_IN_MEMORY } from '@constants/secureChat.constants';

type UseDirectMessagesArgs = {
  effectiveUserId: string;
  displayLabel: string;
  isActive: boolean;
  selectedChatId: string;
  secureTab: 'chats' | 'connect';
  chatView: 'list' | 'thread';
  notifyIncoming: (chatId: string, message: ChatMessage) => void;
  setMessagesByChat: React.Dispatch<React.SetStateAction<Record<string, ChatMessage[]>>>;
  onError?: (message: string) => void;
};

export function useDirectMessages({
  effectiveUserId,
  displayLabel,
  isActive,
  selectedChatId,
  secureTab,
  chatView,
  notifyIncoming,
  setMessagesByChat,
  onError,
}: UseDirectMessagesArgs) {
  const [dmChannels, setDmChannels] = useState<ChatThread[]>([]);
  const lastDmFetchRef = useRef<Record<string, string>>({});
  const dmChannelHeadsRef = useRef<Record<string, string | null>>({});
  const dmPollInFlightRef = useRef(false);

  const refreshChannels = useCallback(async () => {
    if (!effectiveUserId) return;
    try {
      const channels = await getUserDMChannels(effectiveUserId);
      setDmChannels(channels.map((ch) => dmChannelToChatThread(ch, effectiveUserId)));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown DM sync error.';
      onError?.(message);
    }
  }, [effectiveUserId, onError]);

  const markDmFetched = useCallback((channelId: string, createdAt?: string | null) => {
    if (!createdAt) return;
    lastDmFetchRef.current[channelId] = createdAt;
  }, []);

  const startDM = useCallback(
    async (otherUserId: string, otherUserName: string) => {
      if (!effectiveUserId) {
        throw new Error('No effective user ID available');
      }

      if (otherUserId === effectiveUserId) {
        throw new Error('Cannot DM yourself.');
      }

      const channel = await getOrCreateDMChannel(
        effectiveUserId,
        displayLabel,
        otherUserId,
        otherUserName,
      );

      const messages = await getDMMessages(channel.id, effectiveUserId);
      setMessagesByChat((prev) => ({ ...prev, [channel.id]: messages }));
      const last = messages[messages.length - 1];
      if (last?.createdAt) {
        lastDmFetchRef.current[channel.id] = last.createdAt;
      }

      await refreshChannels();
      return channel.id;
    },
    [displayLabel, effectiveUserId, refreshChannels, setMessagesByChat],
  );

  const loadThread = useCallback(
    async (chatId: string) => {
      if (!chatId.startsWith('dm:')) return;
      try {
        const messages = await getDMMessages(chatId, effectiveUserId);
        
        // Limit messages in memory to prevent crashes
        const limited = messages.length > MAX_MESSAGES_IN_MEMORY
          ? messages.slice(-MAX_MESSAGES_IN_MEMORY)
          : messages;
        
        setMessagesByChat((prev) => ({ ...prev, [chatId]: limited }));
        const last = limited[limited.length - 1];
        if (last?.createdAt) {
          lastDmFetchRef.current[chatId] = last.createdAt;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load messages.';
        onError?.(message);
      }
    },
    [effectiveUserId, onError, setMessagesByChat],
  );

  useEffect(() => {
    if (!effectiveUserId) return;
    refreshChannels();
  }, [effectiveUserId, refreshChannels]);

  useEffect(() => {
    if (!effectiveUserId) return;
    let mounted = true;

    const unsubscribe = subscribeToDMMessages(effectiveUserId, (channelId, message) => {
      setMessagesByChat((prev) => {
        const existing = prev[channelId] ?? [];
        const seen = existing.some((m) => m.id === message.id);
        if (seen) return prev;
        notifyIncoming(channelId, message);
        
        const updated = [...existing, message];
        // Limit messages in memory to prevent crashes
        const limited = updated.length > MAX_MESSAGES_IN_MEMORY
          ? updated.slice(-MAX_MESSAGES_IN_MEMORY)
          : updated;
        
        return { ...prev, [channelId]: limited };
      });

      if (message.createdAt) {
        const previous = lastDmFetchRef.current[channelId];
        const nextTime = Date.parse(message.createdAt);
        const prevTime = previous ? Date.parse(previous) : 0;
        if (!Number.isNaN(nextTime) && nextTime > prevTime) {
          lastDmFetchRef.current[channelId] = message.createdAt;
        }
      }

      (async () => {
        try {
          await refreshChannels();
        } catch {
          if (!mounted) return;
        }
      })();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [effectiveUserId, notifyIncoming, refreshChannels, setMessagesByChat]);

  return {
    dmChannels,
    refreshChannels,
    startDM,
    loadThread,
    markDmFetched,
    sendDMMessage,
  };
}
