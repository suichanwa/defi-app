import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';

type NftItem = {
  id: string;
  name: string;
  collection: string;
  color: string;
};

const MOCK_NFTS: NftItem[] = [
  { id: 'ape-1', name: 'Trickster Ape', collection: 'Bored Set', color: '#f59e0b' },
  { id: 'ape-2', name: 'Halo Ape', collection: 'Bored Set', color: '#6d28d9' },
  { id: 'ape-3', name: 'Neon Ape', collection: 'Bored Set', color: '#22c55e' },
  { id: 'ape-4', name: 'Citrus Ape', collection: 'Bored Set', color: '#fb7185' },
];

export default function WalletNFTsTab() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.grid}>
      {MOCK_NFTS.map((nft) => (
        <TouchableOpacity
          key={nft.id}
          activeOpacity={0.85}
          style={[styles.card, { backgroundColor: `${nft.color}26`, borderColor: nft.color }]}
        >
          <View style={[styles.badge, { backgroundColor: nft.color }]}>
            <Ionicons name="sparkles" size={14} color="#ffffff" />
          </View>
          <View style={styles.content}>
            <Text style={[styles.name, { color: colors.text }]}>{nft.name}</Text>
            <Text style={[styles.collection, { color: colors.muted }]}>{nft.collection}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const createStyles = (colors: { text: string; muted: string }) =>
  StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
    },
    card: {
      width: '47%',
      borderRadius: 18,
      borderWidth: 1.5,
      padding: 16,
      minHeight: 160,
      justifyContent: 'space-between',
    },
    badge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      gap: 6,
    },
    name: {
      fontSize: 14,
      fontWeight: '700',
    },
    collection: {
      fontSize: 12,
      fontWeight: '600',
    },
  });
