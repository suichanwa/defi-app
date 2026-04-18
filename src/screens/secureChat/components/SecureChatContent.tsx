import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import ChatListScreen from '@components/secureChat/ChatListScreen';
import ChatThreadScreen from '@components/secureChat/ChatThreadScreen';
import ConnectScreen from '@components/secureChat/ConnectScreen';
import type { SecureChatContentProps } from '@app-types/securechat-types/secureChatContent';

const THREAD_TRANSITION_DURATION_MS = 260;

export default function SecureChatContent({ secureTab, chatView, connect, thread, list }: SecureChatContentProps) {
  const isThreadView = chatView === 'thread';
  const previousChatViewRef = useRef(chatView);
  const isReturningToList = !isThreadView && previousChatViewRef.current === 'thread';
  const listEntering = useMemo(
    () => (isReturningToList ? FadeInLeft.duration(THREAD_TRANSITION_DURATION_MS) : undefined),
    [isReturningToList],
  );
  const threadEntering = useMemo(
    () => SlideInRight.duration(THREAD_TRANSITION_DURATION_MS),
    [],
  );
  const threadExiting = useMemo(
    () => SlideOutRight.duration(THREAD_TRANSITION_DURATION_MS),
    [],
  );

  useEffect(() => {
    previousChatViewRef.current = chatView;
  }, [chatView]);

  if (secureTab === 'connect') {
    return <ConnectScreen {...connect} />;
  }

  return (
    <View style={styles.contentRoot}>
      {!isThreadView ? (
        <Animated.View entering={listEntering} style={styles.viewLayer}>
          <ChatListScreen {...list} />
        </Animated.View>
      ) : null}

      {isThreadView ? (
        <Animated.View entering={threadEntering} exiting={threadExiting} style={[styles.viewLayer, styles.threadWrapper]}>
          <ChatThreadScreen {...thread} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contentRoot: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  viewLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  threadWrapper: {
    marginBottom: 0,
  },
});
