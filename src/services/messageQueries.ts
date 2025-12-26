import type { SecureChatMessageRow } from '@app-types/secureChatScreen';
import { isSupabaseConfigured, supabase } from './supabaseClient';

type SelectMessagesPageArgs = {
  roomId: string;
  beforeCreatedAt?: string;
  limit: number;
};

type SelectMessagesPageResult = {
  data: SecureChatMessageRow[];
  error: { message?: string } | null;
};

const FIELD_VARIANTS = [
  'id, room_id, author, author_id, content, created_at, image_path, message_type',
  'id, room_id, author, author_id, content, created_at',
  'id, room_id, author, content, created_at, image_path, message_type',
  'id, room_id, author, content, created_at',
];

export async function selectMessagesPage({
  roomId,
  beforeCreatedAt,
  limit,
}: SelectMessagesPageArgs): Promise<SelectMessagesPageResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { data: [], error: { message: 'Supabase is not configured.' } };
  }

  let lastError: { message?: string } | null = null;

  for (const fields of FIELD_VARIANTS) {
    let query = supabase
      .from('messages')
      .select(fields)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (beforeCreatedAt) {
      query = query.lt('created_at', beforeCreatedAt);
    }

    const { data, error } = await query;
    if (!error && data) {
      return { data: data as SecureChatMessageRow[], error: null };
    }

    lastError = error ?? { message: 'Unknown query error.' };
  }

  return { data: [], error: lastError };
}
