import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
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
  const navOpacity = useRef(new Animated.Value(1)).current;
  const navTranslateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (chatView === 'thread') {
      // Animate navbar out: fade and slide up
      Animated.parallel([
        Animated.timing(navOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(navTranslateY, {
          toValue: -20,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate navbar in: fade and slide down
      Animated.parallel([
        Animated.timing(navOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(navTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [chatView, navOpacity, navTranslateY]);

  return (
    <View
      style={[
        styles.container,
        isCompact && styles.containerCompact,
        !showNav && styles.containerNoNav,
        { backgroundColor: colors.background },
      ]}
    >
      {showNav ? (
        <Animated.View
          style={[
            styles.navWrapper,
            {
              opacity: navOpacity,
              transform: [{ translateY: navTranslateY }],
            },
          ]}
        >
          <ChatHeader isCompact={isCompact} />
          <ChatTabs activeTab={secureTab} onTabChange={onTabChange} timeLabel={timeLabel} />
        </Animated.View>
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
    paddingTop: 34,
    paddingBottom: 100,
  },
  containerCompact: {
    paddingHorizontal: 16,
    paddingTop: 28,
  },
  containerNoNav: {
    paddingTop: 0,
    paddingBottom: 6,
    paddingHorizontal: 10,
  },
  navWrapper: {
    overflow: 'hidden',
  },
});
