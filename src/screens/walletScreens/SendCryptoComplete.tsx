import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';

type WalletStackParamList = {
  WalletHome: undefined;
  Add: undefined;
  Send: undefined;
  Receive: { address: string };
  Swap: undefined;
  SendCrypto: { symbol: string; name: string; balance: string };
  SendCryptoComplete: { symbol: string };
};

export default function SendCryptoComplete() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'SendCryptoComplete'>>();

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <View style={localStyles.content}>
        <Text style={[localStyles.title, { color: colors.text }]}>Withdraw complete</Text>
        <View style={[localStyles.iconCircle, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark" size={34} color="#ffffff" />
        </View>
      </View>

      <View style={localStyles.footer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryButton, localStyles.footerButton]}
          onPress={() => navigation.navigate('WalletHome')}
        >
          <Text style={styles.primaryButtonText}>Return to wallet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  footerButton: {
    marginBottom: 0,
  },
});
