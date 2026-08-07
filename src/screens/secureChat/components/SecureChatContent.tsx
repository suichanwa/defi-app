import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInLeft, SlideInDown, SlideInRight, SlideOutDown, SlideOutRight } from 'react-native-reanimated';
import ChatListScreen from '@components/secureChat/ChatListScreen';
import ChatThreadScreen from '@components/secureChat/ChatThreadScreen';
import ConnectScreen from '@components/secureChat/ConnectScreen';
import type { SecureChatContentProps } from '@app-types/securechat-types/secureChatContent';

const THREAD_TRANSITION_DURATION_MS = 260;

export default function SecureChatContent({ secureTab, chatView, connect, thread, list }: SecureChatContentProps) {
  const isThreadView = chatView === 'thread';
  const isConnectTab = secureTab === 'connect';
  const previousChatViewRef = useRef(chatView);
  const previousTabRef = useRef(secureTab);

  const isReturningToList =
    !isThreadView && !isConnectTab && (previousChatViewRef.current === 'thread' || previousTabRef.current === 'connect');

  // Animation builders are created fresh on each render: Reanimated mutates
  // builder instances when serializing them for worklets, so memoized/reused
  // instances trigger "Tried to modify key `value`" warnings.
  const listEntering = isReturningToList ? FadeInLeft.duration(THREAD_TRANSITION_DURATION_MS) : undefined;
  const threadEntering = SlideInRight.duration(THREAD_TRANSITION_DURATION_MS);
  const threadExiting = SlideOutRight.duration(THREAD_TRANSITION_DURATION_MS);
  const connectEntering = SlideInDown.duration(300).springify().damping(18).stiffness(180);
  const connectExiting = SlideOutDown.duration(240);

  useEffect(() => {
    previousChatViewRef.current = chatView;
    previousTabRef.current = secureTab;
  }, [chatView, secureTab]);

  return (
    <View style={styles.contentRoot}>
      {!isThreadView && !isConnectTab ? (
        <Animated.View entering={listEntering} style={styles.viewLayer}>
          <ChatListScreen {...list} />
        </Animated.View>
      ) : null}

      {isThreadView && !isConnectTab ? (
        <Animated.View entering={threadEntering} exiting={threadExiting} style={[styles.viewLayer, styles.threadWrapper]}>
          <ChatThreadScreen {...thread} />
        </Animated.View>
      ) : null}

      {isConnectTab ? (
        <Animated.View entering={connectEntering} exiting={connectExiting} style={styles.viewLayer}>
          <ConnectScreen {...connect} />
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
    ...StyleSheet.absoluteFill,
  },
  threadWrapper: {
    marginBottom: 0,
  },
});
