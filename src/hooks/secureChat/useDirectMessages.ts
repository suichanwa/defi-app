import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, ChatThread } from '@app-types/securechat-types/secureChat';
import {
  getOrCreateDMChannel,
  getDMMessages,
  getDMMessagesSince,
  getUserDMChannelHeads,
  getUserDMChannels,
  sendDMMessage,
  dmChannelToChatThread,
  subscribeToDMMessages,
} from '@services/directMessages';
import { isSupabaseConfigured, supabase } from '@services/supabaseClient';
import { isUuid } from '@utils/secureChatUtils';
import { DM_POLL_INTERVAL_ACTIVE_MS, DM_POLL_INTERVAL_IDLE_MS } from '@constants/secureChatScreen';

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

      if (isSupabaseConfigured && (!isUuid(effectiveUserId) || !isUuid(otherUserId))) {
        throw new Error('Both users must be signed in with Supabase accounts to use synced DMs.');
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
        setMessagesByChat((prev) => ({ ...prev, [chatId]: messages }));
        const last = messages[messages.length - 1];
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
        return { ...prev, [channelId]: [...existing, message] };
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

  useEffect(() => {
    if (!isActive) return;
    if (!isSupabaseConfigured || !supabase) return;
    if (!isUuid(effectiveUserId)) return;

    let mounted = true;
    const poll = async () => {
      if (dmPollInFlightRef.current) return;
      dmPollInFlightRef.current = true;
      try {
        const heads = await getUserDMChannelHeads(effectiveUserId);
        if (!mounted) return;

        const nextHeads: Record<string, string | null> = {};
        let headsChanged = Object.keys(dmChannelHeadsRef.current).length !== heads.length;
        heads.forEach((head) => {
          const activityAt = head.lastMessageAt ?? head.updatedAt ?? head.createdAt ?? null;
          nextHeads[head.id] = activityAt;
          if (!headsChanged) {
            const prev = dmChannelHeadsRef.current[head.id] ?? null;
            if (prev !== activityAt) headsChanged = true;
          }
        });
        dmChannelHeadsRef.current = nextHeads;

        if (headsChanged) {
          await refreshChannels();
        }

        if (!selectedChatId.startsWith('dm:')) return;
        const activityAt = nextHeads[selectedChatId];
        const lastSeen = lastDmFetchRef.current[selectedChatId];
        const shouldFetch =
          Boolean(activityAt) &&
          (!lastSeen || Date.parse(activityAt as string) > Date.parse(lastSeen));
        if (!shouldFetch) return;

        const newMessages = lastSeen
          ? await getDMMessagesSince(selectedChatId, effectiveUserId, lastSeen)
          : await getDMMessages(selectedChatId, effectiveUserId);
        if (!mounted) return;

        if (newMessages.length === 0) return;
        setMessagesByChat((prev) => {
          const existing = prev[selectedChatId] ?? [];
          const next = [...existing];
          newMessages.forEach((message) => {
            if (next.some((m) => m.id === message.id)) return;
            next.push(message);
            notifyIncoming(selectedChatId, message);
          });
          return { ...prev, [selectedChatId]: next };
        });

        const last = newMessages[newMessages.length - 1];
        if (last?.createdAt) {
          lastDmFetchRef.current[selectedChatId] = last.createdAt;
        }
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : 'Unknown DM sync error.';
        onError?.(message);
      } finally {
        dmPollInFlightRef.current = false;
      }
    };

    poll();
    const isDmThreadActive =
      secureTab === 'chats' && chatView === 'thread' && selectedChatId.startsWith('dm:');
    const intervalMs = isDmThreadActive ? DM_POLL_INTERVAL_ACTIVE_MS : DM_POLL_INTERVAL_IDLE_MS;
    const interval = setInterval(poll, intervalMs);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [chatView, effectiveUserId, isActive, notifyIncoming, onError, refreshChannels, secureTab, selectedChatId, setMessagesByChat]);

  return {
    dmChannels,
    refreshChannels,
    startDM,
    loadThread,
    markDmFetched,
    sendDMMessage,
  };
}
