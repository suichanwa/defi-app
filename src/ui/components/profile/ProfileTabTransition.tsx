import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, ViewStyle } from 'react-native';

type ProfileTabTransitionProps = {
  children: React.ReactNode;
  viewKey: string;
  enabled?: boolean;
  durationMs?: number;
  offset?: number;
  style?: ViewStyle;
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
}: ProfileTabTransitionProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(offset)).current;

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
    <Animated.View style={[styles.container, style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
