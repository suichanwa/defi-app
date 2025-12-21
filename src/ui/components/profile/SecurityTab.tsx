import React, { useMemo } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createProfileStyles } from '@styles/ProfileStyles';
import type { EncryptedWalletKey } from '@app-types/wallet';
import { useTheme } from '@theme/ThemeProvider';
import ProfileHeader from '@components/profile/ProfileHeader';

type SecurityTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
  walletKey: EncryptedWalletKey | null;
  setupPassword: string;
  setupConfirm: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  securityMessage: string | null;
  securityError: string | null;
  onChangeSetupPassword: (value: string) => void;
  onChangeSetupConfirm: (value: string) => void;
  onChangeCurrentPassword: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onCreateWalletKey: () => void;
  onChangePassword: () => void;
};

export default function SecurityTab({
  scrollStyle,
  cardStyle,
  onBack,
  walletKey,
  setupPassword,
  setupConfirm,
  currentPassword,
  newPassword,
  confirmPassword,
  securityMessage,
  securityError,
  onChangeSetupPassword,
  onChangeSetupConfirm,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onCreateWalletKey,
  onChangePassword,
}: SecurityTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title="Security" onBack={onBack} />
      <View style={cardStyle}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Wallet key status</Text>
          <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.accent} />
        </View>
        <Text style={styles.cardSubtitle}>
          {walletKey ? 'Encrypted key stored locally.' : 'No encrypted wallet key found.'}
        </Text>
        {walletKey && (
          <>
            <Text style={styles.metaText}>Wallet id: {walletKey.id}</Text>
            <Text style={styles.metaText}>Updated: {new Date(walletKey.updatedAt).toLocaleString()}</Text>
          </>
        )}
      </View>

      {!walletKey ? (
        <View style={cardStyle}>
          <Text style={styles.cardTitle}>Create local wallet key</Text>
          <Text style={styles.cardSubtitle}>Set a password to encrypt a new local key.</Text>
          <TextInput
            value={setupPassword}
            onChangeText={onChangeSetupPassword}
            placeholder="New password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
          />
          <TextInput
            value={setupConfirm}
            onChangeText={onChangeSetupConfirm}
            placeholder="Confirm password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
          />
          <TouchableOpacity style={styles.primaryButton} onPress={onCreateWalletKey} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Create encrypted key</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={cardStyle}>
          <Text style={styles.cardTitle}>Change wallet password</Text>
          <TextInput
            value={currentPassword}
            onChangeText={onChangeCurrentPassword}
            placeholder="Current password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
          />
          <TextInput
            value={newPassword}
            onChangeText={onChangeNewPassword}
            placeholder="New password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
          />
          <TextInput
            value={confirmPassword}
            onChangeText={onChangeConfirmPassword}
            placeholder="Confirm new password"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            secureTextEntry
          />
          <TouchableOpacity style={styles.primaryButton} onPress={onChangePassword} activeOpacity={0.9}>
            <Text style={styles.primaryButtonText}>Update password</Text>
          </TouchableOpacity>
        </View>
      )}

      {securityError && <Text style={styles.errorText}>{securityError}</Text>}
      {securityMessage && <Text style={styles.successText}>{securityMessage}</Text>}
    </ScrollView>
  );
}
