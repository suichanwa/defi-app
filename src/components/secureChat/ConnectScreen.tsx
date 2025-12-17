import React from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '../PulseBadge';
import type { ServerInfo } from '../../types/secureChat';

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
    <ScrollView className="mt-4" contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
      <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-semibold text-slate-900">Connect to a peer</Text>
          <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#4f46e5" />
        </View>
        <Text className="mt-1 text-slate-500">Mirror of secureChat ConnectionForm in React Native</Text>
        <TextInput
          placeholder="192.168.1.20:8080"
          placeholderTextColor="#9ca3af"
          className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          value={connectAddress}
          onChangeText={onConnectAddressChange}
          autoCapitalize="none"
        />
        <Text className="mt-2 text-xs text-slate-500">Peer address (IP:Port or hostname)</Text>
        <TextInput
          placeholder="Chat name (optional)"
          placeholderTextColor="#9ca3af"
          className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-slate-900"
          value={connectName}
          onChangeText={onConnectNameChange}
        />
        <TouchableOpacity
          className="mt-3 flex-row items-center justify-center rounded-xl bg-indigo-600 px-4 py-3"
          onPress={onConnectPress}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="access-point-network" size={18} color="#ffffff" />
          <Text className="ml-2 font-semibold text-white">Connect securely</Text>
        </TouchableOpacity>
      </View>

      <View className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-semibold text-slate-900">Host a server</Text>
          <MaterialCommunityIcons name="server" size={22} color="#111827" />
        </View>
        <Text className="mt-1 text-slate-500">Adapted from secureChat InfoPanel</Text>
        <View className="mt-3 flex-row items-center">
          <PulseBadge size={10} color={serverInfo ? '#22c55e' : '#f97316'} />
          <Text className="ml-2 text-sm font-semibold text-slate-800">
            {serverInfo
              ? serverInfo.status === 'running'
                ? `Running on ${serverInfo.address}:${serverInfo.port}`
                : 'Starting...'
              : 'Server offline'}
          </Text>
        </View>
        <Text className="mt-2 text-xs text-slate-500">Share this address with peers once running.</Text>
        <Text className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-sm font-semibold text-slate-900">
          {serverInfo ? `${serverInfo.address}:${serverInfo.port}` : 'Not started yet'}
        </Text>
        <TouchableOpacity
          className={`mt-3 flex-row items-center justify-center rounded-xl px-4 py-3 ${
            serverInfo?.status === 'running' ? 'bg-indigo-300' : 'bg-indigo-600'
          }`}
          onPress={onStartServer}
          activeOpacity={serverInfo?.status === 'running' ? 1 : 0.9}
        >
          <MaterialCommunityIcons
            name={serverInfo?.status === 'running' ? 'check' : 'rocket-launch'}
            size={18}
            color="#ffffff"
          />
          <Text className="ml-2 font-semibold text-white">
            {serverInfo?.status === 'running' ? 'Server running' : 'Start server'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-xl font-semibold text-slate-900">Connection activity</Text>
        <Text className="mt-1 text-slate-500">Recent events from transport / clipboard helpers</Text>
        <ScrollView className="mt-2" style={{ maxHeight: 112 }} showsVerticalScrollIndicator={false}>
          {connectionLog.map((line, idx) => (
            <Text key={`${line}-${idx}`} className="mb-1 text-sm text-slate-800">
              - {line}
            </Text>
          ))}
        </ScrollView>
        <Text className="mt-2 text-xs text-slate-500">Public key preview (from secureChat crypto API):</Text>
        <Text className="mt-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900">
          {devicePublicKey}
        </Text>
      </View>
    </ScrollView>
  );
}
