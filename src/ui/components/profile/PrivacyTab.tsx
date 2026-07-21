import React, { useMemo } from 'react';
import {
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createProfileStyles } from '@styles/ProfileStyles';
import type { EncryptedWalletKey } from '@app-types/wallet';
import { useTheme } from '@theme/ThemeProvider';
import ProfileHeader from '@components/profile/ProfileHeader';

type PrivacyTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
  walletKey: EncryptedWalletKey | null;
  setupPassword: string;
  setupConfirm: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  privacyMessage: string | null;
  privacyError: string | null;
  biometricUnlockEnabled: boolean;
  onChangeBiometricUnlockEnabled: (value: boolean) => void;
  onChangeSetupPassword: (value: string) => void;
  onChangeSetupConfirm: (value: string) => void;
  onChangeCurrentPassword: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onCreateWalletKey: () => void;
  onChangePassword: () => void;
};

export default function PrivacyTab({
  scrollStyle,
  cardStyle,
  onBack,
  walletKey,
  setupPassword,
  setupConfirm,
  currentPassword,
  newPassword,
  confirmPassword,
  privacyMessage,
  privacyError,
  biometricUnlockEnabled,
  onChangeBiometricUnlockEnabled,
  onChangeSetupPassword,
  onChangeSetupConfirm,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  onCreateWalletKey,
  onChangePassword,
}: PrivacyTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);
  const privacyStyles = useMemo(() => createPrivacyStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title="Privacy" onBack={onBack} />

      <View style={cardStyle}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Wallet privacy</Text>
          <MaterialCommunityIcons name="shield-lock-outline" size={20} color={colors.accent} />
        </View>
        <Text style={styles.cardSubtitle}>
          {walletKey ? 'Encrypted key stored locally.' : 'No encrypted wallet key found.'}
        </Text>
        {walletKey ? (
          <>
            <Text style={styles.metaText}>Wallet id: {walletKey.id}</Text>
            <Text style={styles.metaText}>Updated: {new Date(walletKey.updatedAt).toLocaleString()}</Text>
          </>
        ) : null}
      </View>

      <View style={cardStyle}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Chat settings</Text>
          <MaterialCommunityIcons name="message-settings-outline" size={20} color={colors.accent} />
        </View>
        <Text style={styles.cardSubtitle}>Manage how chat data is shared.</Text>

        <View style={privacyStyles.settingRow}>
          <View style={privacyStyles.settingTextBlock}>
            <Text style={privacyStyles.settingTitle}>Disable sharing</Text>
            <Text style={privacyStyles.settingSubtitle}>Coming soon. This control is present for layout only.</Text>
          </View>
          <Switch value={false} disabled />
        </View>
      </View>

      <View style={cardStyle}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Wallet unlock</Text>
          <MaterialCommunityIcons name="fingerprint" size={20} color={colors.accent} />
        </View>
        <Text style={styles.cardSubtitle}>Use biometrics to unlock the wallet faster.</Text>

        <View style={privacyStyles.settingRow}>
          <View style={privacyStyles.settingTextBlock}>
            <Text style={privacyStyles.settingTitle}>Biometric unlock</Text>
            <Text style={privacyStyles.settingSubtitle}>
              When off, the wallet uses passcode only and never shows fingerprint or Face ID.
            </Text>
          </View>
          <Switch
            value={biometricUnlockEnabled}
            onValueChange={onChangeBiometricUnlockEnabled}
            thumbColor={colors.accent}
            trackColor={{ false: '#334155', true: colors.accent }}
          />
        </View>
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

      {privacyError ? <Text style={styles.errorText}>{privacyError}</Text> : null}
      {privacyMessage ? <Text style={styles.successText}>{privacyMessage}</Text> : null}
    </ScrollView>
  );
}

const createPrivacyStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    settingRow: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    settingTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    settingSubtitle: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      color: colors.muted,
    },
  });
