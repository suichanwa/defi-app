import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createProfileStyles } from '../../styles/ProfileStyles';
import { useTheme } from '../../theme/ThemeProvider';

type ProfileHeaderProps = {
  title: string;
  onBack: () => void;
};

export default function ProfileHeader({ title, onBack }: ProfileHeaderProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  return (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}
