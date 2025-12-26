import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import PulseBadge from '@components/PulseBadge';
import PrivateChatHeader from '@components/secureChat/PrivateChatHeader';
import type { ChatThread, ServerInfo } from '@app-types/secureChat';

type Props = {
  chat: ChatThread;
  serverInfo: ServerInfo | null;
  onBack: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
};

export default function ChatThreadHeader({ chat, serverInfo, onBack, isMuted, onToggleMute }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.headerRow}>
      <View style={styles.headerMain}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityLabel="Back to chats">
            <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <PrivateChatHeader chat={chat} isMuted={isMuted} onToggleMute={onToggleMute} />
        </View>
      </View>
      <View style={styles.statusColumn}>
        <View style={styles.statusRow}>
          <PulseBadge size={10} color={serverInfo ? colors.accent : '#f97316'} />
        </View>
        <Text style={styles.participantText}></Text>
      </View>
    </View>
  );
}

const createStyles = (colors: {
  card: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
}) =>
  StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    headerMain: {
      flex: 1,
      paddingRight: 12,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 8,
      padding: 8,
      borderRadius: 16,
      backgroundColor: colors.border,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusColumn: {
      alignItems: 'flex-end',
    },
    participantText: {
      marginTop: 4,
      fontSize: 12,
      color: colors.muted,
    },
  });
