import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ColorPicker, { HueSlider, Panel1, Preview } from 'reanimated-color-picker';
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
  const { wallets, removeWallet, updateWalletMeta } = useWalletSession();
  const { copyText } = useCopyToClipboard();
  const { setNavHidden } = useNavVisibility();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const walletId = route.params?.walletId;
  const wallet = wallets.find((record) => record.id === walletId);
  const [name, setName] = useState(wallet?.label ?? 'Wallet');
  const [color, setColor] = useState(wallet?.color ?? '#2563eb');
  const baseName = wallet?.label ?? 'Wallet';
  const baseColor = wallet?.color ?? '#2563eb';
  const trimmedName = name.trim() || 'Wallet';
  const hasChanges = trimmedName !== baseName || color !== baseColor;

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(true);
      return () => setNavHidden(false);
    }, [setNavHidden]),
  );

  useEffect(() => {
    setName(wallet?.label ?? 'Wallet');
    setColor(wallet?.color ?? '#2563eb');
    setShowColorPicker(false);
  }, [wallet?.color, wallet?.label, walletId]);

  const addressShort = walletId ? `${walletId.slice(0, 8)}...${walletId.slice(-8)}` : null;

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
      label: trimmedName,
      color,
    });
    navigation.goBack();
  };

  if (!wallet || !walletId) {
    return (
      <View style={[localStyles.container, { backgroundColor: colors.background }]}>
        <View style={[localStyles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="wallet-outline" size={34} color={colors.muted} />
          <Text style={[localStyles.emptyTitle, { color: colors.text }]}>Wallet not found</Text>
          <Text style={[localStyles.emptySubtitle, { color: colors.muted }]}>
            This wallet may have been removed from this device.
          </Text>
          <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryButtonText}>Back to wallets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const SectionCard = ({ section, children }: { section: string; children: React.ReactNode }) => (
    <View style={[localStyles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[localStyles.sectionLabel, { color: colors.muted }]}>{section}</Text>
      {children}
    </View>
  );

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
          <View style={localStyles.headerTextBlock}>
            <Text style={[localStyles.title, { color: colors.text }]}>Wallet settings</Text>
            <Text style={[localStyles.subtitle, { color: colors.muted }]}>Edit name, color, and wallet actions.</Text>
          </View>
          <View style={localStyles.headerSpacer} />
        </View>

        <SectionCard section="Wallet details">
          <View style={localStyles.walletMetaRow}>
            <View style={[localStyles.walletMetaDot, { backgroundColor: color }]} />
            <View style={localStyles.walletMetaText}>
              <Text style={[localStyles.infoTitle, { color: colors.text }]}>{trimmedName}</Text>
              <Text style={[localStyles.walletMetaSub, { color: colors.muted }]}>{addressShort}</Text>
            </View>
          </View>

          <Text style={[localStyles.fieldTitle, { color: colors.text }]}>Wallet name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Wallet name"
            placeholderTextColor={colors.muted}
            style={[
              localStyles.input,
              { color: colors.text, backgroundColor: colors.background, borderColor: colors.border },
            ]}
            maxLength={24}
          />

          <Text style={[localStyles.fieldTitle, { color: colors.text }]}>Card color</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[localStyles.colorButton, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowColorPicker((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel="Choose card color"
          >
            <View style={localStyles.colorButtonLeft}>
              <View style={[localStyles.colorButtonDot, { backgroundColor: color }]} />
              <Text style={[localStyles.colorButtonLabel, { color: colors.text }]}>{color.toUpperCase()}</Text>
            </View>
            <MaterialCommunityIcons
              name={showColorPicker ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.muted}
            />
          </TouchableOpacity>
          {showColorPicker ? (
            <View
              style={[localStyles.colorPickerCard, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <ColorPicker value={color} onCompleteJS={(picked) => setColor(picked.hex)} style={localStyles.colorPicker}>
                <Preview hideText={false} colorFormat="hex" style={localStyles.colorPreview} />
                <Panel1 style={localStyles.colorPanel} />
                <HueSlider style={localStyles.hueSlider} />
              </ColorPicker>
            </View>
          ) : null}

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

          <TouchableOpacity
            activeOpacity={0.9}
            style={[
              styles.primaryButton,
              localStyles.saveButton,
              (!hasChanges || isDeleting) && styles.buttonDisabled,
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isDeleting}
          >
            <Text style={styles.primaryButtonText}>{hasChanges ? 'Save changes' : 'No changes yet'}</Text>
          </TouchableOpacity>
        </SectionCard>

        <View style={[localStyles.deleteCard, { borderColor: colors.border }]}>
          <Text style={[localStyles.deleteTitle, { color: colors.text }]}>Danger zone</Text>
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
    paddingBottom: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerTextBlock: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
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
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
    lineHeight: 18,
  },
  infoCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  walletMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  walletMetaText: {
    flex: 1,
  },
  walletMetaDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  walletMetaSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 10,
  },
  colorButton: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 42,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorButtonDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  colorButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  colorPickerCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  colorPicker: {
    width: '100%',
  },
  colorPreview: {
    marginBottom: 8,
  },
  colorPanel: {
    borderRadius: 10,
    minHeight: 110,
  },
  hueSlider: {
    marginTop: 8,
  },
  saveButton: {
    marginTop: 10,
  },
  infoAddress: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 18,
  },
  addressBlock: {
    marginTop: 10,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  copyButton: {
    marginTop: 10,
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
    fontWeight: '600',
  },
  deleteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  deleteTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  deleteSubtitle: {
    fontSize: 13,
    fontWeight: '500',
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
  emptyState: {
    margin: 20,
    marginTop: 40,
    borderWidth: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
});
