import React, { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ServerInfo } from '@app-types/securechat-types/secureChat';
import { useTheme } from '@theme/ThemeProvider';
import { createSecureChatStyles } from '@styles/SecureChat';

type LogEntry = { ts: string; text: string; type: 'success' | 'error' | 'info' };
type GroupedEntry = LogEntry & { friendly: string; count: number };

const FRIENDLY: Array<{ match: (t: string) => boolean; msg: string; type: LogEntry['type'] }> = [
  {
    match: (t) => t.includes('Failed to join room') && t.includes('Supabase'),
    msg: 'Chat server unreachable — check your internet connection.',
    type: 'error',
  },
  {
    match: (t) => t.includes('XMTP native module is not linked'),
    msg: 'XMTP needs a native build. Switch from Expo Go to a dev or release APK.',
    type: 'error',
  },
  {
    match: (t) => t.includes('XMTP unavailable') && t.includes('unlock'),
    msg: 'Unlock your Ethereum wallet to enable encrypted direct messages.',
    type: 'info',
  },
  {
    match: (t) => t.startsWith('History error:') && t.includes('Failed to fetch'),
    msg: "Couldn't load message history — check your internet connection.",
    type: 'error',
  },
  {
    match: (t) => t.includes('Supabase is not configured'),
    msg: 'Chat server not set up. Ask the developer to configure Supabase.',
    type: 'info',
  },
  {
    match: (t) => t.includes('XMTP ready:'),
    msg: 'XMTP connected — encrypted messaging is ready.',
    type: 'success',
  },
];

function parseLogLine(line: string): LogEntry {
  const tsMatch = line.match(/^\[(\d{2}:\d{2})\]\s*/);
  const ts = tsMatch ? tsMatch[1] : '';
  const text = tsMatch ? line.slice(tsMatch[0].length) : line;
  const lower = text.toLowerCase();
  let type: LogEntry['type'] = 'info';
  if (lower.includes('error') || lower.includes('failed') || lower.includes('fail')) {
    type = 'error';
  } else if (
    lower.includes('ready') ||
    lower.includes('joined') ||
    lower.includes('connected') ||
    lower.includes('server ready') ||
    lower.includes('dm ready')
  ) {
    type = 'success';
  }
  return { ts, text, type };
}

function getFriendly(text: string): { msg: string; type: LogEntry['type'] } {
  for (const rule of FRIENDLY) {
    if (rule.match(text)) return { msg: rule.msg, type: rule.type };
  }
  // Strip "XMTP error: " prefix for other XMTP errors
  if (text.startsWith('XMTP error: ')) {
    return { msg: text.replace('XMTP error: ', 'XMTP: '), type: 'error' };
  }
  return { msg: text, type: 'info' };
}

function groupEntries(lines: string[]): GroupedEntry[] {
  const recent = lines.slice(0, 50);
  const groups: GroupedEntry[] = [];
  for (const line of recent) {
    const entry = parseLogLine(line);
    const { msg, type } = getFriendly(entry.text);
    const last = groups[groups.length - 1];
    if (last && last.text === entry.text) {
      last.count += 1;
      if (!last.ts && entry.ts) last.ts = entry.ts;
    } else {
      groups.push({ ...entry, type, friendly: msg, count: 1 });
    }
  }
  return groups;
}

const LOG_ICONS: Record<LogEntry['type'], React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  success: 'check-circle-outline',
  error: 'alert-circle-outline',
  info: 'information-outline',
};

type Props = {
  connectAddress: string;
  connectName: string;
  connectionLog: string[];
  devicePublicKey: string;
  serverInfo: ServerInfo | null;
  xmtpStatus: 'idle' | 'unsupported' | 'initializing' | 'ready' | 'error';
  onBackToChats: () => void;
  onConnectAddressChange: (value: string) => void;
  onConnectNameChange: (value: string) => void;
  onConnectPress: () => void;
  onStartServer: () => void;
  onClearLog?: () => void;
};

