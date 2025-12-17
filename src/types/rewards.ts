export type RewardsSummary = {
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  updatedAt: string;
};

export type RewardActivity = {
  id: string;
  title: string;
  description: string;
  pointsDelta: number;
  timestamp: string;
};
