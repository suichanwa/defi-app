import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useNavVisibility } from '@context/NavVisibilityProvider';

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

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(true);
      return () => setNavHidden(false);
    }, [setNavHidden]),
  );

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, localStyles.scrollContent]}>
        <View style={localStyles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[localStyles.backButton, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={localStyles.headerSpacer} />
        </View>

        <Text style={[localStyles.title, { color: colors.text }]}>Swap</Text>
        <Text style={[localStyles.subtitle, { color: colors.muted }]}>Exchange one token for another</Text>

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
    </View>
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
    marginBottom: 16,
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
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
