import { useCallback, useRef, useState } from 'react';
import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import type { SecureChatMessageRow } from '@app-types/securechat-types/secureChatScreen';
import { selectMessagesPage } from '@services/messageQueries';
import { MAX_MESSAGES_IN_MEMORY } from '@constants/secureChat.constants';

type HistoryState = {
  loading: boolean;
  hasMore: boolean;
  oldestCreatedAt?: string;
};

type UseRoomHistoryArgs = {
  pageSize: number;
  mapRow: (row: SecureChatMessageRow) => ChatMessage;
  resolveMessages: (messages: ChatMessage[]) => Promise<ChatMessage[]>;
  onHistoryError?: (message: string) => void;
};

export function useRoomHistory({ pageSize, mapRow, resolveMessages, onHistoryError }: UseRoomHistoryArgs) {
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [historyStateByChat, setHistoryStateByChat] = useState<Record<string, HistoryState>>({});
  const historyLoadedRef = useRef<Record<string, boolean>>({});
  const loadInitialInFlightRef = useRef<Record<string, boolean>>({});
  const loadMoreInFlightRef = useRef<Record<string, boolean>>({});

  const ensureChatInitialized = useCallback((chatId: string) => {
    setMessagesByChat((prev) => (prev[chatId] ? prev : { ...prev, [chatId]: [] }));
    setHistoryStateByChat((prev) =>
      prev[chatId]
        ? prev
        : {
            ...prev,
            [chatId]: { loading: false, hasMore: true },
          },
    );
  }, []);

  const loadInitial = useCallback(
    async (roomId: string) => {
      if (loadInitialInFlightRef.current[roomId]) {
        return;
      }
      if (historyLoadedRef.current[roomId] && (messagesByChat[roomId]?.length ?? 0) > 0) {
        return;
      }
      loadInitialInFlightRef.current[roomId] = true;

      setHistoryStateByChat((prev) => ({
        ...prev,
        [roomId]: {
          loading: true,
          hasMore: prev[roomId]?.hasMore ?? true,
          oldestCreatedAt: prev[roomId]?.oldestCreatedAt,
        },
      }));

      const { data, error } = await selectMessagesPage({
        roomId,
        limit: pageSize,
      });

      if (error) {
        setHistoryStateByChat((prev) => ({
          ...prev,
          [roomId]: {
            ...prev[roomId],
            loading: false,
          },
        }));
        onHistoryError?.(error.message ?? 'History error');
        loadInitialInFlightRef.current[roomId] = false;
        return;
      }

      const mapped = await resolveMessages(data.map(mapRow).reverse());
      setMessagesByChat((prev) => ({ ...prev, [roomId]: mapped }));
      setHistoryStateByChat((prev) => ({
        ...prev,
        [roomId]: {
          loading: false,
          hasMore: data.length >= pageSize,
          oldestCreatedAt: mapped[0]?.createdAt,
        },
      }));

      historyLoadedRef.current[roomId] = true;
      loadInitialInFlightRef.current[roomId] = false;
    },
    [mapRow, messagesByChat, onHistoryError, pageSize, resolveMessages],
  );

  const loadOlder = useCallback(
    async (roomId: string) => {
      if (loadMoreInFlightRef.current[roomId]) return;
      if (historyStateByChat[roomId]?.loading) return;
      if (historyStateByChat[roomId] && historyStateByChat[roomId].hasMore === false) return;

      const oldestCreatedAt = historyStateByChat[roomId]?.oldestCreatedAt;
      if (!oldestCreatedAt) return;

      loadMoreInFlightRef.current[roomId] = true;
      setHistoryStateByChat((prev) => ({
        ...prev,
        [roomId]: {
          ...prev[roomId],
          loading: true,
        },
      }));

      const { data, error } = await selectMessagesPage({
        roomId,
        beforeCreatedAt: oldestCreatedAt,
        limit: pageSize,
      });

      if (error) {
        setHistoryStateByChat((prev) => ({
          ...prev,
          [roomId]: {
            ...prev[roomId],
            loading: false,
          },
        }));
        onHistoryError?.(error.message ?? 'History error');
        loadMoreInFlightRef.current[roomId] = false;
        return;
      }

      const resolved = await resolveMessages(data.map(mapRow).reverse());
      if (resolved.length === 0) {
        setHistoryStateByChat((prev) => ({
          ...prev,
          [roomId]: {
            ...prev[roomId],
            loading: false,
            hasMore: false,
          },
        }));
        loadMoreInFlightRef.current[roomId] = false;
        return;
      }

      setMessagesByChat((prev) => {
        const existing = prev[roomId] ?? [];
        const existingIds = new Set(existing.map((message) => message.id));
        const deduped = resolved.filter((message) => !existingIds.has(message.id));
        const combined = [...deduped, ...existing];
        
        // Limit messages in memory to prevent crashes from excessive scrolling
        // Keep only the most recent MAX_MESSAGES_IN_MEMORY messages
        const limited = combined.length > MAX_MESSAGES_IN_MEMORY
          ? combined.slice(0, MAX_MESSAGES_IN_MEMORY)
          : combined;
        
        return { ...prev, [roomId]: limited };
      });

      setHistoryStateByChat((prev) => ({
        ...prev,
        [roomId]: {
          loading: false,
          hasMore: resolved.length >= pageSize,
          oldestCreatedAt: resolved[0]?.createdAt ?? prev[roomId]?.oldestCreatedAt,
        },
      }));
      loadMoreInFlightRef.current[roomId] = false;
    },
    [historyStateByChat, mapRow, onHistoryError, pageSize, resolveMessages],
  );

  return {
    messagesByChat,
    setMessagesByChat,
    historyStateByChat,
    loadInitial,
    loadOlder,
    ensureChatInitialized,
  };
}
