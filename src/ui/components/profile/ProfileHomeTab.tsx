import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createProfileStyles } from '@styles/ProfileStyles';
import { useTheme } from '@theme/ThemeProvider';

type ProfileHomeTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  profileSource: 'local' | 'supabase';
  onOpenPersonalization: () => void;
  onOpenAuth: () => void;
  onOpenSecurity: () => void;
  onOpenRewards: () => void;
  onOpenTransactionHistory: () => void;
  onOpenLocalization: () => void;
  onOpenDeveloper?: () => void;
  showDeveloper?: boolean;
  onOpenAbout: () => void;
  onOpenChangelog: () => void;
  buildLabel: string;
};

export default function ProfileHomeTab({
  scrollStyle,
  cardStyle,
  profileSource,
  onOpenPersonalization,
  onOpenAuth,
  onOpenSecurity,
  onOpenRewards,
  onOpenTransactionHistory,
  onOpenLocalization,
  onOpenDeveloper,
  showDeveloper = true,
  onOpenAbout,
  onOpenChangelog,
  buildLabel,
}: ProfileHomeTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <View style={styles.titleBlock}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <View style={{ flexShrink: 1, paddingRight: 12 }}>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.cardSubtitle}>Manage how your account feels and stays secure.</Text>
          </View>
          <View style={[styles.pill, { alignSelf: 'flex-start', marginTop: 8 }]}>
            <Text style={styles.pillText}>{buildLabel}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={cardStyle} onPress={onOpenPersonalization} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="color-palette-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Personalization</Text>
            <Text style={styles.cardSubtitle}>
              Alias, avatar, and theme preferences. Source: {profileSource === 'supabase' ? 'Supabase' : 'Local'}.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenAuth} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="log-in-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Account access</Text>
            <Text style={styles.cardSubtitle}>Create an account, sign in, and update password.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenSecurity} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <MaterialCommunityIcons name="shield-lock-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Security</Text>
            <Text style={styles.cardSubtitle}>Change wallet password and verify keys.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenRewards} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="gift-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>RewardsHub</Text>
            <Text style={styles.cardSubtitle}>Track points and recent activity.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenTransactionHistory} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="receipt-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Transaction history</Text>
            <Text style={styles.cardSubtitle}>Review recent wallet activity.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenLocalization} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="language-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Languages</Text>
            <Text style={styles.cardSubtitle}>Choose English, Русский, or Română.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>

      {showDeveloper && onOpenDeveloper ? (
        <TouchableOpacity style={cardStyle} onPress={onOpenDeveloper} activeOpacity={0.85}>
          <View style={styles.cardRow}>
            <View style={styles.cardIcon}>
              <Ionicons name="code-slash-outline" size={22} color={colors.accent} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>Developer</Text>
              <Text style={styles.cardSubtitle}>Debug tools, local resets, and account actions.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </View>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={cardStyle} onPress={onOpenAbout} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="information-circle-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>About app</Text>
            <Text style={styles.cardSubtitle}>What this project is about.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenChangelog} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="list-outline" size={22} color={colors.accent} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Changelog</Text>
            <Text style={styles.cardSubtitle}>Latest updates and recent changes.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.muted} />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}
