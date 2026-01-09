import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@theme/ThemeProvider';
import { createWalletStyles } from '@styles/WalletStyles';
import { useNavVisibility } from '@context/NavVisibilityProvider';
import { useChain } from '@context/ChainProvider';
import { useWalletSession } from '@context/WalletSessionProvider';
import { sendSolTransfer } from '@services/solanaTransfers';
import { Keypair } from '@solana/web3.js';

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
  SendCryptoComplete: { symbol: string; amount: string; toAddress: string; signature: string };
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { setNavHidden } = useNavVisibility();
  const { chain } = useChain();
  const { wallet } = useWalletSession();

  useFocusEffect(
    React.useCallback(() => {
      setNavHidden(true);
      return () => setNavHidden(false);
    }, [setNavHidden]),
  );

  const handleSend = async () => {
    if (isSubmitting) return;
    setFormError(null);
    const trimmedAddress = address.trim();
    const amountValue = Number(amount);
    const availableValue = Number(balance ?? '0');

    if (!trimmedAddress) {
      setFormError('Enter a recipient address.');
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    if (Number.isFinite(availableValue) && amountValue > availableValue) {
      setFormError('Insufficient balance.');
      return;
    }
    if (symbol && symbol !== 'SOL') {
      setFormError('Only SOL transfers are supported on devnet right now.');
      return;
    }
    if (chain.kind !== 'solana') {
      setFormError('Solana devnet is required for sending right now.');
      return;
    }
    if (!wallet || !(wallet instanceof Keypair)) {
      setFormError('Wallet is locked. Unlock to send.');
      return;
    }

    setIsSubmitting(true);
    try {
      const signature = await sendSolTransfer(wallet, trimmedAddress, amountValue);
      navigation.navigate('SendCryptoComplete', {
        symbol: symbol ?? 'SOL',
        amount: amountValue.toString(),
        toAddress: trimmedAddress,
        signature,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to send transaction.');
    } finally {
      setIsSubmitting(false);
    }
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
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[localStyles.title, { color: colors.text }]}>Send {symbol ?? 'Crypto'}</Text>
          <View style={localStyles.headerSpacer} />
        </View>

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

        {formError && <Text style={styles.errorText}>{formError}</Text>}

        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.primaryButton, localStyles.inlineButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={isSubmitting}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Sending...' : 'Withdraw'}</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
    textAlign: 'center',
    flex: 1,
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
