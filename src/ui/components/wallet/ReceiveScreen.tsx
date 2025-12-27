import React, { useMemo } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { createWalletStyles } from '@styles/WalletStyles';
import FlowMessage from './FlowMessage';
import { useTheme } from '@theme/ThemeProvider';
import { useWalletCardAnimation } from '../../../animations/walletAnimations';

type Props = {
  chainName: string;
  address: string | null;
  flowMessage: string | null;
  onCopy: () => void;
  onShare: () => void;
  onBack: () => void;
};

export default function ReceiveScreen({ chainName, address, flowMessage, onCopy, onShare, onBack }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const { animatedStyle } = useWalletCardAnimation([address]);

  return (
    <Animated.View style={[styles.setupCard, animatedStyle]}>
      <Text style={styles.setupTitle}>Receive {chainName}</Text>
      <Text style={styles.setupSubtitle}>Share this address to receive funds.</Text>
      {address ? (
        <View style={styles.qrWrap}>
          <QRCode value={address} size={200} />
        </View>
      ) : (
        <Text style={styles.setupSubtitle}>Wallet address unavailable.</Text>
      )}
      {address && <Text style={styles.addressPill}>{address}</Text>}
      <FlowMessage styles={styles} message={flowMessage} />
      <TouchableOpacity style={styles.primaryButton} onPress={onCopy} activeOpacity={0.9}>
        <Text style={styles.primaryButtonText}>Copy address</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onShare} activeOpacity={0.9}>
        <Text style={styles.secondaryButtonText}>Share</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={onBack} activeOpacity={0.9}>
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
