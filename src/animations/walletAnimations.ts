import { useEffect, useRef } from 'react';
import { Animated, Platform } from 'react-native';

export const useWalletCardAnimation = (deps: unknown[] = []) => {
  // Start opacity at 1 so screen is immediately visible without white flash/blinking on mount or dep updates
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 150,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    animatedStyle: { opacity, transform: [{ translateY }] },
  };
};
