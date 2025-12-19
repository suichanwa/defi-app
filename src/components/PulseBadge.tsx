import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View, ViewStyle } from 'react-native';

type Props = {
  size?: number;
  color?: string;
  durationMs?: number;
  style?: ViewStyle;
};

const PulseBadge: React.FC<Props> = ({ size = 10, color = '#10b981', durationMs = 1200, style }) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: durationMs,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: durationMs,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [durationMs, opacity, scale]);

  const outerSize = size * 3;

  return (
    <View style={[styles.container, { height: outerSize, width: outerSize }, style]}>
      <Animated.View
        style={[
          styles.pulse,
          {
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            height: size,
            width: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    height: '100%',
    width: '100%',
    borderRadius: 999,
  },
  dot: {
    zIndex: 1,
  },
});

export default PulseBadge;
