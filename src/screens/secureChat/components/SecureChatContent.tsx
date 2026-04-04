import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import ChatListScreen from '@components/secureChat/ChatListScreen';
import ChatThreadScreen from '@components/secureChat/ChatThreadScreen';
import ConnectScreen from '@components/secureChat/ConnectScreen';
import type { SecureChatContentProps } from '@app-types/securechat-types/secureChatContent';

export default function SecureChatContent({ secureTab, chatView, connect, thread, list }: SecureChatContentProps) {
  const slideAnim = useRef(new Animated.Value(100)).current;

  useEffect(() => {
    if (chatView === 'thread') {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Reset position when going back to list
      slideAnim.setValue(100);
    }
  }, [chatView, slideAnim]);

  if (secureTab === 'connect') {
    return <ConnectScreen {...connect} />;
  }

  if (chatView === 'thread') {
    return (
      <Animated.View
        style={[
          styles.threadWrapper,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <ChatThreadScreen {...thread} />
      </Animated.View>
    );
  }

  return <ChatListScreen {...list} />;
}

const styles = StyleSheet.create({
  threadWrapper: {
    flex: 1,
    marginBottom: 0,
  },
});
