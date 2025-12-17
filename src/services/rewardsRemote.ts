import type { RewardActivity, RewardsSummary } from '../types/rewards';
import { supabase } from './supabaseClient';

type RewardsSummaryRow = {
  points: number;
  tier: RewardsSummary['tier'];
  updated_at: string;
};

type RewardsActivityRow = {
  id: string;
  title: string;
  description: string;
  points_delta: number;
  timestamp: string;
};

export async function fetchRewardsSummary(userId: string): Promise<RewardsSummary | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('rewards_summary')
    .select('points, tier, updated_at')
    .eq('user_id', userId)
    .maybeSingle<RewardsSummaryRow>();

  if (error || !data) return null;

  return {
    points: data.points,
    tier: data.tier,
    updatedAt: data.updated_at,
  };
}

export async function fetchRewardsActivity(userId: string): Promise<RewardActivity[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('rewards_activity')
    .select('id, title, description, points_delta, timestamp')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(10)
    .returns<RewardsActivityRow[]>();

  if (error || !data) return null;

  return data.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    pointsDelta: item.points_delta,
    timestamp: item.timestamp,
  }));
}
