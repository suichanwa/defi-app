type RealtimeChannel = any;
import type { ChatMessage, ChatThread } from '../types/securechat-types/secureChat';
import { resolveChatImageMessage, resolveChatImageMessages, decodeChatImageContent, encodeChatImageContent } from '@utils/secureChatImages';
import { isSupabaseConfigured, supabase } from './supabaseClient';
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

type DMChannelRow = {
  id: string;
  participant_ids: [string, string];
  participant_labels: [string, string];
  created_at: string;
  updated_at: string;
  last_message_text: string | null;
  last_message_at: string | null;
  last_message_author_id: string | null;
  last_message_author_label: string | null;
};

type DMMessageRow = {
  id: string;
  channel_id: string;
  author_id: string;
  author_label: string;
  content: string;
  created_at: string;
  image_path?: string | null;
  message_type?: 'text' | 'system' | 'image' | null;
};

type DMChannelHeadRow = {
  id: string;
  last_message_at: string | null;
  updated_at: string;
  created_at: string;
};

export type DMChannelHead = {
  id: string;
  lastMessageAt: string | null;
  updatedAt: string;
  createdAt: string;
};

type DMListener = (channelId: string, message: ChatMessage) => void;

type SortedParticipants = {
  ids: [string, string];
  labels: [string, string];
};

let channelStore: Map<string, LocalDMChannel> = new Map();
let isLoaded = false;
const listeners: Set<DMListener> = new Set();
let realtimeChannel: RealtimeChannel | null = null;
let realtimeUserId: string | null = null;

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string) => uuidRegex.test(value);

const canUseSupabase = (_currentUserId?: string, _otherUserId?: string) => false;

const sortParticipants = (
  userId1: string,
  userName1: string,
  userId2: string,
  userName2: string,
): SortedParticipants => {
  const pairs = [
    { id: userId1, name: userName1 },
    { id: userId2, name: userName2 },
  ].sort((a, b) => a.id.localeCompare(b.id));
  return {
    ids: [pairs[0].id, pairs[1].id],
    labels: [pairs[0].name, pairs[1].name],
  };
};

const mapRemoteChannel = (row: DMChannelRow): StoredDMChannel => ({
  id: row.id,
  participants: [row.participant_ids[0], row.participant_ids[1]],
  participantNames: [row.participant_labels[0], row.participant_labels[1]],
  createdAt: row.created_at,
  lastMessageAt: row.last_message_at ?? row.updated_at ?? row.created_at,
  lastMessageText: row.last_message_text ?? null,
  lastMessageAuthorId: row.last_message_author_id ?? null,
  lastMessageAuthorName: row.last_message_author_label ?? null,
});

const mapRemoteMessage = (row: DMMessageRow, currentUserId?: string): ChatMessage => {
  const ts = new Date(row.created_at);
  const outgoing = currentUserId ? row.author_id === currentUserId : undefined;
  const decodedPath = decodeChatImageContent(row.content);
  const imagePath = row.image_path ?? decodedPath;
  const type = row.message_type ?? (imagePath ? 'image' : 'text');
  return {
    id: row.id,
    chatId: row.channel_id,
    authorId: row.author_id,
    author: row.author_label,
    content: imagePath && decodedPath ? 'Photo' : row.content,
    timestamp: ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: row.created_at,
    outgoing,
    type,
    imagePath: imagePath ?? undefined,
  };
};

const mapLocalChannel = (channel: LocalDMChannel): StoredDMChannel => ({
  ...channel,
});

const createSupabaseError = (context: string, error?: { message?: string } | null) => {
  const suffix = error?.message ? `: ${error.message}` : '';
  return new Error(`${context}${suffix}`);
};

// Load channels from storage
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

