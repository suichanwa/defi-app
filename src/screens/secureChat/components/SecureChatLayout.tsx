import React from 'react';
import { StyleSheet, View } from 'react-native';
import ChatHeader from '@components/secureChat/ChatHeader';
import ChatTabs from '@components/secureChat/ChatTabs';
import { useTheme } from '@theme/ThemeProvider';

type Props = {
  isCompact: boolean;
  secureTab: 'chats' | 'connect';
  timeLabel: string;
  onTabChange: (tab: 'chats' | 'connect') => void;
  children: React.ReactNode;
};

export default function SecureChatLayout({
  isCompact,
  secureTab,
  timeLabel,
  onTabChange,
  children,
}: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, isCompact && styles.containerCompact, { backgroundColor: colors.background }]}>
      <ChatHeader isCompact={isCompact} />
      <ChatTabs activeTab={secureTab} onTabChange={onTabChange} timeLabel={timeLabel} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  containerCompact: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
});
