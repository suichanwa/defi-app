import React, { useEffect, useMemo, useRef } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createProfileStyles } from '@styles/ProfileStyles';
import type { AuthSession } from '@services/auth';
import type { LocalSession } from '@hooks/useProfileAuth';
import { useTheme } from '@theme/ThemeProvider';
import ProfileHeader from '@components/profile/ProfileHeader';

type AuthTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
  session: AuthSession | LocalSession | null;
  authEmail: string;
  authPassword: string;
  accountPassword: string;
  accountConfirm: string;
  authMessage: string | null;
  authError: string | null;
  authLoading: boolean;
  onChangeAuthEmail: (value: string) => void;
  onChangeAuthPassword: (value: string) => void;
  onChangeAccountPassword: (value: string) => void;
  onChangeAccountConfirm: (value: string) => void;
  onSignUp: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onUpdateAccountPassword: () => void;
  onSignInAnonymously: () => void;
};

export default function AuthTab({
  scrollStyle,
  cardStyle,
  onBack,
  session,
  authEmail,
  authPassword,
  accountPassword,
  accountConfirm,
  authMessage,
  authError,
  authLoading,
  onChangeAuthEmail,
  onChangeAuthPassword,
  onChangeAccountPassword,
  onChangeAccountConfirm,
  onSignUp,
  onSignIn,
  onSignOut,
  onUpdateAccountPassword,
  onSignInAnonymously,
}: AuthTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authMessage || authMessage === lastMessageRef.current) return;
    const normalized = authMessage.toLowerCase();
    if (normalized.includes('account created')) {
      Alert.alert('Account created', 'Local-only account created on this device.');
    }
    lastMessageRef.current = authMessage;
  }, [authMessage]);

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title="Account access" onBack={onBack} />
      <View style={cardStyle}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Account access</Text>
          <Ionicons name="lock-closed-outline" size={20} color={colors.accent} />
        </View>
        {session ? (
          <Text style={styles.cardSubtitle}>
            Active local session ({session.user.id.slice(0, 8)}...)
          </Text>
        ) : (
          <>
            <Text style={styles.cardSubtitle}>
              Serverless mode — identity and wallet keys are stored locally on device.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, authLoading && styles.buttonDisabled]}
              onPress={onSignInAnonymously}
              activeOpacity={0.9}
              disabled={authLoading}
            >
              <Text style={styles.primaryButtonText}>Create local session</Text>
            </TouchableOpacity>
          </>
        )}
        {authError && <Text style={styles.errorText}>{authError}</Text>}
        {authMessage && <Text style={styles.successText}>{authMessage}</Text>}
      </View>
    </ScrollView>
  );
}
