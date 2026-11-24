import type { ChatMessage, ChatThread } from '../types/securechat-types/secureChat';
import { decodeChatImageContent } from '@utils/secureChatImages';
import { getJson, setJson } from './storage';

const DM_STORAGE_KEY = 'dm.channels.v1';

type StoredDMChannel = {
  id: string;
  participants: [string, string];
  participantNames: [string, string];
  createdAt: string;
  lastMessageAt: string;
  lastMessageText?: string | null;
  lastMessageAuthorId?: string | null;
  lastMessageAuthorName?: string | null;
  messages?: ChatMessage[];
};

type LocalDMChannel = StoredDMChannel & {
  messages: ChatMessage[];
};

export type DMChannelHead = {
  id: string;
  lastMessageAt: string | null;
  updatedAt: string;
  createdAt: string;
};

type DMListener = (channelId: string, message: ChatMessage) => void;

let channelStore: Map<string, LocalDMChannel> = new Map();
let isLoaded = false;
const listeners: Set<DMListener> = new Set();

const mapLocalChannel = (channel: LocalDMChannel): StoredDMChannel => ({
  ...channel,
});

async function loadChannels(): Promise<void> {
  if (isLoaded) return;
  try {
    const stored = await getJson<Record<string, LocalDMChannel>>(DM_STORAGE_KEY);
    if (stored) {
      channelStore = new Map(Object.entries(stored));
    }
  } catch (error) {
    console.warn('Failed to load DM channels:', error);
  }
  isLoaded = true;
}

async function saveChannels(): Promise<void> {
  try {
    const obj: Record<string, LocalDMChannel> = {};
    channelStore.forEach((channel, key) => {
      obj[key] = channel;
    });
    await setJson(DM_STORAGE_KEY, obj);
  } catch (error) {
    console.warn('Failed to save DM channels:', error);
  }
}

export function getDMChannelId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `dm:${sorted[0]}:${sorted[1]}`;
}

export async function getOrCreateDMChannel(
  currentUserId: string,
  currentUserName: string,
  otherUserId: string,
  otherUserName: string,
): Promise<StoredDMChannel> {
  await loadChannels();
  const channelId = getDMChannelId(currentUserId, otherUserId);
  let channel = channelStore.get(channelId);
  if (!channel) {
    const now = new Date().toISOString();
    channel = {
      id: channelId,
      participants: [currentUserId, otherUserId],
      participantNames: [currentUserName, otherUserName],
      messages: [],
      createdAt: now,
      lastMessageAt: now,
    };
    channelStore.set(channelId, channel);
    await saveChannels();
  }
  return mapLocalChannel(channel);
}

export async function getDMChannel(channelId: string, _currentUserId?: string): Promise<StoredDMChannel | null> {
  await loadChannels();
  return channelStore.get(channelId) ?? null;
}

export async function getUserDMChannels(userId: string): Promise<StoredDMChannel[]> {
  await loadChannels();
  const channels: LocalDMChannel[] = [];
  channelStore.forEach((channel) => {
    if (channel.participants.includes(userId)) {
      channels.push(channel);
    }
  });
  return channels
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
    .map((channel) => mapLocalChannel(channel));
}

export async function getUserDMChannelHeads(userId: string): Promise<DMChannelHead[]> {
  await loadChannels();
  const heads: DMChannelHead[] = [];
  channelStore.forEach((channel) => {
    if (channel.participants.includes(userId)) {
      heads.push({
        id: channel.id,
        lastMessageAt: channel.lastMessageAt ?? null,
        updatedAt: channel.lastMessageAt ?? channel.createdAt,
        createdAt: channel.createdAt,
      });
    }
  });
  return heads;
}

export async function sendDMMessage(
  channelId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>,
): Promise<ChatMessage | null> {
  await loadChannels();
  const channel = channelStore.get(channelId);
  if (!channel) return null;

  const now = new Date();
  const fullMessage: ChatMessage = {
    ...message,
    id: `${channelId}-${now.getTime()}`,
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: now.toISOString(),
  };

  channel.messages.push(fullMessage);
  channel.lastMessageAt = now.toISOString();
  channel.lastMessageText = fullMessage.content;
  channel.lastMessageAuthorId = fullMessage.authorId ?? null;
  channel.lastMessageAuthorName = fullMessage.author;

  await saveChannels();
  listeners.forEach((listener) => listener(channelId, fullMessage));

  return fullMessage;
}

export async function getDMMessages(channelId: string, _currentUserId?: string): Promise<ChatMessage[]> {
  await loadChannels();
  const channel = channelStore.get(channelId);
  return channel?.messages ?? [];
}

export async function getDMMessagesSince(
  channelId: string,
  _currentUserId: string | undefined,
  sinceIso: string,
): Promise<ChatMessage[]> {
  await loadChannels();
  const channel = channelStore.get(channelId);
  if (!channel?.messages) return [];
  const sinceMs = Date.parse(sinceIso);
  if (Number.isNaN(sinceMs)) return channel.messages;
  return channel.messages.filter((message) => {
    if (!message.createdAt) return true;
    const messageMs = Date.parse(message.createdAt);
    if (Number.isNaN(messageMs)) return true;
    return messageMs > sinceMs;
  });
}

export function subscribeToDMMessages(_currentUserId: string, listener: DMListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function dmChannelToChatThread(channel: StoredDMChannel, currentUserId: string): ChatThread {
  const otherUserIndex = channel.participants[0] === currentUserId ? 1 : 0;
  const otherUserName = channel.participantNames[otherUserIndex];
  const messageFromStore = channel.messages?.[channel.messages.length - 1];
  const rawLastText = channel.lastMessageText ?? messageFromStore?.content ?? 'Start a conversation';
  const lastText = decodeChatImageContent(rawLastText) ? 'Photo' : rawLastText;
  const lastTs = channel.lastMessageAt ?? channel.createdAt ?? new Date().toISOString();
  const lastAuthor = channel.lastMessageAuthorName ?? messageFromStore?.author ?? 'System';

  return {
    id: channel.id,
    name: otherUserName,
    participants: [...channel.participantNames],
    peerAddress: `dm:${channel.participants[otherUserIndex]}`,
    isOnline: true,
    isDM: true,
    lastMessage: {
      text: lastText,
      ts: new Date(lastTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      from: lastAuthor,
      authorId: channel.lastMessageAuthorId ?? messageFromStore?.authorId,
    },
  };
}

export async function clearAllDMChannels(): Promise<void> {
  channelStore.clear();
  listeners.clear();
  isLoaded = false;
  try {
    await setJson(DM_STORAGE_KEY, {});
  } catch (error) {
    console.warn('Failed to clear DM channels:', error);
  }
}

loadChannels();
