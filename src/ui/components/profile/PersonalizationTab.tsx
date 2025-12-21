import React, { useMemo } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createProfileStyles } from '@styles/ProfileStyles';
import type { AvatarType, ThemePreference } from '@app-types/profile';
import { useTheme } from '@theme/ThemeProvider';
import ProfileHeader from '@components/profile/ProfileHeader';

type IdenticonData = {
  grid: boolean[];
  color: string;
};

type PersonalizationTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
  alias: string;
  onChangeAlias: (value: string) => void;
  avatarType: AvatarType;
  onChangeAvatarType: (value: AvatarType) => void;
  avatarUri?: string;
  onPickAvatar: () => void;
  onClearAvatar: () => void;
  identicon: IdenticonData;
  themePreference: ThemePreference;
  onChangeThemePreference: (value: ThemePreference) => Promise<void> | void;
  profileError: string | null;
  profileMessage: string | null;
  onSave: () => void;
};

export default function PersonalizationTab({
  scrollStyle,
  cardStyle,
  onBack,
  alias,
  onChangeAlias,
  avatarType,
  onChangeAvatarType,
  avatarUri,
  onPickAvatar,
  onClearAvatar,
  identicon,
  themePreference,
  onChangeThemePreference,
  profileError,
  profileMessage,
  onSave,
}: PersonalizationTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title="Personalization" onBack={onBack} />
      <View style={cardStyle}>
        <Text style={styles.cardTitle}>Display alias</Text>
        <TextInput
          value={alias}
          onChangeText={onChangeAlias}
          placeholder="Alias"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          autoCapitalize="none"
        />
        <Text style={styles.hint}>Optional. 3-24 characters using letters, numbers, spaces, _ and -.</Text>
      </View>

      <View style={cardStyle}>
        <Text style={styles.cardTitle}>Avatar</Text>
        <View style={styles.avatarRow}>
          <View style={styles.avatarPreview}>
            {avatarType === 'identicon' ? (
              <View style={styles.identiconGrid}>
                {identicon.grid.map((filled, index) => (
                  <View
                    key={`cell-${index}`}
                    style={[styles.identiconCell, { backgroundColor: filled ? identicon.color : 'transparent' }]}
                  />
                ))}
              </View>
            ) : avatarType === 'custom' && avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={34} color={colors.muted} />
            )}
          </View>
          <View style={styles.avatarOptions}>
            <TouchableOpacity
              style={[styles.optionButton, avatarType === 'identicon' && styles.optionButtonActive]}
              onPress={() => onChangeAvatarType('identicon')}
              activeOpacity={0.8}
            >
              <Text style={avatarType === 'identicon' ? styles.optionTextActive : styles.optionText}>Identicon</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, avatarType === 'custom' && styles.optionButtonActive]}
              onPress={() => onChangeAvatarType('custom')}
              activeOpacity={0.8}
            >
              <Text style={avatarType === 'custom' ? styles.optionTextActive : styles.optionText}>Custom photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.optionButton, avatarType === 'none' && styles.optionButtonActive]}
              onPress={() => onChangeAvatarType('none')}
              activeOpacity={0.8}
            >
              <Text style={avatarType === 'none' ? styles.optionTextActive : styles.optionText}>No avatar</Text>
            </TouchableOpacity>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.chipButton, styles.chipPrimary]} onPress={onPickAvatar} activeOpacity={0.88}>
                <Ionicons name="image-outline" size={16} color="#ffffff" />
                <Text style={styles.chipPrimaryText}>Upload photo</Text>
              </TouchableOpacity>
              {avatarUri ? (
                <TouchableOpacity
                  style={[styles.chipButton, styles.chipGhost]}
                  onPress={onClearAvatar}
                  activeOpacity={0.88}
                >
                  <Ionicons name="trash-outline" size={16} color="#b91c1c" />
                  <Text style={styles.chipGhostText}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
        <Text style={styles.hint}>
          Identicon is derived from your local wallet id. Custom photo stays on this device and appears in chat bubbles.
        </Text>
      </View>

      <View style={cardStyle}>
        <Text style={styles.cardTitle}>Theme preference</Text>
        <View style={styles.optionRow}>
          {(['system', 'light', 'dark'] as ThemePreference[]).map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.optionButton, themePreference === option && styles.optionButtonActive]}
              onPress={() => onChangeThemePreference(option)}
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

      <TouchableOpacity style={styles.primaryButton} onPress={onSave} activeOpacity={0.9}>
        <Text style={styles.primaryButtonText}>Save changes</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
