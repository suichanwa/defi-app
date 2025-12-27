import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import { isSupabaseConfigured, supabase } from '@services/supabaseClient';

type RealtimeArgs = {
  roomId: string;
  presenceKey: string;
  presencePayload?: Record<string, unknown>;
  onIncomingMessage: (message: ChatMessage) => void;
  onTyping?: (payload: TypingPayload) => void;
  onSubscribed?: () => void;
  onError?: () => void;
  onPresenceChange?: (count: number) => void;
};

export type TypingPayload = {
  chatId: string;
  authorId?: string;
  author?: string;
  isTyping: boolean;
};

export function useRealtimeRoom({
  roomId,
  presenceKey,
  presencePayload,
  onIncomingMessage,
  onTyping,
  onSubscribed,
  onError,
  onPresenceChange,
}: RealtimeArgs) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsReady(false);
    setParticipantCount(0);

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(`chat:${roomId}`, {
      config: {
        broadcast: { self: true },
        presence: { key: presenceKey },
      },
    });

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        onIncomingMessage(payload as ChatMessage);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        onTyping?.(payload as TypingPayload);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const keys = Object.keys(state);
        setParticipantCount(keys.length);
        onPresenceChange?.(keys.length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsReady(true);
          await channel.track(presencePayload ?? { user: presenceKey, room: roomId });
          onSubscribed?.();
        }
        if (status === 'CHANNEL_ERROR') {
          setIsReady(false);
          onError?.();
        }
      });

    channelRef.current = channel;
    return () => {
      setIsReady(false);
      setParticipantCount(0);
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [onError, onIncomingMessage, onPresenceChange, onSubscribed, presenceKey, presencePayload, roomId]);

  const sendBroadcast = useCallback(
    async (payload: ChatMessage) => {
      const channel = channelRef.current;
      if (!channel) return;
      if (isReady) {
        await channel.send({
          type: 'broadcast',
          event: 'message',
          payload,
        });
      } else {
        await channel.httpSend('message', payload);
      }
    },
    [isReady],
  );

  const sendTyping = useCallback(
    async (payload: TypingPayload) => {
      const channel = channelRef.current;
      if (!channel) return;
      if (isReady) {
        await channel.send({
          type: 'broadcast',
          event: 'typing',
          payload,
        });
      } else {
        await channel.httpSend('typing', payload);
      }
    },
    [isReady],
  );

  return {
    isReady,
    participantCount,
    sendBroadcast,
    sendTyping,
  };
}
