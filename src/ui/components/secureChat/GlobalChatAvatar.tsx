import React, { useMemo } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import { createSecureChatStyles } from '@styles/SecureChat';

type GlobalChatAvatarProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};

export default function GlobalChatAvatar({ size = 34, style, onPress }: GlobalChatAvatarProps) {
  const { colors, resolved } = useTheme();
  const shared = useMemo(() => createSecureChatStyles(colors), [colors]);
  const iconSize = Math.max(16, Math.round(size * 0.56));
  const iconColor = resolved === 'dark' ? '#f8fafc' : colors.accent;
  const borderColor = resolved === 'dark' ? colors.accent + '2d' : colors.accent + '30';
  const backgroundColor = resolved === 'dark' ? colors.accent + '1a' : colors.accent + '14';
  const containerStyle = [
    shared.globalAvatarFrame,
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
