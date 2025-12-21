import type { ChatMessage, ChatThread } from '../types/secureChat';
import { getJson, setJson } from './storage';

const DM_STORAGE_KEY = 'dm.channels.v1';

type DMChannel = {
  id: string;
  participants: [string, string];
  participantNames: [string, string];
  messages: ChatMessage[];
  createdAt: string;
  lastMessageAt: string;
};

type DMChannelStore = Map<string, DMChannel>;

let channelStore: DMChannelStore = new Map();
let isLoaded = false;

type DMListener = (channelId: string, message: ChatMessage) => void;
const listeners: Set<DMListener> = new Set();

// Load channels from storage
async function loadChannels(): Promise<void> {
  if (isLoaded) return;
  try {
    const stored = await getJson<Record<string, DMChannel>>(DM_STORAGE_KEY);
    if (stored) {
      channelStore = new Map(Object.entries(stored));
    }
  } catch (error) {
    console.warn('Failed to load DM channels:', error);
  }
  isLoaded = true;
}

// Save channels to storage
async function saveChannels(): Promise<void> {
  try {
    const obj: Record<string, DMChannel> = {};
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
): Promise<DMChannel> {
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
  
  return channel;
}

export async function getDMChannel(channelId: string): Promise<DMChannel | null> {
  await loadChannels();
  return channelStore.get(channelId) ?? null;
}

export async function getUserDMChannels(userId: string): Promise<DMChannel[]> {
  await loadChannels();
  const channels: DMChannel[] = [];
  channelStore.forEach((channel) => {
    if (channel.participants.includes(userId)) {
      channels.push(channel);
    }
  });
  return channels.sort((a, b) => 
    new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
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
  };

  channel.messages.push(fullMessage);
  channel.lastMessageAt = now.toISOString();
  
  await saveChannels();
  
  listeners.forEach((listener) => listener(channelId, fullMessage));
  
  return fullMessage;
}

export async function getDMMessages(channelId: string): Promise<ChatMessage[]> {
  await loadChannels();
  const channel = channelStore.get(channelId);
  return channel?.messages ?? [];
}

export function subscribeToDMMessages(listener: DMListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dmChannelToChatThread(channel: DMChannel, currentUserId: string): ChatThread {
  const otherUserIndex = channel.participants[0] === currentUserId ? 1 : 0;
  const otherUserName = channel.participantNames[otherUserIndex];
  const lastMessage = channel.messages[channel.messages.length - 1];

  return {
    id: channel.id,
    name: otherUserName,
    participants: [...channel.participantNames],
    peerAddress: `dm:${channel.participants[otherUserIndex]}`,
    isOnline: true,
    lastMessage: lastMessage
      ? {
          text: lastMessage.content,
          ts: lastMessage.timestamp,
          from: lastMessage.author,
          authorId: lastMessage.authorId,
        }
      : {
          text: 'Start a conversation',
          ts: new Date(channel.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          from: 'System',
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

// Initialize on import
loadChannels();
