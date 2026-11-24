import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@app-types/securechat-types/secureChat';
import {
  DecentralizedRoomTransport,
  type TypingPayload,
} from '@services/securechat/roomTransport';

export type { TypingPayload };

type RealtimeArgs = {
  enabled?: boolean;
  roomId: string;
  presenceKey: string;
  presencePayload?: Record<string, unknown>;
  onIncomingMessage: (message: ChatMessage) => void;
  onTyping?: (payload: TypingPayload) => void;
  onSubscribed?: () => void;
  onError?: () => void;
  onPresenceChange?: (count: number) => void;
};

export function useRealtimeRoom({
  enabled = true,
  roomId,
  presenceKey,
  presencePayload,
  onIncomingMessage,
  onTyping,
  onSubscribed,
  onError,
  onPresenceChange,
}: RealtimeArgs) {
  const transportRef = useRef<DecentralizedRoomTransport | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [participantCount, setParticipantCount] = useState(enabled ? 1 : 0);

  const onIncomingMessageRef = useRef(onIncomingMessage);
  const onTypingRef = useRef(onTyping);
  const onSubscribedRef = useRef(onSubscribed);
  const onErrorRef = useRef(onError);
  const onPresenceChangeRef = useRef(onPresenceChange);
  const presencePayloadRef = useRef(presencePayload);

  onIncomingMessageRef.current = onIncomingMessage;
  onTypingRef.current = onTyping;
  onSubscribedRef.current = onSubscribed;
  onErrorRef.current = onError;
  onPresenceChangeRef.current = onPresenceChange;
  presencePayloadRef.current = presencePayload;

  useEffect(() => {
    setIsReady(false);
    setParticipantCount(enabled ? 1 : 0);

    if (transportRef.current) {
      transportRef.current.destroy();
      transportRef.current = null;
    }

    if (!enabled) {
      return;
    }

    const transport = new DecentralizedRoomTransport({
      roomId,
      presenceKey,
      presencePayload: presencePayloadRef.current,
      onIncomingMessage: (msg) => onIncomingMessageRef.current(msg),
      onTyping: (payload) => onTypingRef.current?.(payload),
      onSubscribed: () => {
        setIsReady(true);
        onSubscribedRef.current?.();
      },
      onError: () => onErrorRef.current?.(),
      onPresenceChange: (count) => {
        setParticipantCount(count);
        onPresenceChangeRef.current?.(count);
      },
    });

    transportRef.current = transport;

    return () => {
      setIsReady(false);
      transport.destroy();
      if (transportRef.current === transport) {
        transportRef.current = null;
      }
    };
  }, [enabled, roomId, presenceKey]);

  const sendBroadcast = useCallback(async (payload: ChatMessage) => {
    const transport = transportRef.current;
    if (!transport) return;
    try {
      await transport.sendBroadcast(payload);
    } catch (error) {
      console.warn('Realtime room broadcast failed:', error);
    }
  }, []);

  const sendTyping = useCallback(async (payload: TypingPayload) => {
    const transport = transportRef.current;
    if (!transport) return;
    try {
      await transport.sendTyping(payload);
    } catch (error) {
      console.warn('Realtime room sendTyping failed:', error);
    }
  }, []);

  return {
    isReady,
    participantCount,
    sendBroadcast,
    sendTyping,
  };
}