export default function ConnectScreen({
  connectAddress,
  connectName,
  connectionLog,
  devicePublicKey,
  xmtpStatus,
  onBackToChats,
  onConnectAddressChange,
  onConnectNameChange,
  onConnectPress,
  onClearLog,
}: Props) {
  const { colors } = useTheme();
  const shared = useMemo(() => createSecureChatStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors, shared), [colors, shared]);
  const grouped = useMemo(() => groupEntries(connectionLog), [connectionLog]);
  const connectCopy = useMemo(() => {
    switch (xmtpStatus) {
      case 'initializing':
        return {
          title: 'Switching to Ethereum wallet...',
          description: 'XMTP is preparing the Ethereum wallet needed for direct messages.',
          disabled: true,
        };
      case 'unsupported':
        return {
          title: 'XMTP unavailable in this build',
          description: 'Use a native Android build with XMTP support and an unlocked Ethereum wallet.',
          disabled: true,
        };
      case 'error':
      case 'idle':
        return {
          title: 'Unlock Ethereum wallet to open XMTP DM',
          description: 'XMTP starts once your Ethereum wallet is unlocked and ready.',
          disabled: true,
        };
      case 'ready':
      default:
        return {
          title: 'Open XMTP DM',
          description: 'Start a private chat using a peer Ethereum or Solana address.',
          disabled: false,
        };
    }
  }, [xmtpStatus]);

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.topHeaderNav}>
        <TouchableOpacity
          style={styles.chatsNavButton}
          onPress={onBackToChats}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Back to chats"
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color={colors.text} />
          <Text style={styles.chatsNavText}>Chats</Text>
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Direct Connections</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={shared.cardTitle}>XMTP Direct Message</Text>
          <MaterialCommunityIcons name="message-lock-outline" size={22} color={colors.text} />
        </View>
        <Text style={shared.cardSubtitle}>Start an XMTP DM using a peer Ethereum (0x...) or Solana wallet address.</Text>
        <TextInput
          placeholder="Peer wallet address (Ethereum or Solana)"
          placeholderTextColor={colors.muted}
          style={[shared.input, styles.inputSpacing]}
          value={connectAddress}
          onChangeText={onConnectAddressChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          placeholder="Display name (optional)"
          placeholderTextColor={colors.muted}
          style={[shared.input, styles.inputSpacing]}
          value={connectName}
          onChangeText={onConnectNameChange}
        />
        <TouchableOpacity
          style={[shared.buttonPrimary, styles.buttonSpacing, connectCopy.disabled ? styles.disabledButton : null]}
          onPress={connectCopy.disabled ? undefined : onConnectPress}
          disabled={connectCopy.disabled}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons
            name={connectCopy.disabled ? 'lock-outline' : 'send'}
            size={18}
            color={connectCopy.disabled ? colors.muted : colors.accentText}
          />
          <Text style={[shared.buttonPrimaryText, connectCopy.disabled ? styles.disabledButtonText : null]}>
            {connectCopy.title}
          </Text>
        </TouchableOpacity>
        <Text style={shared.smallText}>{connectCopy.description}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={shared.cardTitle}>Connection activity</Text>
            <Text style={shared.cardSubtitle}>What's happening behind the scenes</Text>
          </View>
          {!Platform.OS || Platform.OS !== 'web' ? (
            onClearLog && grouped.length > 0 ? (
              <TouchableOpacity onPress={onClearLog} style={styles.clearButton} activeOpacity={0.7}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            ) : null
          ) : null}
        </View>
        {Platform.OS === 'web' ? (
          <View style={styles.webNotice}>
            <MaterialCommunityIcons name="web-off" size={18} color={colors.muted} />
            <Text style={styles.webNoticeText}>
              You're on the web client — direct messages aren't supported here. Use the Android app.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.logList} showsVerticalScrollIndicator={false}>
            {grouped.length === 0 ? (
              <View style={styles.logEmpty}>
                <MaterialCommunityIcons name="satellite-uplink" size={28} color={colors.border} />
                <Text style={[shared.smallText, styles.logEmptyText]}>No activity yet.</Text>
                <Text style={[shared.smallText, styles.logEmptyText]}>Try connecting to a peer above.</Text>
              </View>
            ) : (
              grouped.map((entry, idx) => {
                const isError = entry.type === 'error';
                const isSuccess = entry.type === 'success';
                const iconColor = isError ? '#ef4444' : isSuccess ? '#22c55e' : colors.muted;
                const textColor = isError ? '#ef4444' : isSuccess ? '#22c55e' : colors.text;
                const bgColor = isError ? '#ef444410' : isSuccess ? '#22c55e10' : 'transparent';
                return (
                  <View
                    key={`${entry.text}-${idx}`}
                    style={[
                      styles.logEntry,
                      { backgroundColor: bgColor },
                      idx < grouped.length - 1 && styles.logEntryBorder,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={LOG_ICONS[entry.type]}
                      size={15}
                      color={iconColor}
                      style={styles.logIcon}
                    />
                    <View style={styles.logEntryBody}>
                      <Text style={[styles.logLine, { color: textColor }]}>{entry.friendly}</Text>
                      {entry.ts ? (
                        <Text style={[styles.logTs, { color: colors.muted }]}>{entry.ts}</Text>
                      ) : null}
                    </View>
                    {entry.count > 1 ? (
                      <View style={[styles.countBadge, { backgroundColor: isError ? '#ef444420' : colors.border }]}>
                        <Text style={[styles.countText, { color: isError ? '#ef4444' : colors.muted }]}>
                          ×{entry.count}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
        <Text style={[shared.smallText, styles.keyLabel]}>Your public identity:</Text>
        <Text style={styles.keyPreview} numberOfLines={2}>{devicePublicKey}</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  shared: ReturnType<typeof createSecureChatStyles>,
) =>
  StyleSheet.create({
    webNotice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    webNoticeText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
    },
    scrollContent: {
      paddingTop: 4,
      paddingBottom: 120,
      paddingHorizontal: 6,
    },
    topHeaderNav: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingVertical: 4,
    },
    chatsNavButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chatsNavText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    topHeaderTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    headerRightSpacer: {
      width: 75,
    },
    card: {
      ...shared.surfaceCard,
      marginBottom: 16,
      padding: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inputSpacing: {
      marginTop: 12,
    },
    buttonSpacing: {
      marginTop: 12,
    },
    disabledButton: {
      backgroundColor: colors.border,
      opacity: 0.9,
    },
    disabledButtonText: {
      color: colors.muted,
    },
    clearButton: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    clearButtonText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
    },
    logList: {
      marginTop: 12,
      maxHeight: 220,
    },
    logEmpty: {
      alignItems: 'center',
      paddingVertical: 20,
      gap: 6,
    },
    logEmptyText: {
      textAlign: 'center',
    },
    logEntry: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 8,
      gap: 8,
    },
    logEntryBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    logIcon: {
      flexShrink: 0,
    },
    logEntryBody: {
      flex: 1,
    },
    logTs: {
      fontSize: 10,
      fontWeight: '500',
      letterSpacing: 0.2,
      marginTop: 2,
    },
    logLine: {
      fontSize: 13,
      lineHeight: 18,
    },
    countBadge: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 10,
      flexShrink: 0,
    },
    countText: {
      fontSize: 11,
      fontWeight: '700',
    },
    keyLabel: {
      marginTop: 14,
    },
    keyPreview: {
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 12,
      color: colors.text,
      backgroundColor: colors.background,
    },
  });
