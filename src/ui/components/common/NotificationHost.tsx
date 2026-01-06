import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme/ThemeProvider';
import { useNotifications } from '@context/NotificationProvider';

type NotificationHostProps = {
  scope?: string;
  animation?: 'slide' | 'fade' | 'scale';
  offset?: number;
};

type NotificationItemProps = {
  id: string;
  title: string;
  message?: string;
  type: 'success' | 'error' | 'info';
  durationMs: number;
  animation: 'slide' | 'fade' | 'scale';
  onDismiss: (id: string) => void;
  accentColor: string;
  successColor: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
};

function NotificationItem({
  id,
  title,
  message,
  type,
  durationMs,
  animation,
  onDismiss,
  accentColor,
  successColor,
  backgroundColor,
  borderColor,
  textColor,
  mutedColor,
}: NotificationItemProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onDismiss(id);
      });
    }, durationMs);
    return () => clearTimeout(timeout);
  }, [durationMs, id, onDismiss, progress]);

  const animatedStyle = useMemo(() => {
    if (animation === 'fade') {
      return { opacity: progress };
    }
    if (animation === 'scale') {
      return {
        opacity: progress,
        transform: [
          {
            scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }),
          },
        ],
      };
    }
    return {
      opacity: progress,
      transform: [
        {
          translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
        },
      ],
    };
  }, [animation, progress]);

  const leftColor = type === 'success' ? successColor : type === 'error' ? '#ef4444' : accentColor;

  return (
    <Animated.View
      style={[
        localStyles.card,
        animatedStyle,
        { backgroundColor, borderColor, borderLeftColor: leftColor },
      ]}
    >
      <Text numberOfLines={1} style={[localStyles.title, { color: textColor }]}>
        {title}
      </Text>
      {message ? (
        <Text numberOfLines={2} style={[localStyles.message, { color: mutedColor }]}>
          {message}
        </Text>
      ) : null}
    </Animated.View>
  );
}

export default function NotificationHost({
  scope,
  animation = 'slide',
  offset = 12,
}: NotificationHostProps) {
  const { notifications, dismiss } = useNotifications();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const visibleNotifications = useMemo(() => {
    return notifications.filter((item) => {
      if (!scope) return !item.scope;
      return item.scope === scope;
    });
  }, [notifications, scope]);

  return (
    <View pointerEvents="box-none" style={[localStyles.host, { top: insets.top + offset }]}>
      {visibleNotifications.map((item) => (
        <NotificationItem
          key={item.id}
          id={item.id}
          title={item.title}
          message={item.message}
          type={item.type ?? 'info'}
          durationMs={item.durationMs ?? 2200}
          animation={item.animation ?? animation}
          onDismiss={dismiss}
          accentColor={colors.accent}
          successColor={colors.success ?? '#22c55e'}
          backgroundColor={colors.card}
          borderColor={colors.border}
          textColor={colors.text}
          mutedColor={colors.muted}
        />
      ))}
    </View>
  );
}

const localStyles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  message: {
    fontSize: 12,
    marginTop: 2,
  },
});