// Save channels to storage
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
  if (canUseSupabase(currentUserId, otherUserId) && supabase) {
    const channelId = getDMChannelId(currentUserId, otherUserId);
    const sorted = sortParticipants(currentUserId, currentUserName, otherUserId, otherUserName);
    const { data, error } = await supabase
      .from('dm_channels')
      .upsert(
        {
          id: channelId,
          participant_ids: sorted.ids,
          participant_labels: sorted.labels,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select(
        'id, participant_ids, participant_labels, created_at, updated_at, last_message_text, last_message_at, last_message_author_id, last_message_author_label',
      )
      .single();

    if (data && !error) {
      return mapRemoteChannel(data as DMChannelRow);
    }

    throw createSupabaseError('Supabase DM channel upsert failed', error);
  }

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

export async function getDMChannel(channelId: string, currentUserId?: string): Promise<StoredDMChannel | null> {
  if (currentUserId && canUseSupabase(currentUserId) && supabase) {
    const { data, error } = await supabase
      .from('dm_channels')
      .select(
        'id, participant_ids, participant_labels, created_at, updated_at, last_message_text, last_message_at, last_message_author_id, last_message_author_label',
      )
      .eq('id', channelId)
      .single();
    if (data && !error) return mapRemoteChannel(data as DMChannelRow);
    throw createSupabaseError('Supabase DM channel fetch failed', error);
  }

  await loadChannels();
  return channelStore.get(channelId) ?? null;
}

export async function getUserDMChannels(userId: string): Promise<StoredDMChannel[]> {
  if (canUseSupabase(userId) && supabase) {
    const { data, error } = await supabase
      .from('dm_channels')
      .select(
        'id, participant_ids, participant_labels, created_at, updated_at, last_message_text, last_message_at, last_message_author_id, last_message_author_label',
      )
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false });

    if (!error && data) {
      return data.map((row: any) => mapRemoteChannel(row as DMChannelRow));
    }

    throw createSupabaseError('Supabase DM channel fetch failed', error);
  }

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
  if (canUseSupabase(userId) && supabase) {
    const { data, error } = await supabase
      .from('dm_channels')
      .select('id, last_message_at, updated_at, created_at')
      .contains('participant_ids', [userId]);

    if (!error && data) {
      return (data as DMChannelHeadRow[]).map((row) => ({
        id: row.id,
        lastMessageAt: row.last_message_at ?? null,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
      }));
    }

    throw createSupabaseError('Supabase DM channel heads fetch failed', error);
  }

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
  const authorId = message.authorId ?? '';
  if (canUseSupabase(authorId) && supabase) {
    const insertPayload = {
      channel_id: channelId,
      author_id: authorId,
      author_label: message.author,
      content: message.content,
      image_path: message.imagePath ?? null,
      message_type: message.type ?? 'text',
    };

    const { data, error } = await supabase
      .from('dm_messages')
      .insert(insertPayload)
      .select('id, channel_id, author_id, author_label, content, created_at, image_path, message_type')
      .single();

    if (!error && data) {
      return resolveChatImageMessage(mapRemoteMessage(data as DMMessageRow, authorId));
    }

    if (error?.message?.includes('image_path') || error?.message?.includes('message_type')) {
      const fallbackContent = message.imagePath ? encodeChatImageContent(message.imagePath) : message.content;
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('dm_messages')
        .insert({
          channel_id: channelId,
          author_id: authorId,
          author_label: message.author,
          content: fallbackContent,
        })
        .select('id, channel_id, author_id, author_label, content, created_at')
        .single();

      if (!fallbackError && fallbackData) {
        return resolveChatImageMessage(mapRemoteMessage(fallbackData as DMMessageRow, authorId));
      }
      throw createSupabaseError('Supabase DM message insert failed', fallbackError);
    }

    throw createSupabaseError('Supabase DM message insert failed', error);
  }

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

export async function getDMMessages(channelId: string, currentUserId?: string): Promise<ChatMessage[]> {
  if (currentUserId && canUseSupabase(currentUserId) && supabase) {
    const { data, error } = await supabase
      .from('dm_messages')
      .select('id, channel_id, author_id, author_label, content, created_at, image_path, message_type')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const mapped = data.map((row: any) => mapRemoteMessage(row as DMMessageRow, currentUserId));
      return resolveChatImageMessages(mapped);
    }

    if (error?.message?.includes('image_path') || error?.message?.includes('message_type')) {
      const fallback = await supabase
        .from('dm_messages')
        .select('id, channel_id, author_id, author_label, content, created_at')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });
      if (!fallback.error && fallback.data) {
        const mapped = fallback.data.map((row: any) => mapRemoteMessage(row as DMMessageRow, currentUserId));
        return resolveChatImageMessages(mapped);
      }
      throw createSupabaseError('Supabase DM messages fetch failed', fallback.error);
    }

    throw createSupabaseError('Supabase DM messages fetch failed', error);
  }

  await loadChannels();
  const channel = channelStore.get(channelId);
  return channel?.messages ?? [];
}

