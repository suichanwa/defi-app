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

export async function fetchRewardsSummary(_userId: string): Promise<RewardsSummary | null> {
  return null;
}

export async function fetchRewardsActivity(_userId: string): Promise<RewardActivity[] | null> {
  return null;
}

export async function upsertRewardsSummary(_userId: string, _summary: RewardsSummary): Promise<void> {
  return;
}

export async function insertRewardsActivity(_userId: string, _activity: RewardActivity[]): Promise<void> {
  return;
}

