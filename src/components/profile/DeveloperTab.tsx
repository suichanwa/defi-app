import React from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileStyles as styles } from '../../styles/ProfileStyles';
import ProfileHeader from './ProfileHeader';

type DeveloperTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
  hasSession: boolean;
  isBusy: boolean;
  developerMessage: string | null;
  developerError: string | null;
  onRefreshData: () => void;
  onClearWallet: () => void;
  onResetProfile: () => void;
  onClearRewards: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => void;
};

const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Confirm', style: 'destructive', onPress: onConfirm },
  ]);
};

export default function DeveloperTab({
  scrollStyle,
  cardStyle,
  onBack,
  hasSession,
  isBusy,
  developerMessage,
  developerError,
  onRefreshData,
  onClearWallet,
  onResetProfile,
  onClearRewards,
  onSignOut,
  onDeleteAccount,
}: DeveloperTabProps) {
  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title="Developer" onBack={onBack} />

      <View style={cardStyle}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Debug tools</Text>
          <Ionicons name="bug-outline" size={20} color="#4f46e5" />
        </View>
        <Text style={styles.cardSubtitle}>Refresh local state and cached data.</Text>
        <TouchableOpacity
          style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
          onPress={onRefreshData}
          activeOpacity={0.9}
          disabled={isBusy}
        >
          <Text style={styles.secondaryButtonText}>Reload profile data</Text>
        </TouchableOpacity>
      </View>

      <View style={cardStyle}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Local resets</Text>
          <Ionicons name="trash-outline" size={20} color="#f97316" />
        </View>
        <Text style={styles.cardSubtitle}>These actions wipe local data on this device.</Text>
        <TouchableOpacity
          style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
          onPress={() =>
            confirmAction('Forget wallet key', 'Remove the encrypted wallet key from this device?', onClearWallet)
          }
          activeOpacity={0.9}
          disabled={isBusy}
        >
          <Text style={styles.secondaryButtonText}>Forget wallet password</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
          onPress={() =>
            confirmAction('Reset profile settings', 'Clear local profile preferences?', onResetProfile)
          }
          activeOpacity={0.9}
          disabled={isBusy}
        >
          <Text style={styles.secondaryButtonText}>Reset profile settings</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, isBusy && styles.buttonDisabled]}
          onPress={() =>
            confirmAction('Clear rewards cache', 'Reset locally cached rewards data?', onClearRewards)
          }
          activeOpacity={0.9}
          disabled={isBusy}
        >
          <Text style={styles.secondaryButtonText}>Clear rewards cache</Text>
        </TouchableOpacity>
      </View>

      <View style={cardStyle}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Account controls</Text>
          <Ionicons name="warning-outline" size={20} color="#ef4444" />
        </View>
        <Text style={styles.cardSubtitle}>
          Deleting the account requires backend support. These actions sign out and clear local data.
        </Text>
        <TouchableOpacity
          style={[styles.secondaryButton, (isBusy || !hasSession) && styles.buttonDisabled]}
          onPress={onSignOut}
          activeOpacity={0.9}
          disabled={isBusy || !hasSession}
        >
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, (isBusy || !hasSession) && styles.buttonDisabled]}
          onPress={() =>
            confirmAction(
              'Delete account',
              'This will sign you out and clear local data. Remote deletion is not automatic.',
              onDeleteAccount,
            )
          }
          activeOpacity={0.9}
          disabled={isBusy || !hasSession}
        >
          <Text style={styles.secondaryButtonText}>Delete account (local)</Text>
        </TouchableOpacity>
        {!hasSession && <Text style={styles.hint}>Sign in to manage account actions.</Text>}
      </View>

      {developerError && <Text style={styles.errorText}>{developerError}</Text>}
      {developerMessage && <Text style={styles.successText}>{developerMessage}</Text>}
    </ScrollView>
  );
}
