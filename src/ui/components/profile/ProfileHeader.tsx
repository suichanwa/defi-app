import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createProfileStyles } from '@styles/ProfileStyles';
import { useTheme } from '@theme/ThemeProvider';

type ProfileHeaderProps = {
  title: string;
  onBack: () => void;
};

export default function ProfileHeader({ title, onBack }: ProfileHeaderProps) {
  const { colors, resolved } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);
  const backIconColor = resolved === 'light' ? '#ffffff' : colors.background;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <TouchableOpacity onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 12, color: colors.text }}>
        {title}
      </Text>
    </View>
  );
}
