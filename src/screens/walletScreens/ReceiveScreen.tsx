import React from 'react';
import { ScrollView, Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { useTheme } from '@theme/ThemeProvider';
import { CHAIN } from '../../config/chain';

type WalletStackParamList = {
  Receive: { address: string };
};

type ReceiveRouteProp = RouteProp<WalletStackParamList, 'Receive'>;

export default function ReceiveScreen() {
  const { colors } = useTheme();
  const route = useRoute<ReceiveRouteProp>();
  const address = route.params?.address ?? null;

  const handleCopyAddress = async () => {
    if (!address) return;
    await Clipboard.setStringAsync(address);
  };

  const handleShareAddress = async () => {
    if (!address) return;
    await Share.share({
      message: `My ${CHAIN.name} address:\n${address}`,
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>Receive {CHAIN.nativeToken.symbol}</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Share your address to receive funds</Text>

        {address && (
          <View style={[styles.addressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.addressLabel, { color: colors.muted }]}>Your Address</Text>
            <Text style={[styles.addressText, { color: colors.text }]} selectable>
              {address}
            </Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.accent }]}
                onPress={handleCopyAddress}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="content-copy" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Copy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.accent }]}
                onPress={handleShareAddress}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="share-variant" size={20} color="#ffffff" />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  addressCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  addressText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
