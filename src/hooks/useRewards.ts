import { useCallback, useEffect, useState } from 'react';
import type { RewardActivity, RewardsSummary } from '@app-types/rewards';
import {
  clearRewardsCache,
  fetchRewardsActivity,
  fetchRewardsSummary,
  getAnonymousId,
  isSupabaseConfigured,
  loadRewardsActivity,
  loadRewardsSummary,
} from '@services';
import type { AuthSession } from '@services';
import type { LocalSession } from '@hooks/useProfileAuth';

type RewardsState = {
  rewardsSummary: RewardsSummary | null;
  rewardsActivity: RewardActivity[];
  rewardsSource: 'local' | 'supabase';
  effectiveUserId: string | null;
};

type RewardsStatus = {
  loading: boolean;
  error: string | null;
};

const initialState: RewardsState = {
  rewardsSummary: null,
  rewardsActivity: [],
  rewardsSource: 'local',
  effectiveUserId: null,
};

const initialStatus: RewardsStatus = {
  loading: false,
  error: null,
};

export function useRewards({ session }: { session: AuthSession | LocalSession | null }) {
  const [state, setState] = useState<RewardsState>(initialState);
  const [status, setStatus] = useState<RewardsStatus>(initialStatus);

  const load = useCallback(
    async (isActive: () => boolean) => {
      setStatus({ loading: true, error: null });
      try {
        const currentUserId = session?.user?.id ?? (await getAnonymousId());
        if (!isActive()) return;
        const useSupabaseRewards = Boolean(isSupabaseConfigured && session?.user?.id);
        const [remoteSummary, remoteActivity] = await Promise.all([
          useSupabaseRewards ? fetchRewardsSummary(currentUserId) : Promise.resolve(null),
          useSupabaseRewards ? fetchRewardsActivity(currentUserId) : Promise.resolve(null),
        ]);
        const [localSummary, localActivity] = await Promise.all([loadRewardsSummary(), loadRewardsActivity()]);

        setState({
          rewardsSummary: remoteSummary ?? localSummary,
          rewardsActivity: remoteActivity ?? localActivity,
          rewardsSource: remoteSummary || remoteActivity ? 'supabase' : 'local',
          effectiveUserId: currentUserId,
        });
        setStatus({ loading: false, error: null });
      } catch (error) {
        if (!isActive()) return;
        setStatus({ loading: false, error: error instanceof Error ? error.message : 'Unable to load rewards.' });
      }
    },
    [session],
  );

  useEffect(() => {
    let mounted = true;
    load(() => mounted);
    return () => {
      mounted = false;
    };
  }, [load]);

  const refresh = () => load(() => true);

  const clearCacheAndRefresh = async () => {
    setStatus({ loading: true, error: null });
    try {
      await clearRewardsCache();
      await refresh();
    } catch (error) {
      setStatus({ loading: false, error: error instanceof Error ? error.message : 'Unable to clear rewards cache.' });
    }
  };

  return {
    state,
    status,
    actions: {
      refresh,
      clearCache: clearCacheAndRefresh,
    },
  };
}
