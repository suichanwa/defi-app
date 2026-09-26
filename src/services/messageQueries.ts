import type { SecureChatMessageRow } from '@app-types/securechat-types/secureChatScreen';
import { getJson, setJson } from './storage';

type SelectMessagesPageArgs = {
  roomId: string;
  beforeCreatedAt?: string;
  limit: number;
};

type SelectMessagesPageResult = {
  data: SecureChatMessageRow[];
  error: { message?: string } | null;
};

const ROOM_MESSAGES_KEY_PREFIX = 'room.messages.v1.';

export async function selectMessagesPage({
  roomId,
  beforeCreatedAt,
  limit,
}: SelectMessagesPageArgs): Promise<SelectMessagesPageResult> {
  try {
    const key = `${ROOM_MESSAGES_KEY_PREFIX}${roomId}`;
    const stored = (await getJson<SecureChatMessageRow[]>(key)) ?? [];
    let filtered = stored;
    if (beforeCreatedAt) {
      filtered = filtered.filter((m) => (m.created_at ?? '') < beforeCreatedAt);
    }
    const sorted = [...filtered].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
    const page = sorted.slice(0, limit);
    return { data: page, error: null };
  } catch (error) {
    return { data: [], error: { message: error instanceof Error ? error.message : 'Storage error' } };
  }
}

export async function saveLocalRoomMessage(roomId: string, message: SecureChatMessageRow): Promise<void> {
  try {
    const key = `${ROOM_MESSAGES_KEY_PREFIX}${roomId}`;
    const stored = (await getJson<SecureChatMessageRow[]>(key)) ?? [];
    const next = [...stored.filter((m) => m.id !== message.id), message];
    await setJson(key, next);
  } catch (error) {
    console.warn('Failed to save room message locally:', error);
  }
}

export async function deleteLocalRoomMessage(roomId: string, messageId: string): Promise<void> {
  try {
    const key = `${ROOM_MESSAGES_KEY_PREFIX}${roomId}`;
    const stored = (await getJson<SecureChatMessageRow[]>(key)) ?? [];
    const next = stored.filter((m) => m.id !== messageId);
    await setJson(key, next);
  } catch (error) {
    console.warn('Failed to delete room message locally:', error);
  }
}

