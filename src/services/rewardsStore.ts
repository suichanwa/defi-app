import type { RewardActivity, RewardsSummary } from '../types/rewards';
import { getJson, removeKey, setJson } from './storage';

const SUMMARY_KEY = 'rewards.summary.v1';
const ACTIVITY_KEY = 'rewards.activity.v1';

const defaultSummary = (): RewardsSummary => ({
  points: 1280,
  tier: 'silver',
  updatedAt: new Date().toISOString(),
});

const defaultActivity = (): RewardActivity[] => [
  {
    id: 'reward-1',
    title: 'Secure chat streak',
    description: 'Completed 7 days of secure messaging.',
    pointsDelta: 120,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 'reward-2',
    title: 'Wallet backup verified',
    description: 'Saved encrypted wallet key locally.',
    pointsDelta: 200,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
  },
  {
    id: 'reward-3',
    title: 'Profile personalization',
    description: 'Updated alias and avatar preference.',
    pointsDelta: 80,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

export async function loadRewardsSummary(): Promise<RewardsSummary> {
  const stored = await getJson<RewardsSummary>(SUMMARY_KEY);
  if (!stored) {
    const defaults = defaultSummary();
    await setJson(SUMMARY_KEY, defaults);
    return defaults;
  }
  return stored;
}

export async function loadRewardsActivity(): Promise<RewardActivity[]> {
  const stored = await getJson<RewardActivity[]>(ACTIVITY_KEY);
  if (!stored) {
    const defaults = defaultActivity();
    await setJson(ACTIVITY_KEY, defaults);
    return defaults;
  }
  return stored;
}

export async function saveRewardsSummary(next: RewardsSummary): Promise<void> {
  await setJson(SUMMARY_KEY, next);
}

export async function saveRewardsActivity(next: RewardActivity[]): Promise<void> {
  await setJson(ACTIVITY_KEY, next);
}

export async function clearRewardsCache(): Promise<void> {
  await Promise.all([removeKey(SUMMARY_KEY), removeKey(ACTIVITY_KEY)]);
}
