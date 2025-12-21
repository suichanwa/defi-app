import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PulseBadge from '@components/PulseBadge';
import type { ChatThread } from '@app-types/secureChat';
import { useTheme } from '@theme/ThemeProvider';

type PrivateChatHeaderProps = {
  chat: ChatThread;
};

export default function PrivateChatHeader({ chat }: PrivateChatHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPrivate = chat.isDM ?? chat.id.startsWith('dm:');

  if (!isPrivate) return null;

  const isOnline = chat.isOnline;
  const statusLabel = isOnline ? 'Online' : 'Offline';
  const statusColor = isOnline ? '#22c55e' : '#9ca3af';

  return (
    <View style={styles.container}>
      <Text style={styles.name} numberOfLines={1}>
        {chat.name}
      </Text>
      <View style={styles.statusRow}>
        <PulseBadge size={8} color={statusColor} />
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    name: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
      gap: 6,
    },
    statusText: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '600',
    },
  });
