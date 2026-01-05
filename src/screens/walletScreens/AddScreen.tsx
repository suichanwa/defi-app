import React, { useRef } from 'react';
import { Animated, PanResponder, ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { useNavigation } from '@react-navigation/native';

export default function AddScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only respond to horizontal swipes (right swipe to go back)
        return Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderMove: (_, gesture) => {
        // Only allow right swipe (positive dx)
        if (gesture.dx > 0) {
          translateX.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        // If swiped more than 100px, trigger back
        if (gesture.dx > 100) {
          Animated.timing(translateX, {
            toValue: 400,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            navigation.goBack();
          });
        } else {
          // Snap back to original position
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
        <Text style={[styles.title, { color: colors.text }]}>Add Funds</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Buy crypto or add funds to your wallet</Text>
        {/* Add your Add screen content here */}
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