import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useCopyToClipboard } from '@hooks/useCopyToClipboard';
import { useNavVisibility } from '@context/NavVisibilityProvider';
import { useQRReceive } from '@context/QRReceiveProvider';
import { Share } from 'react-native';

type WalletStackParamList = {
  QRReceive: { symbol: string; name: string; address: string };
};

type QRReceiveRoute = RouteProp<WalletStackParamList, 'QRReceive'>;

export default function QRReceiveScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const route = useRoute<QRReceiveRoute>();
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'QRReceive'>>();
  const { copyText } = useCopyToClipboard();
  const { setNavHidden } = useNavVisibility();
  const { qrData, clearQRData } = useQRReceive();

  const params = route.params ?? qrData;
  const { symbol, name, address } = params ?? { symbol: 'SOL', name: 'Solana', address: '' };

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(true);
      return () => {
        setNavHidden(false);
        clearQRData();
      };
    }, [clearQRData, setNavHidden]),
  );

  const handleCopy = () =>
    copyText(address, {
      scope: 'wallet',
      animation: 'slide',
      successMessage: 'Copied to clipboard',
      errorMessage: 'Unable to copy',
    });

  const handleShare = async () => {
    await Share.share({
      message: `${name} address:\n${address}`,
    });
  };

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <View style={localStyles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          style={localStyles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[localStyles.headerTitle, { color: colors.text }]}>Your {name} Address</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, localStyles.scrollContent]}>
        <View style={localStyles.qrWrap}>
          {address ? (
            <>
              <QRCode value={address} size={220} />
              <View style={[localStyles.qrBadge, { backgroundColor: colors.accent }]}>
                <Text style={localStyles.qrBadgeText}>{symbol[0]}</Text>
              </View>
            </>
          ) : (
            <Text style={[localStyles.subtitle, { color: colors.muted }]}>
              Address unavailable.
            </Text>
          )}
        </View>

        <Text style={[localStyles.title, { color: colors.text }]}>Your {name} Address</Text>
        <Text style={[localStyles.subtitle, { color: colors.muted }]}>
          Use this address to receive tokens and collectibles on {name}.
        </Text>
      </ScrollView>

      <View style={localStyles.footer}>
        <View style={[localStyles.addressPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[localStyles.addressText, { color: colors.text }]} numberOfLines={1}>
            {address}
          </Text>
          <TouchableOpacity onPress={handleCopy} activeOpacity={0.7} disabled={!address}>
            <Ionicons name="copy-outline" size={18} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, localStyles.footerButton]}
          activeOpacity={0.9}
          onPress={handleShare}
          disabled={!address}
        >
          <Text style={styles.primaryButtonText}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 160,
  },
  qrWrap: {
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBadge: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrBadgeText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  addressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  footerButton: {
    marginBottom: 0,
  },
});
