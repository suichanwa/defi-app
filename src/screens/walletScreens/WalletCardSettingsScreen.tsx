import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useWalletSession } from '@context/WalletSessionProvider';
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
  WalletCardSettings: { walletId: string };
};

const COLOR_OPTIONS = ['#2563eb', '#f97316', '#16a34a', '#db2777', '#7c3aed', '#0ea5e9', '#facc15'];

export default function WalletCardSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'WalletCardSettings'>>();
  const route = useRoute();
  const { walletId } = (route.params ?? {}) as { walletId: string };
  const { wallets, updateWalletMeta } = useWalletSession();
  const wallet = wallets.find((item) => item.id === walletId);
  const { setNavHidden } = useNavVisibility();

  const [name, setName] = useState(wallet?.label ?? `Wallet`);
  const [color, setColor] = useState(wallet?.color ?? COLOR_OPTIONS[0]);

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(true);
      return () => setNavHidden(false);
    }, [setNavHidden]),
  );

  const handleSave = async () => {
    await updateWalletMeta(walletId, { label: name.trim() || `Wallet`, color });
    navigation.goBack();
  };

  return (
    <View style={[localStyles.container, { backgroundColor: colors.background }]}>
      <View style={localStyles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[localStyles.backButton, { borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[localStyles.title, { color: colors.text }]}>Wallet settings</Text>
        <View style={localStyles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, localStyles.scrollContent]}>
        <Text style={[localStyles.sectionTitle, { color: colors.text }]}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Wallet name"
          placeholderTextColor={colors.muted}
          style={[localStyles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
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
              />
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryButton, localStyles.saveButton]}
          onPress={handleSave}
        >
          <Text style={styles.primaryButtonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
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
    width: 36,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
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
    marginBottom: 32,
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
});
