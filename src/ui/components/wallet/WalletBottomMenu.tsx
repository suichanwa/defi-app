import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTheme } from '@theme/ThemeProvider';
import { useWalletSession } from '@context/WalletSessionProvider';

type WalletBottomMenuProps = {
  walletId: string | null;
  visible: boolean;
  onClose: () => void;
};

export default function WalletBottomMenu({ walletId, visible, onClose }: WalletBottomMenuProps) {
  const { colors } = useTheme();
  const { wallets, removeWallet } = useWalletSession();
  const [isDeleting, setIsDeleting] = useState(false);
  const sheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['28%'], []);

  const wallet = wallets.find((record) => record.id === walletId);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const handleDelete = useCallback(() => {
    if (!walletId || isDeleting) return;
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
              onClose();
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  }, [isDeleting, onClose, removeWallet, walletId]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      backgroundStyle={{ backgroundColor: colors.card }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <View style={localStyles.content}>
        <Text style={[localStyles.title, { color: colors.text }]}>Wallet options</Text>
        {wallet?.label ? <Text style={[localStyles.subtitle, { color: colors.muted }]}>{wallet.label}</Text> : null}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[localStyles.deleteButton, isDeleting && localStyles.buttonDisabled]}
          onPress={handleDelete}
          disabled={isDeleting || !walletId}
        >
          <Text style={localStyles.deleteButtonText}>{isDeleting ? 'Deleting...' : 'Delete wallet'}</Text>
        </TouchableOpacity>
      </View>
    </BottomSheetModal>
  );
}

const localStyles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 20,
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
