import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, ViewStyle } from 'react-native';

type ProfileTabTransitionProps = {
  children: React.ReactNode;
  viewKey: string;
  enabled?: boolean;
  durationMs?: number;
  offset?: number;
  style?: ViewStyle;
  onBackSwipe?: () => void;
};

/**
 * Lightweight, removable wrapper to add a fade/slide animation when profile tabs change.
 * Disable by passing enabled={false} or removing the wrapper; it keeps the tab content untouched.
 */
export default function ProfileTabTransition({
  children,
  viewKey,
  enabled = true,
  durationMs = 180,
  offset = 12,
  style,
  onBackSwipe,
}: ProfileTabTransitionProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offset)).current;
  const panResponder = useMemo(() => {
    if (!onBackSwipe) return null;
    const edgeWidth = 28;
    const minDistance = 72;
    const minVelocity = 0.2;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        const isFromEdge = gesture.x0 <= edgeWidth || gesture.moveX <= edgeWidth;
        const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2;
        return isFromEdge && isHorizontal && gesture.dx > 12;
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > minDistance && gesture.vx > minVelocity) {
          onBackSwipe();
        }
      },
    });
  }, [onBackSwipe]);

  useEffect(() => {
    if (!enabled) return;
    opacity.setValue(0);
    translateY.setValue(offset);
    Animated.timing(opacity, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
    Animated.timing(translateY, {
      toValue: 0,
      duration: durationMs,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [viewKey, enabled, durationMs, offset, opacity, translateY]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Animated.View
      style={[styles.container, style, { opacity, transform: [{ translateY }] }]}
      {...(panResponder?.panHandlers ?? {})}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
