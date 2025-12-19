import React, { useMemo } from 'react';
import { ScrollView, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { createProfileStyles } from '../../styles/ProfileStyles';
import { useTheme } from '../../theme/ThemeProvider';

type ProfileHomeTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  profileSource: 'local' | 'supabase';
  onOpenPersonalization: () => void;
  onOpenAuth: () => void;
  onOpenSecurity: () => void;
  onOpenRewards: () => void;
  onOpenLocalization: () => void;
  onOpenDeveloper: () => void;
  onOpenAbout: () => void;
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
  onOpenLocalization,
  onOpenDeveloper,
  onOpenAbout,
  buildLabel,
}: ProfileHomeTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <View style={styles.titleBlock}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={styles.headerTitle}>Profile</Text>
            <Text style={styles.cardSubtitle}>Manage how your account feels and stays secure.</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{buildLabel}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={cardStyle} onPress={onOpenPersonalization} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="color-palette-outline" size={22} color="#4f46e5" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Personalization</Text>
            <Text style={styles.cardSubtitle}>
              Alias, avatar, and theme preferences. Source: {profileSource === 'supabase' ? 'Supabase' : 'Local'}.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenAuth} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="log-in-outline" size={22} color="#4f46e5" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Account access</Text>
            <Text style={styles.cardSubtitle}>Create an account, sign in, and update password.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenSecurity} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <MaterialCommunityIcons name="shield-lock-outline" size={22} color="#4f46e5" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Security</Text>
            <Text style={styles.cardSubtitle}>Change wallet password and verify keys.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>

    <TouchableOpacity style={cardStyle} onPress={onOpenRewards} activeOpacity={0.85}>
      <View style={styles.cardRow}>
        <View style={styles.cardIcon}>
          <Ionicons name="gift-outline" size={22} color="#4f46e5" />
        </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>RewardsHub</Text>
            <Text style={styles.cardSubtitle}>Track points and recent activity.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenLocalization} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="language-outline" size={22} color="#4f46e5" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Languages</Text>
            <Text style={styles.cardSubtitle}>Choose English, Русский, or Română.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenDeveloper} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="code-slash-outline" size={22} color="#4f46e5" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Developer</Text>
            <Text style={styles.cardSubtitle}>Debug tools, local resets, and account actions.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={cardStyle} onPress={onOpenAbout} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="information-circle-outline" size={22} color="#4f46e5" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>About app</Text>
            <Text style={styles.cardSubtitle}>What this project is about.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}
