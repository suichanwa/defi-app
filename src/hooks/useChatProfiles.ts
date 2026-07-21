import { useEffect, useMemo, useRef, useState } from 'react';
import type { AvatarType } from '../types/profile';
import type { ChatAuthorProfile } from '../types/securechat-types/secureChat';
import { isSupabaseConfigured, supabase } from '../services/supabaseClient';

type ProfileRow = {
  id: string;
  alias: string | null;
  avatar_type: string | null;
  avatar_url: string | null;
  avatar_seed: string | null;
  updated_at: string | null;
};

type UseChatProfilesArgs = {
  authorIds: string[];
  enabled?: boolean;
};

const PROFILE_REFRESH_MS = 30_000;

const chunk = <T,>(items: T[], size: number) => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
};

const mapRowToProfile = (row: ProfileRow): ChatAuthorProfile => ({
  id: row.id,
  alias: row.alias ?? undefined,
  avatarType: (row.avatar_type as AvatarType) ?? undefined,
  avatarUri: row.avatar_url ?? undefined,
  avatarSeed: row.avatar_seed ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

export function useChatProfiles({ authorIds, enabled = true }: UseChatProfilesArgs) {
  const [profilesById, setProfilesById] = useState<Record<string, ChatAuthorProfile>>({});
  const [refreshTick, setRefreshTick] = useState(0);
  const inFlight = useRef<Set<string>>(new Set());
  const lastFetchedAtRef = useRef<Record<string, number>>({});

  const uniqueIds = useMemo(() => {
    const next = new Set(authorIds.filter(Boolean));
    return Array.from(next);
  }, [authorIds]);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, PROFILE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [enabled]);

  useEffect(() => {
    const supabaseClient = supabase;
    if (!enabled || !isSupabaseConfigured || !supabaseClient) return;
    const now = Date.now();
    const pending = uniqueIds.filter((id) => {
      if (inFlight.current.has(id)) return false;
      if (!profilesById[id]) return true;
      const lastFetchedAt = lastFetchedAtRef.current[id] ?? 0;
      return now - lastFetchedAt >= PROFILE_REFRESH_MS;
    });
    if (pending.length === 0) return;

    let active = true;
    const batches = chunk(pending, 50);

    const fetchProfiles = async () => {
      try {
        for (const ids of batches) {
          ids.forEach((id) => inFlight.current.add(id));
          const { data, error } = await supabaseClient
            .from('user_profiles')
            .select('id, alias, avatar_type, avatar_url, avatar_seed, updated_at')
            .in('id', ids);
          ids.forEach((id) => inFlight.current.delete(id));
          if (!active) return;
          ids.forEach((id) => {
            lastFetchedAtRef.current[id] = Date.now();
          });
          if (error || !data) continue;
          setProfilesById((prev) => {
            const next = { ...prev };
            data.forEach((row) => {
              next[row.id] = mapRowToProfile(row as ProfileRow);
            });
            return next;
          });
        }
      } catch (fetchError) {
        batches.flat().forEach((id) => inFlight.current.delete(id));
        // Gracefully ignore transient network/CORS issues
      }
    };

    fetchProfiles();
    return () => {
      active = false;
    };
  }, [enabled, profilesById, refreshTick, uniqueIds]);

  return { profilesById };
}
