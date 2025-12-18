import React from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileStyles as styles } from '../../styles/ProfileStyles';
import type { AuthSession } from '../../services/auth';
import { isSupabaseConfigured } from '../../services/supabaseClient';
import ProfileHeader from './ProfileHeader';

type AuthTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
  session: AuthSession;
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
}: AuthTabProps) {
  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title="Account access" onBack={onBack} />
      <View style={cardStyle}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>Supabase auth</Text>
          <Ionicons name="lock-closed-outline" size={20} color="#4f46e5" />
        </View>
        {!isSupabaseConfigured ? (
          <Text style={styles.cardSubtitle}>Supabase auth is not configured.</Text>
        ) : session ? (
          <>
            <Text style={styles.cardSubtitle}>Signed in as {session.user.email ?? 'Unknown email'}.</Text>
            <TouchableOpacity
              style={[styles.secondaryButton, authLoading && styles.buttonDisabled]}
              onPress={onSignOut}
              activeOpacity={0.9}
              disabled={authLoading}
            >
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </TouchableOpacity>
            <View style={styles.divider} />
            <Text style={styles.cardTitle}>Update account password</Text>
            <TextInput
              value={accountPassword}
              onChangeText={onChangeAccountPassword}
              placeholder="New account password"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              secureTextEntry
            />
            <TextInput
              value={accountConfirm}
              onChangeText={onChangeAccountConfirm}
              placeholder="Confirm new password"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.primaryButton, authLoading && styles.buttonDisabled]}
              onPress={onUpdateAccountPassword}
              activeOpacity={0.9}
              disabled={authLoading}
            >
              <Text style={styles.primaryButtonText}>Update account password</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.cardSubtitle}>Create an account or sign in.</Text>
            <TextInput
              value={authEmail}
              onChangeText={onChangeAuthEmail}
              placeholder="Email"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              value={authPassword}
              onChangeText={onChangeAuthPassword}
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              secureTextEntry
            />
            <TouchableOpacity
              style={[styles.primaryButton, authLoading && styles.buttonDisabled]}
              onPress={onSignUp}
              activeOpacity={0.9}
              disabled={authLoading}
            >
              <Text style={styles.primaryButtonText}>Create account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, authLoading && styles.buttonDisabled]}
              onPress={onSignIn}
              activeOpacity={0.9}
              disabled={authLoading}
            >
              <Text style={styles.secondaryButtonText}>Sign in</Text>
            </TouchableOpacity>
          </>
        )}
        {authError && <Text style={styles.errorText}>{authError}</Text>}
        {authMessage && <Text style={styles.successText}>{authMessage}</Text>}
      </View>
    </ScrollView>
  );
}
