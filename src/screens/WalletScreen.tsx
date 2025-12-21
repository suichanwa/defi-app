import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated as RNAnimated, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { ethers, Wallet } from 'ethers';
import PulseBadge from '@components/PulseBadge';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '../theme/ThemeProvider';
import { useWalletSession } from '../context/WalletSessionProvider';
import { ERC20_TOKENS } from '../config/tokens';
import { fetchNativeBalance, fetchTokenBalances } from '../services/balances';
import { CHAIN } from '../config/chain';
import { getProvider } from '../services/provider';
import WalletSetupScreen from '@components/wallet/WalletSetupScreen';
import ReceiveScreen from '@components/wallet/ReceiveScreen';
import SendScreen from '@components/wallet/SendScreen';
import NetworkBadge from '@components/wallet/NetworkBadge';
import { rpcErrorMessage, walletErrorMessage } from '../utils/walletErrors';
import ErrorDialog from '@components/common/ErrorDialog';
import { fetchSolBalance } from '../services/solanaBalances';
import { getSolanaConnection } from '../services/solanaProvider';
import {
  canUseBiometrics,
  getBiometricPassword,
  promptBiometric,
  saveBiometricPassword,
} from '../services/biometrics';

type Action = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

type TokenBalance = {
  name: string;
  symbol: string;
  amount: number;
  pair?: string;
  color: string;
  fixedPrice?: number;
};

const actions: Action[] = [
  { label: 'Receive', icon: 'qrcode-scan' },
  { label: 'Send', icon: 'send' },
];

const defaultTokens: TokenBalance[] = [
  {
    name: CHAIN.nativeToken.name,
    symbol: CHAIN.nativeToken.symbol,
    amount: 0,
    pair: CHAIN.nativeToken.priceSymbol,
    color: CHAIN.nativeToken.color,
  },
  ...(CHAIN.kind === 'ethereum'
    ? ERC20_TOKENS.map<TokenBalance>((t) => ({
        name: t.name,
        symbol: t.symbol,
        amount: 0,
        pair: t.priceSymbol,
        color: t.symbol === 'USDC' ? '#0ea5e9' : '#f59e0b',
      }))
    : []),
];

