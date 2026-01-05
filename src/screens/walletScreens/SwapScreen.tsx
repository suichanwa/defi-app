import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';

export default function SwapScreen() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Swap</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Exchange one token for another</Text>
        {/* Add your Swap screen content here */}
      </ScrollView>
    </View>
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
