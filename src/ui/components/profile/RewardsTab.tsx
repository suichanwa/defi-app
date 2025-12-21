import React, { useMemo } from 'react';
import { ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { createProfileStyles } from '@styles/ProfileStyles';
import type { RewardActivity, RewardsSummary } from '@app-types/rewards';
import { useTheme } from '@theme/ThemeProvider';
import ProfileHeader from '@components/profile/ProfileHeader';

type RewardsTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
  rewardsSummary: RewardsSummary | null;
  rewardsSource: 'local' | 'supabase';
  effectiveUserId: string | null;
  rules: string[];
  rewardsActivity: RewardActivity[];
};

export default function RewardsTab({
  scrollStyle,
  cardStyle,
  onBack,
  rewardsSummary,
  rewardsSource,
  effectiveUserId,
  rules,
  rewardsActivity,
}: RewardsTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title="RewardsHub" onBack={onBack} />
      <View style={cardStyle}>
        <Text style={styles.cardTitle}>Rewards balance</Text>
        <Text style={styles.pointsValue}>{rewardsSummary?.points ?? 0} pts</Text>
        <Text style={styles.metaText}>Tier: {rewardsSummary?.tier ?? 'bronze'}</Text>
        <Text style={styles.metaText}>
          Source: {rewardsSource === 'supabase' ? 'Supabase' : 'Local mock data'}
          {effectiveUserId ? ` Aú User: ${effectiveUserId.slice(0, 8)}` : ''}
        </Text>
      </View>

      <View style={cardStyle}>
        <Text style={styles.cardTitle}>How points are earned</Text>
        {rules.map((rule) => (
          <Text key={rule} style={styles.listItem}>
            - {rule}
          </Text>
        ))}
      </View>

      <View style={cardStyle}>
        <Text style={styles.cardTitle}>Recent activity</Text>
        {rewardsActivity.length === 0 ? (
          <Text style={styles.cardSubtitle}>No activity yet.</Text>
        ) : (
          rewardsActivity.map((item) => (
            <View key={item.id} style={styles.activityRow}>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.description}</Text>
                <Text style={styles.metaText}>{new Date(item.timestamp).toLocaleString()}</Text>
              </View>
              <Text style={styles.pointsDelta}>{item.pointsDelta > 0 ? `+${item.pointsDelta}` : item.pointsDelta}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