export default function WalletScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const {
    status,
    address,
    wallet,
    recoveryPhrase,
    backupCompleted,
    unlock,
    createWallet,
    importWallet,
    confirmBackup,
  } = useWalletSession();

  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [chainTokens, setChainTokens] = useState<TokenBalance[]>(defaultTokens);
  const [flow, setFlow] = useState<
    'menu' | 'create-passcode' | 'create-recovery' | 'create-success' | 'unlock' | 'receive' | 'send'
  >('menu');
  const [walletPassword, setWalletPassword] = useState('');
  const [walletPasswordConfirm, setWalletPasswordConfirm] = useState('');
  const [unlockPassword, setUnlockPassword] = useState('');
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [backupMnemonic, setBackupMnemonic] = useState<string | null>(null);
  const [backupAcknowledged, setBackupAcknowledged] = useState(false);
  const [backupSkipped, setBackupSkipped] = useState(false);
  const [confirmWord1, setConfirmWord1] = useState('');
  const [confirmWord2, setConfirmWord2] = useState('');
  const [confirmIndices, setConfirmIndices] = useState<[number, number]>([1, 5]);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [flowMessage, setFlowMessage] = useState<string | null>(null);
  const [fetchingChain, setFetchingChain] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sendTo, setSendTo] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendStep, setSendStep] = useState<'form' | 'confirm' | 'pending'>('form');
  const [sendFeeNative, setSendFeeNative] = useState<string | null>(null);
  const [sendTxHash, setSendTxHash] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  const totalValueAnimated = useRef(new RNAnimated.Value(0)).current;
  const [displayTotal, setDisplayTotal] = useState(0);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackedPairs = useMemo(() => chainTokens.filter((t) => t.pair).map((t) => t.pair as string), [chainTokens]);

  const formatCurrency = (value: number) => {
    if (typeof Intl !== 'undefined' && typeof Intl.NumberFormat === 'function') {
      return Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
    }
    const rounded = Math.round(value * 100) / 100;
    return `$${rounded.toFixed(2)}`;
  };

  const fetchPrices = async () => {
    if (trackedPairs.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const url = `https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(
        JSON.stringify(trackedPairs),
      )}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Binance status ${response.status}`);
      }
      const data: { symbol: string; price: string }[] = await response.json();
      const next: Record<string, number> = {};
      data.forEach((item) => {
        next[item.symbol] = Number(item.price);
      });
      setPrices(next);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError('Unable to load live prices right now.');
    } finally {
      setLoading(false);
    }
  };

  const totalValueUSD = useMemo(() => {
    return chainTokens.reduce((sum, token) => {
      const livePrice =
        token.pair && typeof prices[token.pair] === 'number'
          ? prices[token.pair]
          : token.fixedPrice !== undefined
          ? token.fixedPrice
          : undefined;
      if (typeof livePrice !== 'number') return sum;
      return sum + livePrice * token.amount;
    }, 0);
  }, [prices, chainTokens]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 1_000);
    return () => clearInterval(interval);
  }, [trackedPairs]);

  useEffect(() => {
    totalValueAnimated.setValue(totalValueUSD);
    const id = totalValueAnimated.addListener(({ value }) => setDisplayTotal(value));
    return () => totalValueAnimated.removeListener(id);
  }, [totalValueAnimated, totalValueUSD]);

  useEffect(() => {
    RNAnimated.timing(totalValueAnimated, {
      toValue: totalValueUSD,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [totalValueUSD, totalValueAnimated]);

  useEffect(() => {
    if (status === 'missing') {
      setFlow('menu');
    } else if (status === 'locked') {
      setFlow('unlock');
    }
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    
    const tryBiometricUnlock = async () => {
      if (status !== 'locked') return;
      
      // Check if biometrics are available on this device
      const canUse = await canUseBiometrics();
      if (!canUse || cancelled) return;
      
      // Check if there's a stored biometric password first
      const stored = await getBiometricPassword();
      if (!stored || cancelled) return; // No stored password, user needs to unlock manually first
      
      // Prompt for biometric authentication
      const auth = await promptBiometric('Unlock wallet with fingerprint');
      if (!auth.success || cancelled) return; // User canceled or failed, let them use PIN
      
      // Attempt to unlock with stored password
      try {
        await unlock(stored);
        if (!cancelled) setFlow('menu');
      } catch {
        // Silent fail - user can still unlock manually with PIN
      }
    };

    tryBiometricUnlock();
    
    return () => {
      cancelled = true;
    };
  }, [status, unlock]);

  useEffect(() => {
    if (status !== 'unlocked' || backupCompleted || backupMnemonic) return;
    if (!recoveryPhrase) return;
    startBackupConfirm(normalizeMnemonic(recoveryPhrase));
  }, [status, backupCompleted, backupMnemonic, recoveryPhrase]);

  useEffect(() => {
    const loadOnChain = async () => {
      if (status !== 'unlocked' || !address) return;
      setFetchingChain(true);
      try {
        if (CHAIN.kind === 'solana') {
          const native = await fetchSolBalance(address);
          const nextTokens: TokenBalance[] = defaultTokens.map((token) =>
            token.symbol === CHAIN.nativeToken.symbol ? { ...token, amount: Number(native) } : token,
          );
          setChainTokens(nextTokens);
        } else {
          const [native, erc20] = await Promise.all([
            fetchNativeBalance(address),
            fetchTokenBalances(address, ERC20_TOKENS),
          ]);
          const nextTokens: TokenBalance[] = defaultTokens.map((token) => {
            if (token.symbol === CHAIN.nativeToken.symbol) {
              return { ...token, amount: Number(native) };
            }
            const match = erc20[token.symbol];
            return { ...token, amount: match ? Number(match) : 0 };
          });
          setChainTokens(nextTokens);
        }
        setRpcError(null);
      } catch (error) {
        const rpcMessage = rpcErrorMessage(error);
        setRpcError(rpcMessage ?? 'Unable to load on-chain balances.');
      } finally {
        setFetchingChain(false);
      }
    };
    loadOnChain();
  }, [status, address]);

  const resetFlowMessages = () => {
    setFlowError(null);
    setFlowMessage(null);
  };

  const resetSetupState = () => {
    setWalletPassword('');
    setWalletPasswordConfirm('');
    setUnlockPassword('');
    setMnemonicInput('');
    setBackupMnemonic(null);
    setBackupAcknowledged(false);
    setBackupSkipped(false);
    setConfirmWord1('');
    setConfirmWord2('');
    setConfirmIndices([1, 5]);
  };

  const normalizeMnemonic = (phrase: string) =>
    phrase
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .join(' ');

  const parseAmountToLamports = (value: string) => {
    const trimmed = value.trim();
    if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
    const [whole, fraction = ''] = trimmed.split('.');
    if (fraction.length > 9) return null;
    const wholeLamports = BigInt(whole) * BigInt(LAMPORTS_PER_SOL);
    const fractionLamports = BigInt(fraction.padEnd(9, '0'));
    const lamports = wholeLamports + fractionLamports;
    if (lamports <= 0n) return null;
    if (lamports > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    return Number(lamports);
  };

  const passcodePolicy = (value: string) => {
    if (!/^\d{6}$/.test(value)) return 'Passcode must be 6 digits.';
    return null;
  };

  const startBackupConfirm = (mnemonic: string) => {
    const words = mnemonic.split(' ');
    if (words.length < 6) {
      setFlowError('Unexpected mnemonic length.');
      return;
    }
    const idx1 = Math.floor(Math.random() * words.length);
    let idx2 = Math.floor(Math.random() * words.length);
    if (idx2 === idx1) {
      idx2 = (idx2 + 3) % words.length;
    }
    setConfirmIndices([idx1, idx2]);
    setBackupMnemonic(mnemonic);
    setBackupAcknowledged(false);
    setBackupSkipped(false);
    setConfirmWord1('');
    setConfirmWord2('');
    setFlow('create-recovery');
  };

  const handleCreate = async () => {
    resetFlowMessages();
    const policy = passcodePolicy(walletPassword);
    if (policy) {
      setFlowError(policy);
      setShowErrorDialog(true);
      return;
    }
    if (walletPassword !== walletPasswordConfirm) {
      setFlowError('Passcodes do not match.');
      setShowErrorDialog(true);
      return;
    }
    setIsSubmitting(true);
    startSlowMessage('Yeah, this might take a moment...');
    try {
      const passcode = walletPassword;
      const { mnemonic } = await createWallet(passcode);
      const normalized = normalizeMnemonic(mnemonic);
      setBackupSkipped(false);
      startBackupConfirm(normalized);
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet created. Back up your recovery phrase.');
      if (biometricsAvailable) {
        await saveBiometricPassword(passcode);
      }
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'create'));
      setShowErrorDialog(true);
    } finally {
      clearSlowMessage();
      setIsSubmitting(false);
    }
  };

  const handleImport = async () => {
    resetFlowMessages();
    const phrase = normalizeMnemonic(mnemonicInput);
    const words = phrase.split(' ');
    if (!phrase) {
      setFlowError('Enter your 12 or 24 word phrase.');
      setShowErrorDialog(true);
      return;
    }
    if (![12, 24].includes(words.length)) {
      setFlowError('Mnemonic must be 12 or 24 words.');
      setShowErrorDialog(true);
      return;
    }
    const policy = passcodePolicy(walletPassword);
    if (policy) {
      setFlowError(policy);
      setShowErrorDialog(true);
      return;
    }
    if (walletPassword !== walletPasswordConfirm) {
      setFlowError('Passcodes do not match.');
      setShowErrorDialog(true);
      return;
    }
    setIsSubmitting(true);
    startSlowMessage('Yeah, this might take a moment...');
    try {
      const passcode = walletPassword;
      await importWallet(phrase, passcode);
      await confirmBackup();
      setBackupMnemonic(null);
      setBackupSkipped(false);
      setMnemonicInput('');
      setWalletPassword('');
      setWalletPasswordConfirm('');
      setFlowMessage('Wallet imported.');
      setFlow('create-success');
      if (biometricsAvailable) {
        await saveBiometricPassword(passcode);
      }
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'import'));
      setShowErrorDialog(true);
    } finally {
      clearSlowMessage();
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    resetFlowMessages();
    const policy = passcodePolicy(unlockPassword);
    if (policy) {
      setFlowError(policy);
      setShowErrorDialog(true);
      return;
    }
    setIsSubmitting(true);
    startSlowMessage('Yeah, this might take a moment...');
    try {
      await unlock(unlockPassword);
      setFlow('menu');
      setFlowMessage('Wallet unlocked.');
      if (biometricsAvailable) {
        await saveBiometricPassword(unlockPassword);
      }
      setUnlockPassword('');
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'unlock'));
      setShowErrorDialog(true);
    } finally {
      clearSlowMessage();
      setIsSubmitting(false);
    }
  };

  const handleBiometricUnlock = async () => {
    resetFlowMessages();
    if (!biometricsAvailable) {
      setFlowError('Biometric unlock not available on this device.');
      setShowErrorDialog(true);
      return;
    }
    const auth = await promptBiometric('Unlock wallet');
    if (!auth.success) {
      setFlowError(auth.error ?? 'Biometric unlock canceled.');
      setShowErrorDialog(true);
      return;
    }
    const stored = await getBiometricPassword();
    if (!stored) {
      setFlowError('No biometric passcode stored yet. Unlock once with your passcode first.');
      setShowErrorDialog(true);
      return;
    }
    setIsSubmitting(true);
    startSlowMessage('Yeah, this might take a moment...');
    try {
      await unlock(stored);
      setFlow('menu');
      setFlowMessage('Wallet unlocked.');
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'unlock'));
      setShowErrorDialog(true);
    } finally {
      clearSlowMessage();
      setIsSubmitting(false);
    }
  };

  const handleConfirmBackup = async () => {
    if (!backupMnemonic) {
      setFlow('menu');
      return;
    }
    const words = backupMnemonic.split(' ');
    const [i1, i2] = confirmIndices;
    if (!backupAcknowledged) {
      setFlowError('Confirm you wrote it down.');
      return;
    }
    if (words[i1] !== confirmWord1.trim().toLowerCase() || words[i2] !== confirmWord2.trim().toLowerCase()) {
      setFlowError('Words do not match. Try again.');
      return;
    }
    setIsSubmitting(true);
    await confirmBackup();
    setBackupMnemonic(null);
    setBackupSkipped(false);
    setFlowMessage('Recovery phrase confirmed.');
    setFlow('create-success');
    setIsSubmitting(false);
  };

  const handleSkipBackup = async () => {
    if (isSubmitting) return;
    resetFlowMessages();
    if (!backupMnemonic) {
      setFlow('menu');
      return;
    }
    setIsSubmitting(true);
    try {
      await confirmBackup();
      setBackupMnemonic(null);
      setBackupSkipped(true);
      setFlowMessage('Recovery phrase skipped.');
      setFlow('create-success');
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Unable to skip recovery phrase.');
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishSetup = () => {
    resetFlowMessages();
    setBackupMnemonic(null);
    setBackupSkipped(false);
    setFlow('menu');
  };

  const handleCopyAddress = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setFlowMessage('Address copied.');
  };

  const startSlowMessage = (text: string) => {
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    slowTimerRef.current = setTimeout(() => {
      setFlowMessage((prev) => prev ?? text);
    }, 5000);
  };

  const clearSlowMessage = () => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  };

  useEffect(() => {
    canUseBiometrics().then(setBiometricsAvailable).catch(() => setBiometricsAvailable(false));
  }, []);

  const handleShareAddress = async () => {
    if (!address) return;
    await Share.share({
      message: `My ${CHAIN.name} address:\n${address}`,
    });
  };

  const handlePrepareSend = async () => {
    resetFlowMessages();
    setSendFeeNative(null);
    setSendTxHash(null);
    if (!wallet || !address) {
      setFlowError('Unlock your wallet first.');
      setShowErrorDialog(true);
      return;
    }
    if (CHAIN.kind === 'solana') {
      let toPubkey: PublicKey;
      try {
        toPubkey = new PublicKey(sendTo.trim());
      } catch (error) {
        setFlowError('Enter a valid recipient address.');
        setShowErrorDialog(true);
        return;
      }
      const lamports = parseAmountToLamports(sendAmount);
      if (!lamports) {
        setFlowError('Enter a valid amount.');
        setShowErrorDialog(true);
        return;
      }
      setIsSubmitting(true);
      try {
        const keypair = wallet as Keypair;
        const connection = getSolanaConnection();
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        const tx = new Transaction({ feePayer: keypair.publicKey, recentBlockhash: blockhash }).add(
          SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey, lamports }),
        );
        const fee = await connection.getFeeForMessage(tx.compileMessage());
        if (fee.value === null) {
          setFlowError('Unable to estimate network fee.');
          return;
        }
        setSendFeeNative((fee.value / LAMPORTS_PER_SOL).toFixed(6));
        setSendStep('confirm');
      } catch (error) {
        setFlowError(walletErrorMessage(error, 'send'));
        setShowErrorDialog(true);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!ethers.utils.isAddress(sendTo.trim())) {
      setFlowError('Enter a valid recipient address.');
      setShowErrorDialog(true);
      return;
    }
    if (!sendAmount || Number(sendAmount) <= 0) {
      setFlowError('Enter a valid amount.');
      setShowErrorDialog(true);
      return;
    }
    setIsSubmitting(true);
    try {
      const provider = getProvider();
      const value = ethers.utils.parseEther(sendAmount);
      const gasLimit = await provider.estimateGas({ to: sendTo.trim(), value, from: address });
      const feeData = await provider.getFeeData();
      const feePerGas = feeData.maxFeePerGas ?? feeData.gasPrice;
      if (!feePerGas) {
        setFlowError('Unable to estimate network fee.');
        return;
      }
      const fee = gasLimit.mul(feePerGas);
      setSendFeeNative(ethers.utils.formatEther(fee));
      setSendStep('confirm');
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'send'));
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSend = async () => {
    resetFlowMessages();
    if (!wallet || !address) {
      setFlowError('Unlock your wallet first.');
      return;
    }
    setIsSubmitting(true);
    setSendStep('pending');
    try {
      if (CHAIN.kind === 'solana') {
        const lamports = parseAmountToLamports(sendAmount);
        if (!lamports) {
          setFlowError('Enter a valid amount.');
          setSendStep('form');
          return;
        }
        const toPubkey = new PublicKey(sendTo.trim());
        const keypair = wallet as Keypair;
        const connection = getSolanaConnection();
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
        const tx = new Transaction({ feePayer: keypair.publicKey, recentBlockhash: blockhash }).add(
          SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey, lamports }),
        );
        const signature = await connection.sendTransaction(tx, [keypair]);
        setSendTxHash(signature);
        setFlowMessage('Transaction sent. Waiting for confirmation...');
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
        setFlowMessage('Transaction confirmed.');
        setSendStep('form');
        setSendTo('');
        setSendAmount('');
        setFlow('menu');
        return;
      }

      const provider = getProvider();
      const value = ethers.utils.parseEther(sendAmount);
      const feeData = await provider.getFeeData();
      const tx = {
        to: sendTo.trim(),
        value,
        maxFeePerGas: feeData.maxFeePerGas ?? undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? undefined,
        gasPrice: feeData.maxFeePerGas ? undefined : feeData.gasPrice ?? undefined,
      };
      const signed = await (wallet as Wallet).connect(provider).sendTransaction(tx);
      setSendTxHash(signed.hash);
      setFlowMessage('Transaction sent. Waiting for confirmation...');
      await provider.waitForTransaction(signed.hash);
      setFlowMessage('Transaction confirmed.');
      setSendStep('form');
      setSendTo('');
      setSendAmount('');
      setFlow('menu');
    } catch (error) {
      setFlowError(walletErrorMessage(error, 'send'));
      setSendStep('form');
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status !== 'unlocked' || backupMnemonic || flow !== 'menu') {
    return (
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        <ErrorDialog
          visible={!!flowError && showErrorDialog}
          title="Wallet error"
          message={flowError ?? ''}
          onClose={() => {
            setShowErrorDialog(false);
            setFlowError(null);
          }}
        />
        {flow === 'receive' ? (
          <ReceiveScreen
            chainName={CHAIN.name}
            address={address}
            flowMessage={flowMessage}
            onCopy={handleCopyAddress}
            onShare={handleShareAddress}
            onBack={() => setFlow('menu')}
          />
        ) : flow === 'send' ? (
          <SendScreen
            chainName={CHAIN.name}
            nativeSymbol={CHAIN.nativeToken.symbol}
            sendTo={sendTo}
            sendAmount={sendAmount}
            sendFeeNative={sendFeeNative}
            sendStep={sendStep}
            isSubmitting={isSubmitting}
            flowError={flowError}
            flowMessage={flowMessage}
            onChangeTo={setSendTo}
            onChangeAmount={setSendAmount}
            onReview={handlePrepareSend}
            onSend={handleSend}
            onEdit={() => setSendStep('form')}
            onBack={() => setFlow('menu')}
          />
        ) : (
          <WalletSetupScreen
            flow={flow}
            status={status}
            walletPassword={walletPassword}
            walletPasswordConfirm={walletPasswordConfirm}
            unlockPassword={unlockPassword}
            mnemonicInput={mnemonicInput}
            backupMnemonic={backupMnemonic}
            backupAcknowledged={backupAcknowledged}
            backupSkipped={backupSkipped}
            confirmWord1={confirmWord1}
            confirmWord2={confirmWord2}
            confirmIndices={confirmIndices}
            flowError={flowError}
            flowMessage={flowMessage}
            isSubmitting={isSubmitting}
            onChangeWalletPassword={setWalletPassword}
            onChangeWalletPasswordConfirm={setWalletPasswordConfirm}
            onChangeUnlockPassword={setUnlockPassword}
            onChangeMnemonic={setMnemonicInput}
            onChangeConfirmWord1={setConfirmWord1}
            onChangeConfirmWord2={setConfirmWord2}
            onToggleBackup={() => setBackupAcknowledged((v) => !v)}
            onCreate={handleCreate}
            onImport={handleImport}
            onUnlock={handleUnlock}
            onConfirmBackup={handleConfirmBackup}
            onBackToMenu={() => {
              resetFlowMessages();
              setFlow('menu');
            }}
            onGoCreate={() => {
              resetFlowMessages();
              setFlow('create-passcode');
            }}
            onGoImport={() => {
              resetFlowMessages();
            }}
            onFinishSetup={handleFinishSetup}
            onSkipBackup={handleSkipBackup}
            onBiometricUnlock={handleBiometricUnlock}
            biometricsAvailable={biometricsAvailable}
          />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Wallet</Text>
          <Text style={styles.headerSubtitle}>On-chain balances with live pricing.</Text>
        </View>
        <View style={styles.headerPills}>
          <NetworkBadge />
          <View style={styles.statusPill}>
            <PulseBadge size={8} color={fetchingChain ? '#f97316' : '#22c55e'} durationMs={1400} />
            <Text style={styles.statusText}>{fetchingChain ? 'Syncing' : 'Live'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardWrapper}>
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <Text style={styles.pill}>Primary</Text>
            <Text style={styles.walletTitle}>Main Wallet</Text>
          </View>
          <Text style={styles.balanceLabel}>Total value</Text>
          <Text style={styles.balance}>{formatCurrency(displayTotal)}</Text>
          {address && <Text style={styles.addressText}>{address}</Text>}

          <View style={styles.actionsRow}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionButton}
                activeOpacity={0.85}
                onPress={() => {
                  if (action.label === 'Receive') {
                    setFlow('receive');
                    setFlowMessage(null);
                  }
                  if (action.label === 'Send') {
                    resetFlowMessages();
                    setSendStep('form');
                    setFlow('send');
                  }
                }}
              >
                <View style={styles.actionIcon}>
                  <MaterialCommunityIcons name={action.icon} size={20} color="#111827" />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput placeholder="Search" placeholderTextColor="#9ca3af" style={styles.searchInput} />
        <MaterialCommunityIcons name="link-variant" size={22} color="#111827" style={styles.searchIcon} />
        <MaterialCommunityIcons name="magnify" size={22} color="#111827" style={styles.searchIcon} />
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Prices: {lastUpdated ? `Updated ${lastUpdated}` : 'Loading...'}</Text>
        </View>
      )}
      {rpcError && <Text style={styles.errorText}>{rpcError}</Text>}

      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBase, styles.tabActive, styles.tabSpacing]}>
          <Text style={styles.tabActiveText}>Tokens</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBase, styles.tabInactive, styles.tabSpacing]}>
          <Text style={styles.tabInactiveText}>NFT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBase, styles.tabInactive]}>
          <Text style={styles.tabInactiveText}>More</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listCard}>
        {chainTokens.map((token, index) => (
          <View key={token.symbol} style={[styles.tokenRow, index !== chainTokens.length - 1 && styles.tokenRowSpacing]}>
            <View style={[styles.tokenIcon, { backgroundColor: `${token.color}22`, borderColor: token.color }]}>
              <Ionicons name="ellipse" size={14} color={token.color} />
            </View>
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenName}>{token.name}</Text>
              <Text style={styles.tokenSymbol}>{token.symbol}</Text>
            </View>
            <View style={styles.tokenAmounts}>
              <Text style={styles.tokenBalance}>
                {token.amount.toFixed(token.amount < 1 ? 6 : 4)} {token.symbol}
              </Text>
              <Text style={styles.tokenValue}>
                {(() => {
                  const livePrice =
                    token.pair && typeof prices[token.pair] === 'number'
                      ? prices[token.pair]
                      : token.fixedPrice !== undefined
                      ? token.fixedPrice
                      : undefined;
                  if (typeof livePrice !== 'number') return loading ? 'Updating prices...' : '-';
                  return formatCurrency(livePrice * token.amount);
                })()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