export async function getDMMessagesSince(
  channelId: string,
  currentUserId: string | undefined,
  sinceIso: string,
): Promise<ChatMessage[]> {
  if (currentUserId && canUseSupabase(currentUserId) && supabase) {
    const { data, error } = await supabase
      .from('dm_messages')
      .select('id, channel_id, author_id, author_label, content, created_at, image_path, message_type')
      .eq('channel_id', channelId)
      .gt('created_at', sinceIso)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const mapped = data.map((row: any) => mapRemoteMessage(row as DMMessageRow, currentUserId));
      return resolveChatImageMessages(mapped);
    }

    if (error?.message?.includes('image_path') || error?.message?.includes('message_type')) {
      const fallback = await supabase
        .from('dm_messages')
        .select('id, channel_id, author_id, author_label, content, created_at')
        .eq('channel_id', channelId)
        .gt('created_at', sinceIso)
        .order('created_at', { ascending: true });
      if (!fallback.error && fallback.data) {
        const mapped = fallback.data.map((row: any) => mapRemoteMessage(row as DMMessageRow, currentUserId));
        return resolveChatImageMessages(mapped);
      }
      throw createSupabaseError('Supabase DM messages fetch failed', fallback.error);
    }

    throw createSupabaseError('Supabase DM messages fetch failed', error);
  }

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

export function subscribeToDMMessages(currentUserId: string, listener: DMListener): () => void {
  listeners.add(listener);

  if (canUseSupabase(currentUserId) && supabase) {
    if (!realtimeChannel || realtimeUserId !== currentUserId) {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
      }
      realtimeUserId = currentUserId;
      realtimeChannel = supabase.channel(`dm-messages:${currentUserId}`);
      realtimeChannel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages' }, (payload: any) => {
          const row = payload.new as DMMessageRow;
          resolveChatImageMessage(mapRemoteMessage(row, currentUserId))
            .then((message) => {
              listeners.forEach((cb) => cb(row.channel_id, message));
            })
            .catch((error) => {
              console.warn('Failed to resolve chat image URL:', error);
              const fallback = mapRemoteMessage(row, currentUserId);
              listeners.forEach((cb) => cb(row.channel_id, fallback));
            });
        })
        .subscribe();
    }
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && realtimeChannel && supabase) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
      realtimeUserId = null;
    }
  };
}

export function dmChannelToChatThread(channel: StoredDMChannel, currentUserId: string): ChatThread {
  const otherUserIndex = channel.participants[0] === currentUserId ? 1 : 0;
  const otherUserName = channel.participantNames[otherUserIndex];
  const messageFromStore = channel.messages?.[channel.messages.length - 1];
  const rawLastText = channel.lastMessageText ?? messageFromStore?.content ?? 'Start a conversation';
  const lastText = decodeChatImageContent(rawLastText) ? 'Photo' : rawLastText;
  const lastTs =
    channel.lastMessageAt ??
    channel.createdAt ??
    new Date().toISOString();
  const lastAuthor =
    channel.lastMessageAuthorName ??
    messageFromStore?.author ??
    'System';

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

// Initialize on import
loadChannels();
