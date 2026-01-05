import React from 'react';
import { StyleSheet, View } from 'react-native';
import ChatHeader from '@components/secureChat/ChatHeader';
import ChatTabs from '@components/secureChat/ChatTabs';
import { useTheme } from '@theme/ThemeProvider';

type Props = {
  isCompact: boolean;
  secureTab: 'chats' | 'connect';
  chatView: 'list' | 'thread';
  timeLabel: string;
  onTabChange: (tab: 'chats' | 'connect') => void;
  children: React.ReactNode;
};

export default function SecureChatLayout({
  isCompact,
  secureTab,
  chatView,
  timeLabel,
  onTabChange,
  children,
}: Props) {
  const { colors } = useTheme();
  const showNav = chatView !== 'thread';

  return (
    <View style={[styles.container, isCompact && styles.containerCompact, { backgroundColor: colors.background }]}>
      {showNav ? (
        <>
          <ChatHeader isCompact={isCompact} />
          <ChatTabs activeTab={secureTab} onTabChange={onTabChange} timeLabel={timeLabel} />
        </>
      ) : null}
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
