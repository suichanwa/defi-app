import React, { useMemo } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useNavVisibility } from '@context/NavVisibilityProvider';
import { useWalletCardAnimation } from '../../animations/walletAnimations';

import { ScreenHeader } from '@components/common';

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

export default function SwapScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'Swap'>>();
  const { setNavHidden } = useNavVisibility();
  const { animatedStyle } = useWalletCardAnimation([]);

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(true);
      return () => setNavHidden(false);
    }, [setNavHidden]),
  );

  return (
    <Animated.View style={[localStyles.container, { backgroundColor: colors.background }, animatedStyle]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, localStyles.scrollContent]}>
        <ScreenHeader
          onBack={() => navigation.goBack()}
          title="Swap"
          subtitle="Exchange one token for another"
          titlePosition="below"
        />

        <TouchableOpacity
          activeOpacity={0.9}
          style={[localStyles.optionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('ExpressSwap')}
        >
          <View style={localStyles.optionHeader}>
            <View style={[localStyles.optionIcon, { backgroundColor: colors.warning }]}>
              <Ionicons name="flash" size={18} color="#ffffff" />
            </View>
            <View style={localStyles.optionText}>
              <Text style={[localStyles.optionTitle, { color: colors.text }]}>Express</Text>
              <Text style={[localStyles.optionSubtitle, { color: colors.muted }]}>Instant conversion with live preview</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
        </TouchableOpacity>

        <View style={[localStyles.optionCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.6 }]}>
          <View style={localStyles.optionHeader}>
            <View style={[localStyles.optionIcon, { backgroundColor: colors.border }]}>
              <Ionicons name="people" size={18} color={colors.muted} />
            </View>
            <View style={localStyles.optionText}>
              <Text style={[localStyles.optionTitle, { color: colors.text }]}>P2P</Text>
              <Text style={[localStyles.optionSubtitle, { color: colors.muted }]}>Coming soon</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  headerSpacer: {
    flex: 1,
  },
  headerCopy: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  optionCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 14,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
});
