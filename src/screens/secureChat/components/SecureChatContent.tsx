import React from 'react';
import { StyleSheet, View } from 'react-native';
import ChatListScreen from '@components/secureChat/ChatListScreen';
import ChatThreadScreen from '@components/secureChat/ChatThreadScreen';
import ConnectScreen from '@components/secureChat/ConnectScreen';
import type { SecureChatContentProps } from '@app-types/securechat-types/secureChatContent';

export default function SecureChatContent({ secureTab, chatView, connect, thread, list }: SecureChatContentProps) {
  if (secureTab === 'connect') {
    return <ConnectScreen {...connect} />;
  }

  if (chatView === 'thread') {
    return (
      <View style={styles.threadWrapper}>
        <ChatThreadScreen {...thread} />
      </View>
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
