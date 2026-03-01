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
import { t } from '@i18n';
import { HDNodeWallet, isAddress, Wallet } from 'ethers';
import { getErc20TokenBySymbol } from '@config/tokens';
import { sendErc20Transfer, sendEthTransfer } from '@services/ethereumTransfers';

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
  const selectedToken = useMemo(
    () =>
      chain.kind === 'ethereum' && symbol && symbol !== chain.nativeToken.symbol
        ? getErc20TokenBySymbol(symbol)
        : null,
    [chain, symbol],
  );

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
    const availableValue = Number((balance ?? '0').replace(/,/g, ''));

    if (!trimmedAddress) {
      setFormError(t('wallet.sendCrypto.errors.enterRecipient'));
      return;
    }
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setFormError(t('wallet.sendCrypto.errors.enterAmount'));
      return;
    }
    if (Number.isFinite(availableValue) && amountValue > availableValue) {
      setFormError(t('wallet.sendCrypto.errors.insufficientBalance'));
      return;
    }
    setIsSubmitting(true);
    try {
      let signature = '';

      if (chain.kind === 'solana') {
        if (symbol && symbol !== 'SOL') {
          setFormError(t('wallet.sendCrypto.errors.onlySolSupported'));
          return;
        }
        if (!wallet || !(wallet instanceof Keypair)) {
          setFormError(t('wallet.sendCrypto.errors.walletLocked'));
          return;
        }
        signature = await sendSolTransfer(wallet, trimmedAddress, amountValue);
      } else {
        if (!isAddress(trimmedAddress)) {
          setFormError('Enter a valid Ethereum address.');
          return;
        }
        if (symbol && symbol !== chain.nativeToken.symbol && !selectedToken) {
          setFormError('Token is not configured for transfers yet.');
          return;
        }
        if (!wallet || wallet instanceof Keypair || (!(wallet instanceof Wallet) && !(wallet instanceof HDNodeWallet))) {
          setFormError('Wallet is locked. Unlock to send.');
          return;
        }
        if (selectedToken) {
          signature = await sendErc20Transfer(wallet, selectedToken, trimmedAddress, amountValue);
        } else {
          signature = await sendEthTransfer(wallet, trimmedAddress, amountValue);
        }
      }

      navigation.navigate('SendCryptoComplete', {
        symbol: symbol ?? chain.nativeToken.symbol,
        amount: amountValue.toString(),
        toAddress: trimmedAddress,
        signature,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('wallet.sendCrypto.errors.unableToSend'));
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
          <Text style={[localStyles.title, { color: colors.text }]}>
            {t('wallet.sendCrypto.title', {
              symbol: symbol ?? t('wallet.sendCrypto.fallbackSymbol'),
            })}
          </Text>
          <View style={localStyles.headerSpacer} />
        </View>

        <View style={localStyles.fieldGroup}>
          <Text style={[localStyles.label, { color: colors.text }]}>
            {t('wallet.sendCrypto.addressLabel')}
          </Text>
          <View
            style={[
              localStyles.inputRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              placeholder={t('wallet.sendCrypto.addressPlaceholder')}
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
          <Text style={[localStyles.label, { color: colors.text }]}>
            {t('wallet.sendCrypto.networkLabel')}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              localStyles.inputRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => setNetwork(network)}
          >
            <Text style={[localStyles.placeholder, { color: colors.muted }]}>
              {t('wallet.sendCrypto.networkPlaceholder')}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.muted} />
          </TouchableOpacity>
        </View>

        <View style={localStyles.fieldGroup}>
          <Text style={[localStyles.label, { color: colors.text }]}>
            {t('wallet.sendCrypto.amountLabel')}
          </Text>
          <View
            style={[
              localStyles.inputRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              placeholder={t('wallet.sendCrypto.amountPlaceholder')}
              placeholderTextColor={colors.muted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={[localStyles.inputText, { color: colors.text }]}
            />
            <View style={localStyles.amountSuffix}>
              <Text style={[localStyles.suffixText, { color: colors.text }]}>{symbol ?? 'BTC'}</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={[localStyles.maxText, { color: colors.accent }]}>
                  {t('wallet.sendCrypto.max')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={localStyles.availableRow}>
            <Text style={[localStyles.availableLabel, { color: colors.muted }]}>
              {t('wallet.sendCrypto.available')}
            </Text>
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
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? t('wallet.sendCrypto.sending') : t('wallet.sendCrypto.withdraw')}
          </Text>
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
