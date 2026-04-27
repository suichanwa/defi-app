import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

const COLOR_OPTIONS = ['#2563eb', '#f97316', '#16a34a', '#db2777', '#7c3aed', '#0ea5e9', '#facc15'];

export default function WalletSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'WalletSettings'>>();
  const route = useRoute<WalletSettingsRouteProp>();
  const { wallets, removeWallet, updateWalletMeta } = useWalletSession();
  const { copyText } = useCopyToClipboard();
  const { setNavHidden } = useNavVisibility();
  const [isDeleting, setIsDeleting] = useState(false);
  const walletId = route.params?.walletId;
  const wallet = wallets.find((record) => record.id === walletId);
  const [name, setName] = useState(wallet?.label ?? 'Wallet');
  const [color, setColor] = useState(wallet?.color ?? COLOR_OPTIONS[0]);

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(true);
      return () => setNavHidden(false);
    }, [setNavHidden]),
  );

  useEffect(() => {
    setName(wallet?.label ?? 'Wallet');
    setColor(wallet?.color ?? COLOR_OPTIONS[0]);
  }, [wallet?.color, wallet?.label, walletId]);

  const label = wallet?.label ?? 'Wallet';
  const selectedColor = wallet?.color ?? color;

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

  const handleSave = async () => {
    if (!walletId) return;
    await updateWalletMeta(walletId, {
      label: name.trim() || 'Wallet',
      color,
    });
    navigation.goBack();
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
          <Text style={[localStyles.infoLabel, { color: colors.muted }]}>Personalize</Text>
          <Text style={[localStyles.sectionTitle, { color: colors.text, marginTop: 10 }]}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Wallet name"
            placeholderTextColor={colors.muted}
            style={[
              localStyles.input,
              { color: colors.text, backgroundColor: colors.background, borderColor: colors.border },
            ]}
          />

          <Text style={[localStyles.sectionTitle, { color: colors.text }]}>Color</Text>
          <View style={localStyles.colorRow}>
            {COLOR_OPTIONS.map((option) => {
              const selected = option === color;
              return (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.8}
                  style={[
                    localStyles.colorSwatch,
                    { backgroundColor: option, borderColor: selected ? colors.text : 'transparent' },
                  ]}
                  onPress={() => setColor(option)}
                  accessibilityRole="button"
                  accessibilityLabel={`Pick color ${option}`}
                />
              );
            })}
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primaryButton, localStyles.saveButton]}
            onPress={handleSave}
            disabled={!walletId}
          >
            <Text style={styles.primaryButtonText}>Save changes</Text>
          </TouchableOpacity>
        </View>

        <View style={[localStyles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[localStyles.infoLabel, { color: colors.muted }]}>Wallet</Text>
          <Text style={[localStyles.infoTitle, { color: colors.text }]}>{label}</Text>
          <View style={localStyles.previewRow}>
            <View style={[localStyles.previewDot, { backgroundColor: selectedColor }]} />
            <Text style={[localStyles.previewLabel, { color: colors.muted }]}>Card color preview</Text>
          </View>
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
  previewRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 18,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 24,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
  },
  saveButton: {
    marginTop: 12,
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
