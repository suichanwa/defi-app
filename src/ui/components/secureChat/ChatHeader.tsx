import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { createSecureChatStyles } from '@styles/SecureChat';

type Props = {
  isCompact: boolean;
};

export default function ChatHeader({ isCompact }: Props) {
  const { colors } = useTheme();
  const shared = useMemo(() => createSecureChatStyles(colors, { compact: isCompact }), [colors, isCompact]);
  return <View style={shared.chatHeaderSpacer} />;
}
