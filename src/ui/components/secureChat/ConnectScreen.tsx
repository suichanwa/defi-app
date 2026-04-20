import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '@components/PulseBadge';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import type { ServerInfo } from '@app-types/securechat-types/secureChat';
import { useTheme } from '@theme/ThemeProvider';

type Props = {
  connectAddress: string;
  connectName: string;
  connectionLog: string[];
  devicePublicKey: string;
  serverInfo: ServerInfo | null;
  onConnectAddressChange: (value: string) => void;
  onConnectNameChange: (value: string) => void;
  onConnectPress: () => void;
  onStartServer: () => void;
  p2p: {
    status: string;
    peerLabel?: string | null;
    localOffer: string;
    localAnswer: string;
    localCandidates: string;
    remoteOffer: string;
    remoteAnswer: string;
    remoteCandidates: string;
    onRemoteOfferChange: (value: string) => void;
    onRemoteAnswerChange: (value: string) => void;
    onRemoteCandidatesChange: (value: string) => void;
    onCreateOffer: () => void;
    onCreateAnswer: () => void;
    onAcceptAnswer: () => void;
    onAddCandidates: () => void;
    onReset: () => void;
  };
};

export default function ConnectScreen({
  connectAddress,
  connectName,
  connectionLog,
  devicePublicKey,
  serverInfo,
  onConnectAddressChange,
  onConnectNameChange,
  onConnectPress,
  onStartServer,
  p2p,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const qrDark = colors.text;
  const qrLight = colors.card;

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Host a server</Text>
          <MaterialCommunityIcons name="server" size={22} color={colors.text} />
        </View>
        <Text style={styles.cardSubtitle}>Adapted from secureChat InfoPanel</Text>
        <View style={styles.statusRow}>
          <PulseBadge size={10} color={serverInfo ? '#22c55e' : '#f97316'} />
          <Text style={styles.statusText}>
            {serverInfo
              ? serverInfo.status === 'running'
                ? `Running on ${serverInfo.address}:${serverInfo.port}`
                : 'Starting...'
              : 'Server offline'}
          </Text>
        </View>
        <Text style={styles.hint}>Share this address with peers once running.</Text>
        <Text style={styles.addressPill}>
          {serverInfo ? `${serverInfo.address}:${serverInfo.port}` : 'Not started yet'}
        </Text>
        <TouchableOpacity
          style={[styles.button, serverInfo?.status === 'running' ? styles.disabledButton : styles.primaryButton]}
          onPress={onStartServer}
          activeOpacity={serverInfo?.status === 'running' ? 1 : 0.9}
        >
          <MaterialCommunityIcons
            name={serverInfo?.status === 'running' ? 'check' : 'rocket-launch'}
            size={18}
            color={colors.accentText}
          />
          <Text style={styles.primaryButtonText}>
            {serverInfo?.status === 'running' ? 'Server running' : 'Start server'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>P2P Direct Message</Text>
          <MaterialCommunityIcons name="signal" size={22} color={colors.text} />
        </View>
        <Text style={styles.cardSubtitle}>
          Manual offer/answer + ICE exchange. No server required.
        </Text>
        <View style={styles.statusRow}>
          <PulseBadge size={10} color={p2p.status === 'connected' ? '#22c55e' : '#f97316'} />
          <Text style={styles.statusText}>
            {p2p.status === 'connected' ? `Connected to ${p2p.peerLabel ?? 'peer'}` : `Status: ${p2p.status}`}
          </Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoText}>
            1) Create offer → send to peer{'\n'}
            2) Peer creates answer → send back{'\n'}
            3) Paste answer → accept{'\n'}
            4) If not connected, exchange ICE in the candidates boxes
          </Text>
        </View>

        <View style={styles.sectionRow}>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={p2p.onCreateOffer} activeOpacity={0.9}>
            <MaterialCommunityIcons name="qrcode" size={18} color={colors.accentText} />
            <Text style={styles.primaryButtonText}>Create offer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={p2p.onReset} activeOpacity={0.9}>
            <MaterialCommunityIcons name="refresh" size={18} color={colors.text} />
            <Text style={styles.primaryButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          placeholder="Local offer JSON"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.monoInput]}
          value={p2p.localOffer}
          editable={false}
          multiline
        />
        {p2p.localOffer ? (
          <View style={styles.qrRow}>
            <QRCode value={p2p.localOffer} size={120} color={qrDark} backgroundColor={qrLight} />
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => Clipboard.setStringAsync(p2p.localOffer)}
              activeOpacity={0.9}
            >
              <MaterialCommunityIcons name="content-copy" size={18} color={colors.accentText} />
              <Text style={styles.primaryButtonText}>Copy offer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.hint}>Paste remote offer to generate an answer.</Text>
        <TextInput
          placeholder="Remote offer JSON"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.monoInput]}
          value={p2p.remoteOffer}
          onChangeText={p2p.onRemoteOfferChange}
          multiline
        />
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={p2p.onCreateAnswer} activeOpacity={0.9}>
          <MaterialCommunityIcons name="reply" size={18} color={colors.accentText} />
          <Text style={styles.primaryButtonText}>Create answer</Text>
        </TouchableOpacity>
        <TextInput
          placeholder="Local answer JSON"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.monoInput]}
          value={p2p.localAnswer}
          editable={false}
          multiline
        />
        {p2p.localAnswer ? (
          <View style={styles.qrRow}>
            <QRCode value={p2p.localAnswer} size={120} color={qrDark} backgroundColor={qrLight} />
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => Clipboard.setStringAsync(p2p.localAnswer)}
              activeOpacity={0.9}
            >
              <MaterialCommunityIcons name="content-copy" size={18} color={colors.accentText} />
              <Text style={styles.primaryButtonText}>Copy answer</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.hint}>Paste remote answer if you created the offer.</Text>
        <TextInput
          placeholder="Remote answer JSON"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.monoInput]}
          value={p2p.remoteAnswer}
          onChangeText={p2p.onRemoteAnswerChange}
          multiline
        />
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={p2p.onAcceptAnswer} activeOpacity={0.9}>
          <MaterialCommunityIcons name="check" size={18} color={colors.accentText} />
          <Text style={styles.primaryButtonText}>Accept answer</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>Exchange ICE candidates if the connection does not establish.</Text>
        <TextInput
          placeholder="Local ICE candidates JSON"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.monoInput]}
          value={p2p.localCandidates}
          editable={false}
          multiline
        />
        {p2p.localCandidates ? (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => Clipboard.setStringAsync(p2p.localCandidates)}
            activeOpacity={0.9}
          >
            <MaterialCommunityIcons name="content-copy" size={18} color={colors.accentText} />
            <Text style={styles.primaryButtonText}>Copy ICE</Text>
          </TouchableOpacity>
        ) : null}
        <TextInput
          placeholder="Remote ICE candidates JSON"
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.monoInput]}
          value={p2p.remoteCandidates}
          onChangeText={p2p.onRemoteCandidatesChange}
          multiline
        />
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={p2p.onAddCandidates} activeOpacity={0.9}>
          <MaterialCommunityIcons name="plus" size={18} color={colors.accentText} />
          <Text style={styles.primaryButtonText}>Add ICE candidates</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>XMTP Direct Message</Text>
          <MaterialCommunityIcons name="message-lock-outline" size={22} color={colors.text} />
        </View>
        <Text style={styles.cardSubtitle}>Start an XMTP DM using a peer Ethereum wallet address.</Text>
        <TextInput
          placeholder="Peer wallet address (0x...)"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={connectAddress}
          onChangeText={onConnectAddressChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          placeholder="Display name (optional)"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={connectName}
          onChangeText={onConnectNameChange}
        />
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onConnectPress} activeOpacity={0.9}>
          <MaterialCommunityIcons name="send" size={18} color={colors.accentText} />
          <Text style={styles.primaryButtonText}>Open XMTP DM</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection activity</Text>
        <Text style={styles.cardSubtitle}>Recent events from transport / clipboard helpers</Text>
        <ScrollView style={styles.logList} showsVerticalScrollIndicator={false}>
          {connectionLog.map((line, idx) => (
            <Text key={`${line}-${idx}`} style={styles.logLine}>
              - {line}
            </Text>
          ))}
        </ScrollView>
        <Text style={styles.hint}>Public key preview (from secureChat crypto API):</Text>
        <Text style={styles.keyPreview}>{devicePublicKey}</Text>
      </View>
    </ScrollView>
  );
}

  const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  cardSubtitle: {
    marginTop: 4,
    color: colors.muted,
  },
  input: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.background,
  },
  monoInput: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.muted,
  },
  button: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: colors.accent,
  },
  secondaryButton: {
    backgroundColor: colors.border,
  },
  primaryButtonText: {
    marginLeft: 8,
    fontWeight: '600',
    color: colors.accentText,
  },
  disabledButton: {
    backgroundColor: colors.border,
  },
  statusRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
    statusText: {
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
    },
    infoCard: {
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      padding: 12,
    },
    infoTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    infoText: {
      marginTop: 6,
      fontSize: 12,
      color: colors.muted,
      lineHeight: 18,
    },
  addressPill: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
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
  sectionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  qrRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
