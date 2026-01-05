import React, { useState } from 'react';
import { ScrollView, Text, View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { CHAIN } from '../../config/chain';

export default function SendScreen() {
  const { colors } = useTheme();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Send {CHAIN.nativeToken.symbol}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Transfer funds to another wallet</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Recipient Address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter wallet address"
              placeholderTextColor={colors.muted}
              value={recipient}
              onChangeText={setRecipient}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Amount</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>

          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: colors.accent }]}
            activeOpacity={0.8}
          >
            <Text style={styles.sendButtonText}>Review Transaction</Text>
          </TouchableOpacity>
        </View>
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
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  sendButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
