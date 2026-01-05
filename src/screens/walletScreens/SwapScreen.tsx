import React, { useRef } from 'react';
import { Animated, PanResponder, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@theme/ThemeProvider';

export default function SwapScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx > 0) {
          translateX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 100) {
          Animated.timing(translateX, {
            toValue: 400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            navigation.goBack();
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 10,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Swap</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Exchange one token for another</Text>
        {/* Add your Swap screen content here */}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
});
