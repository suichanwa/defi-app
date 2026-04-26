import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createProfileStyles } from '@styles/ProfileStyles';
import type { LanguageCode } from '@app-types/profile';
import { useTheme } from '@theme/ThemeProvider';
import ProfileHeader from '@components/profile/ProfileHeader';
import { availableLanguages, t } from '@i18n';

type LocalizationTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
  language: LanguageCode;
  onChangeLanguage: (code: LanguageCode) => void;
  onSave: () => void;
  isSaving?: boolean;
  message?: string | null;
  error?: string | null;
};

export default function LocalizationTab({
  scrollStyle,
  cardStyle,
  onBack,
  language,
  onChangeLanguage,
  onSave,
  isSaving,
  message,
  error,
}: LocalizationTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);
  const localStyles = useMemo(
    () =>
      StyleSheet.create({
        list: {
          marginTop: 12,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: 8,
          backgroundColor: colors.card,
        },
        rowActive: {
          borderColor: colors.accent,
          backgroundColor: colors.muted,
        },
        radio: {
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 10,
        },
        radioActive: {
          borderColor: colors.accent,
          backgroundColor: colors.accent,
        },
        label: {
          fontSize: 15,
          color: colors.text,
        },
      }),
    [colors],
  );

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title={t('language.title')} onBack={onBack} />
      <View style={cardStyle}>
        <Text style={styles.cardTitle}>{t('language.title')}</Text>
        <Text style={styles.cardSubtitle}>{t('language.subtitle')}</Text>
        <View style={localStyles.list}>
          {availableLanguages.map((lang) => {
            const selected = lang.code === language;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[localStyles.row, selected && localStyles.rowActive]}
                onPress={() => onChangeLanguage(lang.code)}
                activeOpacity={0.85}
              >
                <View style={[localStyles.radio, selected && localStyles.radioActive]}>
                  {selected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                </View>
                <Text style={localStyles.label}>{lang.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {message && <Text style={styles.successText}>{message}</Text>}
        <TouchableOpacity
          style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
          onPress={onSave}
          activeOpacity={0.9}
          disabled={Boolean(isSaving)}
        >
          <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : t('language.save')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
});
