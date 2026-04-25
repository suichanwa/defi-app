import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useNavVisibility } from '@context/NavVisibilityProvider';
import { useWalletSession } from '@context/WalletSessionProvider';
import { useCopyToClipboard } from '@hooks/useCopyToClipboard';

type WalletStackParamList = {
  WalletSettings: { walletId: string };
};

type WalletSettingsRouteProp = RouteProp<WalletStackParamList, 'WalletSettings'>;

export default function WalletSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'WalletSettings'>>();
  const route = useRoute<WalletSettingsRouteProp>();
  const { wallets, removeWallet } = useWalletSession();
  const { copyText } = useCopyToClipboard();
  const { setNavHidden } = useNavVisibility();
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(true);
      return () => setNavHidden(false);
    }, [setNavHidden]),
  );

  const walletId = route.params?.walletId;
  const wallet = wallets.find((record) => record.id === walletId);
  const label = wallet?.label ?? 'Wallet';

  const handleCopyAddress = () => {
    if (!walletId) return;
    copyText(walletId, {
      successMessage: 'Wallet address copied',
      errorMessage: 'Unable to copy address',
    });
  };

  const handleDelete = () => {
    if (!walletId) return;
    Alert.alert(
      'Delete wallet',
      'This will remove the wallet from this device. Make sure you saved the recovery phrase.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await removeWallet(walletId);
              navigation.goBack();
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, localStyles.scrollContent]}>
        <View style={localStyles.headerRow}>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            style={[localStyles.backButton, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[localStyles.title, { color: colors.text }]}>Wallet settings</Text>
          <View style={localStyles.headerSpacer} />
        </View>

        <View style={[localStyles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[localStyles.infoLabel, { color: colors.muted }]}>Wallet</Text>
          <Text style={[localStyles.infoTitle, { color: colors.text }]}>{label}</Text>
          {walletId ? (
            <View style={localStyles.addressBlock}>
              <Text style={[localStyles.addressLabel, { color: colors.muted }]}>Address</Text>
              <Text style={[localStyles.infoAddress, { color: colors.text }]}>{walletId}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.8}
                style={[localStyles.copyButton, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={handleCopyAddress}
              >
                <MaterialCommunityIcons name="content-copy" size={16} color={colors.text} />
                <Text style={[localStyles.copyButtonText, { color: colors.text }]}>Copy address</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={[localStyles.deleteCard, { borderColor: colors.border }]}>
          <Text style={[localStyles.deleteTitle, { color: colors.text }]}>Remove wallet</Text>
          <Text style={[localStyles.deleteSubtitle, { color: colors.muted }]}>
            This only removes the wallet from this device. You can restore it later with your recovery phrase.
          </Text>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[localStyles.deleteButton, isDeleting && localStyles.buttonDisabled]}
            onPress={handleDelete}
            disabled={isDeleting || !walletId}
          >
            <Text style={localStyles.deleteButtonText}>{isDeleting ? 'Removing...' : 'Delete wallet'}</Text>
          </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 36,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
  },
  infoCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 6,
  },
  infoAddress: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 18,
  },
  addressBlock: {
    marginTop: 12,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  copyButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  deleteTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  deleteSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
