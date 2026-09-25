import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { ScreenContainer } from '@components/common';

type WalletStackParamList = {
  WalletHome: undefined;
  Add: undefined;
  Send: undefined;
  Receive: { address: string };
  Swap: undefined;
  ExpressSwap: undefined;
  ExpressSwapSuccess: undefined;
  SendCrypto: { symbol: string; name: string; balance: string };
  SendCryptoComplete: { symbol: string };
  QRReceive: { symbol: string; name: string; address: string };
};

export default function ExpressSwapSuccessScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'ExpressSwapSuccess'>>();

  return (
    <ScreenContainer scrollable={false}>
      <View style={localStyles.content}>
        <View style={[localStyles.iconCircle, { backgroundColor: colors.success }]}>
          <Ionicons name="checkmark" size={34} color="#ffffff" />
        </View>
        <Text style={[localStyles.title, { color: colors.text }]}>Express swap complete</Text>
      </View>

      <View style={localStyles.footer}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryButton, localStyles.footerButton]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </ScreenContainer>
  );
}

const localStyles = StyleSheet.create({
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
