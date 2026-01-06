import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useNavVisibility } from '@context/NavVisibilityProvider';

type RouteParams = {
  symbol: string;
  name: string;
  balance: string;
};

type WalletStackParamList = {
  WalletHome: undefined;
  Add: undefined;
  Send: undefined;
  Receive: { address: string };
  Swap: undefined;
  SendCrypto: { symbol: string; name: string; balance: string };
  SendCryptoComplete: { symbol: string };
};

export default function SendCryptoScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const route = useRoute();
  const navigation = useNavigation<StackNavigationProp<WalletStackParamList, 'SendCrypto'>>();
  const { symbol, balance } = (route.params ?? {}) as RouteParams;
  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState('');
  const [amount, setAmount] = useState('');
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
        <Text style={[localStyles.title, { color: colors.text }]}>Send {symbol ?? 'Crypto'}</Text>

        <View style={localStyles.fieldGroup}>
          <Text style={[localStyles.label, { color: colors.text }]}>Address/Invoice</Text>
          <View
            style={[
              localStyles.inputRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              placeholder="Long press to paste"
              placeholderTextColor={colors.muted}
              value={address}
              onChangeText={setAddress}
              autoCapitalize="none"
              autoCorrect={false}
              style={[localStyles.inputText, { color: colors.text }]}
            />
            <TouchableOpacity activeOpacity={0.7} style={localStyles.iconButton}>
              <Ionicons name="scan-outline" size={20} color={colors.muted} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={localStyles.fieldGroup}>
          <Text style={[localStyles.label, { color: colors.text }]}>Network</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              localStyles.inputRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => setNetwork(network)}
          >
            <Text style={[localStyles.placeholder, { color: colors.muted }]}>
              Automatically match the network
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={localStyles.fieldGroup}>
          <Text style={[localStyles.label, { color: colors.text }]}>Withdraw Amount</Text>
          <View
            style={[
              localStyles.inputRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              placeholder="Minimum 0"
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={[localStyles.inputText, { color: colors.text }]}
            />
            <View style={localStyles.amountSuffix}>
              <Text style={[localStyles.suffixText, { color: colors.text }]}>{symbol ?? 'BTC'}</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[localStyles.maxText, { color: colors.accent }]}>Max</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={localStyles.availableRow}>
            <Text style={[localStyles.availableLabel, { color: colors.muted }]}>Available</Text>
            <Text style={[localStyles.availableValue, { color: colors.text }]}>{balance ?? '0.00'}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryButton, localStyles.inlineButton]}
          onPress={() => navigation.navigate('SendCryptoComplete', { symbol: symbol ?? 'BTC' })}
        >
          <Text style={styles.primaryButtonText}>Withdraw</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputRow: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  placeholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  iconButton: {
    padding: 4,
  },
  amountSuffix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  suffixText: {
    fontSize: 14,
    fontWeight: '700',
  },
  maxText: {
    fontSize: 14,
    fontWeight: '700',
  },
  availableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  availableLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  availableValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  inlineButton: {
    marginTop: 12,
  },
});
