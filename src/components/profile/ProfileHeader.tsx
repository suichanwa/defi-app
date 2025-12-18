import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { profileStyles as styles } from '../../styles/ProfileStyles';

type ProfileHeaderProps = {
  title: string;
  onBack: () => void;
};

export default function ProfileHeader({ title, onBack }: ProfileHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
        <Ionicons name="arrow-back" size={22} color="#0f172a" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}
