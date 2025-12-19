import React, { useRef } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import PulseBadge from '../PulseBadge';
import type { ChatMessage, ChatThread, ServerInfo } from '../../types/secureChat';

type Props = {
  chat: ChatThread | null;
  messages: ChatMessage[];
  draft: string;
  serverInfo: ServerInfo | null;
  userAvatarUri?: string;
  onBack: () => void;
  onDraftChange: (value: string) => void;
  onSend: () => void;
};

export default function ChatThreadScreen({
  chat,
  messages,
  draft,
  serverInfo,
  userAvatarUri,
  onBack,
  onDraftChange,
  onSend,
}: Props) {
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);
        return isHorizontal && gesture.dx < -12;
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -60 && gesture.vx < -0.3) {
          onBack();
        }
      },
    }),
  ).current;

  if (!chat) {
    return (
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="message-text-lock-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No chat selected</Text>
          <Text style={styles.emptySubtitle}>Choose a chat or start a secure connection.</Text>
        </View>
      </KeyboardAvoidingView>
    );
  }

  const serverStatus = serverInfo
    ? serverInfo.status === 'running'
      ? `Hosting on ${serverInfo.address}:${serverInfo.port}`
      : 'Starting server...'
    : 'Server offline';

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <View style={styles.container} {...panResponder.panHandlers}>
        <View style={styles.headerRow}>
          <View style={styles.headerMain}>
            <View style={styles.headerTitleRow}>
              <TouchableOpacity onPress={onBack} style={styles.backButton}>
                <MaterialCommunityIcons name="arrow-left" size={18} color="#111827" />
              </TouchableOpacity>
              <View>
                <Text style={styles.title}>{chat.name}</Text>
                <Text style={styles.subtitle}>
                  {chat.peerAddress ? `Peer: ${chat.peerAddress}` : 'Local secure store'}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.statusRow}>
            <PulseBadge size={10} color={serverInfo ? '#22c55e' : '#f97316'} />
            <Text style={styles.statusText}>{serverStatus}</Text>
          </View>
        </View>

        <ScrollView
          style={styles.messageList}
          contentContainerStyle={styles.messageContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => {
            if (msg.type === 'system') {
              return (
                <View key={msg.id} style={[styles.messageBubble, styles.messageSystem]}>
                  <Text style={styles.messageText}>{msg.content}</Text>
                  <Text style={styles.messageTime}>{msg.timestamp}</Text>
                </View>
              );
            }
            const bubbleStyle = [
              styles.messageBubble,
              msg.outgoing ? styles.messageOutgoing : styles.messageIncoming,
            ];
            const textStyle = msg.outgoing ? styles.messageTextOutgoing : styles.messageText;
            const timeStyle = msg.outgoing ? styles.messageTimeOutgoing : styles.messageTime;
            const initial = (msg.author || '?').slice(0, 1).toUpperCase();
            const renderAvatar = (uri?: string, fallback?: string, outgoing?: boolean) =>
              uri ? (
                <Image source={{ uri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarCircle, outgoing ? styles.avatarOutgoing : styles.avatarIncoming]}>
                  <Text style={styles.avatarInitial}>{fallback ?? initial}</Text>
                </View>
              );
            return (
              <View
                key={msg.id}
                style={[styles.messageRow, msg.outgoing ? styles.rowOutgoing : styles.rowIncoming]}
              >
                {!msg.outgoing && renderAvatar(undefined, initial, false)}
                <View style={bubbleStyle}>
                  <Text style={textStyle}>{msg.author}</Text>
                  <Text style={[textStyle, styles.messageBody]}>{msg.content}</Text>
                  <Text style={timeStyle}>{msg.timestamp}</Text>
                </View>
                {msg.outgoing && renderAvatar(userAvatarUri, 'You', true)}
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            placeholder="Type a secure message..."
            placeholderTextColor="#9ca3af"
            style={styles.input}
            value={draft}
            onChangeText={onDraftChange}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={onSend} style={styles.sendButton}>
            <MaterialCommunityIcons name="send" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },
  emptySubtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: '#64748b',
  },
  container: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 16,
  },
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
    backgroundColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    color: '#64748b',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
  },
  messageList: {
    marginTop: 16,
    flex: 1,
  },
  messageContent: {
    paddingBottom: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  rowOutgoing: {
    justifyContent: 'flex-end',
  },
  rowIncoming: {
    justifyContent: 'flex-start',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginLeft: 4,
    backgroundColor: '#e2e8f0',
  },
  avatarIncoming: {
    backgroundColor: '#e2e8f0',
  },
  avatarOutgoing: {
    backgroundColor: '#c7d2fe',
    marginLeft: 8,
    marginRight: 0,
  },
  avatarInitial: {
    color: '#0f172a',
    fontWeight: '700',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
    backgroundColor: '#e2e8f0',
  },
  messageBubble: {
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    maxWidth: '85%',
  },
  messageIncoming: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0e7ff',
  },
  messageOutgoing: {
    alignSelf: 'flex-end',
    backgroundColor: '#4f46e5',
  },
  messageSystem: {
    alignSelf: 'center',
    backgroundColor: '#bae6fd',
  },
  messageText: {
    fontWeight: '600',
    color: '#0f172a',
  },
  messageTextOutgoing: {
    fontWeight: '600',
    color: '#ffffff',
  },
  messageBody: {
    marginTop: 4,
    fontWeight: '400',
  },
  messageTime: {
    marginTop: 8,
    fontSize: 11,
    color: '#64748b',
  },
  messageTimeOutgoing: {
    marginTop: 8,
    fontSize: 11,
    color: '#c7d2fe',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    color: '#0f172a',
  },
  sendButton: {
    marginLeft: 8,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#4f46e5',
  },
});
