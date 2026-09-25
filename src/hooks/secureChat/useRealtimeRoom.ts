import { useCallback, useEffect, useRef, useState } from 'react';
type RealtimeChannel = {
  send: (payload: any) => Promise<any>;
  httpSend?: (event: string, payload: any) => Promise<any>;
};
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
  senderId?: string;
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
      .on('broadcast', { event: 'message' }, ({ payload }: any) => {
        onIncomingMessage(payload as ChatMessage);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
        onTyping?.(payload as TypingPayload);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const keys = Object.keys(state);
        setParticipantCount(keys.length);
        onPresenceChange?.(keys.length);
      })
      .subscribe(async (status: any) => {
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
      try {
        if (isReady) {
          await channel.send({
            type: 'broadcast',
            event: 'message',
            payload,
          });
        } else {
          await channel.httpSend?.('message', payload);
        }
      } catch (error) {
        console.warn('Supabase realtime broadcast failed:', error);
      }
    },
    [isReady],
  );

  const sendTyping = useCallback(
    async (payload: TypingPayload) => {
      const channel = channelRef.current;
      if (!channel) return;
      try {
        if (isReady) {
          await channel.send({
            type: 'broadcast',
            event: 'typing',
            payload,
          });
        } else {
          await channel.httpSend?.('typing', payload);
        }
      } catch (error) {
        console.warn('Supabase realtime sendTyping failed:', error);
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
