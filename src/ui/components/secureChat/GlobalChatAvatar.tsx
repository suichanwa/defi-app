import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';

type GlobalChatAvatarProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export default function GlobalChatAvatar({ size = 34, style, onPress }: GlobalChatAvatarProps) {
  const { colors, resolved } = useTheme();
  const iconSize = Math.max(16, Math.round(size * 0.56));
  const iconColor = resolved === 'dark' ? '#f8fafc' : colors.accent;
  const borderColor = resolved === 'dark' ? colors.accent + '2d' : colors.accent + '30';
  const backgroundColor = resolved === 'dark' ? colors.accent + '1a' : colors.accent + '14';
  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor,
      borderColor,
    },
    style,
  ];

  const content = (
    <View style={containerStyle}>
      <MaterialCommunityIcons name="forum-outline" size={iconSize} color={iconColor} />
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Open global chat" hitSlop={8}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
});
