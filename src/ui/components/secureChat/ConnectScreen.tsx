import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '@components/PulseBadge';
import type { ServerInfo } from '@app-types/secureChat';

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
}: Props) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Connect to a peer</Text>
          <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#4f46e5" />
        </View>
        <Text style={styles.cardSubtitle}>Mirror of secureChat ConnectionForm in React Native</Text>
        <TextInput
          placeholder="192.168.1.20:8080"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={connectAddress}
          onChangeText={onConnectAddressChange}
          autoCapitalize="none"
        />
        <Text style={styles.hint}>Peer address (IP:Port or hostname)</Text>
        <TextInput
          placeholder="Chat name (optional)"
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={connectName}
          onChangeText={onConnectNameChange}
        />
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={onConnectPress} activeOpacity={0.9}>
          <MaterialCommunityIcons name="access-point-network" size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Connect securely</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Host a server</Text>
          <MaterialCommunityIcons name="server" size={22} color="#111827" />
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
            color="#ffffff"
          />
          <Text style={styles.primaryButtonText}>
            {serverInfo?.status === 'running' ? 'Server running' : 'Start server'}
          </Text>
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

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
  },
  cardSubtitle: {
    marginTop: 4,
    color: '#64748b',
  },
  input: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
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
    backgroundColor: '#4f46e5',
  },
  primaryButtonText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    backgroundColor: '#a5b4fc',
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
    color: '#1f2937',
  },
  addressPill: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  logList: {
    marginTop: 8,
    maxHeight: 112,
  },
  logLine: {
    marginBottom: 4,
    fontSize: 13,
    color: '#1f2937',
  },
  keyPreview: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#0f172a',
  },
});
