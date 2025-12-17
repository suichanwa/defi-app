import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { profileStyles as styles } from '../styles/ProfileStyles';
import type { AvatarType, ThemePreference } from '../types/profile';
import type { EncryptedWalletKey } from '../types/wallet';
import type { RewardActivity, RewardsSummary } from '../types/rewards';
import { loadProfileSettings, saveProfileSettings } from '../services/profileStore';
import { loadRewardsActivity, loadRewardsSummary } from '../services/rewardsStore';
import {
  getAuthSession,
  onAuthStateChange,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updateAccountPassword,
  type AuthSession,
} from '../services/auth';
import { getAnonymousId } from '../services/identity';
import { fetchRewardsActivity, fetchRewardsSummary } from '../services/rewardsRemote';
import { isSupabaseConfigured } from '../services/supabaseClient';
import {
  changeWalletPassword,
  createInitialWalletKey,
  loadEncryptedWalletKey,
  WalletKeyNotFoundError,
  WalletPasswordError,
  WalletReencryptError,
} from '../services/walletKeyStore';

type ProfileView = 'home' | 'personalization' | 'security' | 'rewards';

const ALIAS_MIN = 3;
const ALIAS_MAX = 24;
const PASSWORD_MIN = 8;
const ALIAS_REGEX = /^[a-zA-Z0-9 _-]+$/;
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const makeSeed = () => `seed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const createRng = (seed: string) => {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
};

const buildIdenticon = (seed: string) => {
  const rng = createRng(seed);
  const grid: boolean[] = [];
  for (let row = 0; row < 5; row += 1) {
    const rowValues = [rng() > 0.5, rng() > 0.5, rng() > 0.5];
    const mirrored = [...rowValues, rowValues[1], rowValues[0]];
    grid.push(...mirrored);
  }
  const palette = ['#4f46e5', '#0ea5e9', '#22c55e', '#f97316', '#ec4899'];
  const colorIndex = Math.abs(seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palette.length;
  return { grid, color: palette[colorIndex] };
};

export default function ProfileScreen() {
  const [view, setView] = useState<ProfileView>('home');
  const [alias, setAlias] = useState('');
  const [avatarType, setAvatarType] = useState<AvatarType>('identicon');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [walletKey, setWalletKey] = useState<EncryptedWalletKey | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirm, setAccountConfirm] = useState('');
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [rewardsSummary, setRewardsSummary] = useState<RewardsSummary | null>(null);
  const [rewardsActivity, setRewardsActivity] = useState<RewardActivity[]>([]);
  const [rewardsSource, setRewardsSource] = useState<'local' | 'supabase'>('local');

  useEffect(() => {
    let isMounted = true;
    const loadAll = async () => {
      const [settings, key] = await Promise.all([loadProfileSettings(), loadEncryptedWalletKey()]);
      const anonymousId = await getAnonymousId();
      const [remoteSummary, remoteActivity] = await Promise.all([
        fetchRewardsSummary(anonymousId),
        fetchRewardsActivity(anonymousId),
      ]);
      const [localSummary, localActivity] = await Promise.all([loadRewardsSummary(), loadRewardsActivity()]);
      if (!isMounted) return;
      setAlias(settings.alias ?? '');
      setAvatarType(settings.avatarType ?? 'identicon');
      const nextSeed = settings.avatarSeed ?? key?.id ?? makeSeed();
      setAvatarSeed(nextSeed);
      setThemePreference(settings.themePreference ?? 'system');
      if (!settings.avatarSeed) {
        await saveProfileSettings({ ...settings, avatarSeed: nextSeed });
      }
      setWalletKey(key);
      if (isSupabaseConfigured && remoteSummary) {
        setRewardsSummary(remoteSummary);
        setRewardsSource('supabase');
      } else {
        setRewardsSummary(localSummary);
        setRewardsSource('local');
      }

      if (isSupabaseConfigured && remoteActivity) {
        setRewardsActivity(remoteActivity);
      } else {
        setRewardsActivity(localActivity);
      }
    };
    loadAll();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    getAuthSession().then((current) => {
      if (active) {
        setSession(current);
      }
    });
    const subscription = onAuthStateChange((next) => {
      setSession(next);
    });
    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const identiconSeed = walletKey?.id ?? avatarSeed;
  const identicon = useMemo(() => buildIdenticon(identiconSeed || 'seed'), [identiconSeed]);

  const handleSaveProfile = async () => {
    setProfileMessage(null);
    setProfileError(null);
    const trimmed = alias.trim();
    if (trimmed.length > 0 && (trimmed.length < ALIAS_MIN || trimmed.length > ALIAS_MAX)) {
      setProfileError(`Alias must be ${ALIAS_MIN}-${ALIAS_MAX} characters.`);
      return;
    }
    if (trimmed.length > 0 && !ALIAS_REGEX.test(trimmed)) {
      setProfileError('Alias can only use letters, numbers, spaces, _ and -.');
      return;
    }
    const saved = await saveProfileSettings({
      alias: trimmed,
      avatarType,
      avatarSeed: avatarType === 'identicon' ? identiconSeed : undefined,
      themePreference,
    });
    setAlias(saved.alias);
    setProfileMessage('Profile preferences saved.');
  };

  const validateNewPassword = (value: string) => {
    if (value.length < PASSWORD_MIN) {
      return `Password must be at least ${PASSWORD_MIN} characters.`;
    }
    return null;
  };

  const handleSignUp = async () => {
    setAuthMessage(null);
    setAuthError(null);
    const email = authEmail.trim();
    if (!EMAIL_REGEX.test(email)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    const policyError = validateNewPassword(authPassword);
    if (policyError) {
      setAuthError(policyError);
      return;
    }
    setAuthLoading(true);
    try {
      const result = await signUpWithEmail(email, authPassword);
      if (result.session) {
        setAuthMessage('Account created. You are signed in.');
      } else {
        setAuthMessage('Account created. Check your email to confirm.');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to create account.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignIn = async () => {
    setAuthMessage(null);
    setAuthError(null);
    const email = authEmail.trim();
    if (!EMAIL_REGEX.test(email)) {
      setAuthError('Enter a valid email address.');
      return;
    }
    const policyError = validateNewPassword(authPassword);
    if (policyError) {
      setAuthError(policyError);
      return;
    }
    setAuthLoading(true);
    try {
      await signInWithEmail(email, authPassword);
      setAuthMessage('Signed in.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign in.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthMessage(null);
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signOut();
      setAuthMessage('Signed out.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to sign out.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateAccountPassword = async () => {
    setAuthMessage(null);
    setAuthError(null);
    if (!session) {
      setAuthError('Sign in to update your account password.');
      return;
    }
    const policyError = validateNewPassword(accountPassword);
    if (policyError) {
      setAuthError(policyError);
      return;
    }
    if (accountPassword !== accountConfirm) {
      setAuthError('Password entries do not match.');
      return;
    }
    setAuthLoading(true);
    try {
      await updateAccountPassword(accountPassword);
      setAccountPassword('');
      setAccountConfirm('');
      setAuthMessage('Account password updated.');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Unable to update password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setSecurityMessage(null);
    setSecurityError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setSecurityError('Fill in all password fields.');
      return;
    }
    const policyError = validateNewPassword(newPassword);
    if (policyError) {
      setSecurityError(policyError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('New password entries do not match.');
      return;
    }
    try {
      const updated = await changeWalletPassword(currentPassword, newPassword);
      setWalletKey(updated);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSecurityMessage('Wallet password updated.');
    } catch (error) {
      if (error instanceof WalletPasswordError) {
        setSecurityError('Current password is incorrect.');
        return;
      }
      if (error instanceof WalletKeyNotFoundError) {
        setSecurityError('No local wallet key found.');
        return;
      }
      if (error instanceof WalletReencryptError) {
        setSecurityError('Unable to verify the new password.');
        return;
      }
      setSecurityError('Unexpected error updating password.');
    }
  };

  const handleCreateWalletKey = async () => {
    setSecurityMessage(null);
    setSecurityError(null);
    if (!setupPassword || !setupConfirm) {
      setSecurityError('Enter and confirm a password.');
      return;
    }
    const policyError = validateNewPassword(setupPassword);
    if (policyError) {
      setSecurityError(policyError);
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSecurityError('Password entries do not match.');
      return;
    }
    const created = await createInitialWalletKey(setupPassword);
    setWalletKey(created);
    if (avatarType === 'identicon') {
      setAvatarSeed(created.id);
      await saveProfileSettings({
        alias: alias.trim(),
        avatarType,
        avatarSeed: created.id,
        themePreference,
      });
    }
    setSetupPassword('');
    setSetupConfirm('');
    setSecurityMessage('Encrypted wallet key created.');
  };

  const rules = [
    'Secure messaging activity earns daily points.',
    'Verify wallet backups for bonus rewards.',
    'Keep profile settings updated for streak boosts.',
  ];

  const renderHeader = (title: string) => (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={() => setView('home')} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={22} color="#0f172a" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );

  if (view === 'personalization') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderHeader('Personalization')}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Display alias</Text>
          <TextInput
            value={alias}
            onChangeText={setAlias}
            placeholder="Alias"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            autoCapitalize="none"
          />
          <Text style={styles.hint}>Optional. 3-24 characters using letters, numbers, spaces, _ and -.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Avatar</Text>
          <View style={styles.avatarRow}>
            <View style={styles.avatarPreview}>
              {avatarType === 'identicon' ? (
                <View style={styles.identiconGrid}>
                  {identicon.grid.map((filled, index) => (
                    <View
                      key={`cell-${index}`}
                      style={[
                        styles.identiconCell,
                        { backgroundColor: filled ? identicon.color : 'transparent' },
                      ]}
                    />
                  ))}
                </View>
              ) : (
                <Ionicons name="person" size={34} color="#94a3b8" />
              )}
            </View>
            <View style={styles.avatarOptions}>
              <TouchableOpacity
                style={[styles.optionButton, avatarType === 'identicon' && styles.optionButtonActive]}
                onPress={() => setAvatarType('identicon')}
                activeOpacity={0.8}
              >
                <Text style={avatarType === 'identicon' ? styles.optionTextActive : styles.optionText}>Identicon</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.optionButton, avatarType === 'none' && styles.optionButtonActive]}
                onPress={() => setAvatarType('none')}
                activeOpacity={0.8}
              >
                <Text style={avatarType === 'none' ? styles.optionTextActive : styles.optionText}>No avatar</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.hint}>Identicon is derived from your local wallet id.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Theme preference</Text>
          <View style={styles.optionRow}>
            {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.optionButton, themePreference === option && styles.optionButtonActive]}
                onPress={() => setThemePreference(option)}
                activeOpacity={0.8}
              >
                <Text style={themePreference === option ? styles.optionTextActive : styles.optionText}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>Preference is saved for future theming.</Text>
        </View>

        {profileError && <Text style={styles.errorText}>{profileError}</Text>}
        {profileMessage && <Text style={styles.successText}>{profileMessage}</Text>}

        <TouchableOpacity style={styles.primaryButton} onPress={handleSaveProfile} activeOpacity={0.9}>
          <Text style={styles.primaryButtonText}>Save changes</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (view === 'security') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderHeader('Security')}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>Account access</Text>
            <Ionicons name="lock-closed-outline" size={20} color="#4f46e5" />
          </View>
          {!isSupabaseConfigured ? (
            <Text style={styles.cardSubtitle}>Supabase auth is not configured.</Text>
          ) : session ? (
            <>
              <Text style={styles.cardSubtitle}>Signed in as {session.user.email ?? 'Unknown email'}.</Text>
              <TouchableOpacity
                style={[styles.secondaryButton, authLoading && styles.buttonDisabled]}
                onPress={handleSignOut}
                activeOpacity={0.9}
                disabled={authLoading}
              >
                <Text style={styles.secondaryButtonText}>Sign out</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <Text style={styles.cardTitle}>Update account password</Text>
              <TextInput
                value={accountPassword}
                onChangeText={setAccountPassword}
                placeholder="New account password"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                secureTextEntry
              />
              <TextInput
                value={accountConfirm}
                onChangeText={setAccountConfirm}
                placeholder="Confirm new password"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.primaryButton, authLoading && styles.buttonDisabled]}
                onPress={handleUpdateAccountPassword}
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
                onChangeText={setAuthEmail}
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                value={authPassword}
                onChangeText={setAuthPassword}
                placeholder="Password"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.primaryButton, authLoading && styles.buttonDisabled]}
                onPress={handleSignUp}
                activeOpacity={0.9}
                disabled={authLoading}
              >
                <Text style={styles.primaryButtonText}>Create account</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryButton, authLoading && styles.buttonDisabled]}
                onPress={handleSignIn}
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
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Text style={styles.cardTitle}>Wallet key status</Text>
            <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#4f46e5" />
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
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create local wallet key</Text>
            <Text style={styles.cardSubtitle}>Set a password to encrypt a new local key.</Text>
            <TextInput
              value={setupPassword}
              onChangeText={setSetupPassword}
              placeholder="New password"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              secureTextEntry
            />
            <TextInput
              value={setupConfirm}
              onChangeText={setSetupConfirm}
              placeholder="Confirm password"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              secureTextEntry
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleCreateWalletKey} activeOpacity={0.9}>
              <Text style={styles.primaryButtonText}>Create encrypted key</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change wallet password</Text>
            <TextInput
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Current password"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              secureTextEntry
            />
            <TextInput
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="New password"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              secureTextEntry
            />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              secureTextEntry
            />
            <TouchableOpacity style={styles.primaryButton} onPress={handleChangePassword} activeOpacity={0.9}>
              <Text style={styles.primaryButtonText}>Update password</Text>
            </TouchableOpacity>
          </View>
        )}

        {securityError && <Text style={styles.errorText}>{securityError}</Text>}
        {securityMessage && <Text style={styles.successText}>{securityMessage}</Text>}
      </ScrollView>
    );
  }

  if (view === 'rewards') {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {renderHeader('RewardsHub')}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Rewards balance</Text>
          <Text style={styles.pointsValue}>{rewardsSummary?.points ?? 0} pts</Text>
          <Text style={styles.metaText}>Tier: {rewardsSummary?.tier ?? 'bronze'}</Text>
          <Text style={styles.metaText}>
            Source: {rewardsSource === 'supabase' ? 'Supabase' : 'Local mock data'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How points are earned</Text>
          {rules.map((rule) => (
            <Text key={rule} style={styles.listItem}>
              - {rule}
            </Text>
          ))}
        </View>

        <View style={styles.card}>
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

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.titleBlock}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Text style={styles.cardSubtitle}>Manage how your account feels and stays secure.</Text>
      </View>

      <TouchableOpacity style={styles.card} onPress={() => setView('personalization')} activeOpacity={0.85}>
        <View style={styles.cardRow}>
          <View style={styles.cardIcon}>
            <Ionicons name="color-palette-outline" size={22} color="#4f46e5" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Personalization</Text>
            <Text style={styles.cardSubtitle}>Alias, avatar, and theme preferences.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => setView('security')} activeOpacity={0.85}>
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

      <TouchableOpacity style={styles.card} onPress={() => setView('rewards')} activeOpacity={0.85}>
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
    </ScrollView>
  );
}
