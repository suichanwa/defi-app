import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ServerInfo } from '@app-types/securechat-types/secureChat';
import { useTheme } from '@theme/ThemeProvider';
import { createSecureChatStyles } from '@styles/SecureChat';

type Props = {
  connectAddress: string;
  connectName: string;
  connectionLog: string[];
  devicePublicKey: string;
  serverInfo: ServerInfo | null;
  xmtpStatus: 'idle' | 'unsupported' | 'initializing' | 'ready' | 'error';
  onConnectAddressChange: (value: string) => void;
  onConnectNameChange: (value: string) => void;
  onConnectPress: () => void;
  onStartServer: () => void;
};

export default function ConnectScreen({
  connectAddress,
  connectName,
  connectionLog,
  devicePublicKey,
  xmtpStatus,
  onConnectAddressChange,
  onConnectNameChange,
  onConnectPress,
}: Props) {
  const { colors } = useTheme();
  const shared = useMemo(() => createSecureChatStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors, shared), [colors, shared]);
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
        <Text style={shared.cardTitle}>Connection activity</Text>
        <Text style={shared.cardSubtitle}>Recent events from transport / clipboard helpers</Text>
        <ScrollView style={styles.logList} showsVerticalScrollIndicator={false}>
          {connectionLog.map((line, idx) => (
            <Text key={`${line}-${idx}`} style={styles.logLine}>
              - {line}
            </Text>
          ))}
        </ScrollView>
        <Text style={shared.smallText}>Public key preview (from secureChat crypto API):</Text>
        <Text style={styles.keyPreview}>{devicePublicKey}</Text>
      </View>
    </ScrollView>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  shared: ReturnType<typeof createSecureChatStyles>,
) =>
  StyleSheet.create({
    scrollContent: {
      paddingTop: 16,
      paddingBottom: 120,
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
    logList: {
      marginTop: 8,
      maxHeight: 112,
    },
    logLine: {
      marginBottom: 4,
      fontSize: 13,
      color: colors.text,
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

