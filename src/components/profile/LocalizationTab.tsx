import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileStyles as styles } from '../../styles/ProfileStyles';
import type { LanguageCode } from '../../types/profile';
import ProfileHeader from './ProfileHeader';
import { availableLanguages, t } from '../../i18n';

type LocalizationTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
  language: LanguageCode;
  onChangeLanguage: (code: LanguageCode) => void;
  onSave: () => void;
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
  message,
  error,
}: LocalizationTabProps) {
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
        <TouchableOpacity style={styles.primaryButton} onPress={onSave} activeOpacity={0.9}>
          <Text style={styles.primaryButtonText}>{t('language.save')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
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
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  rowActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioActive: {
    borderColor: '#4f46e5',
    backgroundColor: '#4f46e5',
  },
  label: {
    fontSize: 15,
    color: '#0f172a',
  },
});
