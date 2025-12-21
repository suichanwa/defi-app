import React from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  isCompact: boolean;
};

export default function ChatHeader({ isCompact }: Props) {
  return <View style={[styles.container, isCompact && styles.containerCompact]} />;
}

const styles = StyleSheet.create({
  container: {
    height: 28,
  },
  containerCompact: {
    height: 20,
  },
});
