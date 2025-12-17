import React from 'react';
import { Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { profileStyles as styles } from '../styles/ProfileStyles';

export default function ProfileScreen() {
  return (
    <View style={styles.profilePlaceholder}>
      <MaterialCommunityIcons name="account-cog-outline" size={38} color="#4f46e5" />
      <Text style={styles.profileTitle}>Profile</Text>
      <Text style={styles.profileSubtitle}>Link devices, manage notifications, and keys.</Text>
    </View>
  );
}
