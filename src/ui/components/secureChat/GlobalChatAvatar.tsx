import React, { useMemo } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import { createSecureChatStyles } from '@styles/SecureChat';

type GlobalChatAvatarProps = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  showContainer?: boolean;
};

export default function GlobalChatAvatar({
  size = 34,
  style,
  onPress,
  showContainer = true,
}: GlobalChatAvatarProps) {
  const { colors, resolved } = useTheme();
  const shared = useMemo(() => createSecureChatStyles(colors), [colors]);
  const iconSize = Math.max(16, Math.round(size * 0.56));
  const iconColor = resolved === 'dark' ? '#f8fafc' : colors.accent;
  const containerStyle = [
    showContainer ? shared.globalAvatarFrame : undefined,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
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
