import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ALCHEMY_NFT_FALLBACK_OWNER } from '@env';
import { useTheme } from '@theme/ThemeProvider';
import { useChain } from '@context/ChainProvider';
import { fetchAlchemySolanaNfts } from '@services/nft/alchemySolana';

type NftItem = {
  id: string;
  name: string;
  collection: string;
  imageUrl: string | null;
};

type WalletNFTsTabProps = {
  ownerAddress: string | null;
};

const FALLBACK_COLORS = ['#f59e0b', '#6d28d9', '#22c55e', '#fb7185', '#38bdf8', '#f97316'];
const LOCAL_FALLBACK_IMAGE = require('../../../../assets/nfttest/nfttest.jpg');

export default function WalletNFTsTab({ ownerAddress }: WalletNFTsTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { chain } = useChain();
  const [nfts, setNfts] = useState<NftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useLocalFallback, setUseLocalFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (chain.kind !== 'solana') {
        setNfts([]);
        setError('NFT view is available for Solana wallets only.');
        return;
      }
      const fallbackOwner = ALCHEMY_NFT_FALLBACK_OWNER?.trim() || '';
      const shouldUseFallback = chain.cluster !== 'mainnet-beta' || !ownerAddress;
      const targetOwner = shouldUseFallback ? fallbackOwner : ownerAddress;
      if (!targetOwner) {
        setNfts([]);
        setError('Set a fallback Solana mainnet owner to preview NFTs.');
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const items = await fetchAlchemySolanaNfts(targetOwner, 'mainnet-beta');
        if (!cancelled) {
          setNfts(items);
          setUseLocalFallback(shouldUseFallback && items.length === 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load NFTs.');
          setUseLocalFallback(shouldUseFallback);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [ownerAddress, chain]);

  return (
    <View style={styles.grid}>
      {loading && (
        <Text style={[styles.stateText, { color: colors.muted }]}>Loading NFTs...</Text>
      )}
      {!loading && error && (
        <Text style={[styles.stateText, { color: colors.muted }]}>{error}</Text>
      )}
      {!loading && !error && nfts.length === 0 && !useLocalFallback && (
        <Text style={[styles.stateText, { color: colors.muted }]}>No NFTs found.</Text>
      )}
      {useLocalFallback && (
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.card,
            { backgroundColor: `${FALLBACK_COLORS[0]}26`, borderColor: FALLBACK_COLORS[0] },
          ]}
        >
          <Image source={LOCAL_FALLBACK_IMAGE} style={styles.image} resizeMode="cover" />
          <View style={styles.content}>
            <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
              NFT Preview
            </Text>
            <Text numberOfLines={1} style={[styles.collection, { color: colors.muted }]}>
              Local fallback
            </Text>
          </View>
        </TouchableOpacity>
      )}
      {nfts.map((nft, index) => (
        <TouchableOpacity
          key={nft.id}
          activeOpacity={0.85}
          style={[
            styles.card,
            {
              backgroundColor: `${FALLBACK_COLORS[index % FALLBACK_COLORS.length]}26`,
              borderColor: FALLBACK_COLORS[index % FALLBACK_COLORS.length],
            },
          ]}
        >
          {nft.imageUrl ? (
            <Image source={{ uri: nft.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imageFallback}>
              <Ionicons name="image" size={22} color="#ffffff" />
            </View>
          )}
          <View style={styles.content}>
            <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
              {nft.name}
            </Text>
            <Text numberOfLines={1} style={[styles.collection, { color: colors.muted }]}>
              {nft.collection}
            </Text>
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
    stateText: {
      fontSize: 13,
      fontWeight: '600',
      marginBottom: 8,
    },
    card: {
      width: '47%',
      borderRadius: 18,
      borderWidth: 1.5,
      padding: 12,
      minHeight: 200,
    },
    name: {
      fontSize: 14,
      fontWeight: '700',
    },
    collection: {
      fontSize: 12,
      fontWeight: '600',
    },
    image: {
      width: '100%',
      height: 110,
      borderRadius: 12,
      marginBottom: 12,
      backgroundColor: '#0f172a',
    },
    imageFallback: {
      width: '100%',
      height: 110,
      borderRadius: 12,
      marginBottom: 12,
      backgroundColor: '#0f172a',
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      gap: 6,
    },
  });
