import { useCallback, useRef } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

type DoubleScrollOptions = {
  onTrigger: () => void;
  minVelocity?: number;
  minDistance?: number;
  maxIntervalMs?: number;
  cooldownMs?: number;
};

export default function useDoubleScrollRefresh({
  onTrigger,
  minVelocity = 0.8,
  minDistance = 48,
  maxIntervalMs = 600,
  cooldownMs = 1200,
}: DoubleScrollOptions) {
  const lastFlickAtRef = useRef(0);
  const lastTriggerAtRef = useRef(0);
  const flickCountRef = useRef(0);
  const lastOffsetRef = useRef(0);

  const onScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const now = Date.now();
      const velocityY = event.nativeEvent.velocity?.y ?? 0;
      const offsetY = event.nativeEvent.contentOffset.y ?? 0;
      const deltaY = offsetY - lastOffsetRef.current;
      lastOffsetRef.current = offsetY;

      const isUpwardFlick = velocityY > minVelocity || deltaY > minDistance;
      if (!isUpwardFlick) {
        return;
      }

      if (now - lastFlickAtRef.current > maxIntervalMs) {
        flickCountRef.current = 0;
      }

      flickCountRef.current += 1;
      lastFlickAtRef.current = now;

      if (flickCountRef.current >= 2) {
        if (now - lastTriggerAtRef.current > cooldownMs) {
          lastTriggerAtRef.current = now;
          onTrigger();
        }
        flickCountRef.current = 0;
      }
    },
    [cooldownMs, maxIntervalMs, minDistance, minVelocity, onTrigger],
  );

  return { onScrollEndDrag };
}
