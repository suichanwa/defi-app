import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';
import type { WalletRecordMeta } from '@app-types/wallet';

export type WalletActionItem = {
  label: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
};

type WalletCardCarouselProps<TAction extends WalletActionItem> = {
  walletList: WalletRecordMeta[];
  activeWalletId: string | null;
  viewedIndex: number;
  displayTotal: number;
  formatCurrency: (value: number) => string;
  actions: TAction[];
  onActionPress: (action: TAction) => void | Promise<void>;
  onSettingsWallet: (walletId: string) => void | Promise<void>;
  onActivateWallet: (walletId: string) => Promise<void>;
  activatingWalletId: string | null;
  onViewedIndexChange: (index: number) => void;
};

export default function WalletCardCarousel<TAction extends WalletActionItem>({
  walletList,
  activeWalletId,
  viewedIndex,
  displayTotal,
  formatCurrency,
  actions,
  onActionPress,
  onSettingsWallet,
  onActivateWallet,
  activatingWalletId,
  onViewedIndexChange,
}: WalletCardCarouselProps<TAction>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const walletScrollRef = useRef<ScrollView>(null);
  const lastSyncedIndexRef = useRef<number>(-1);
  const [containerWidth, setContainerWidth] = useState(0);
  const pageWidth = containerWidth > 0 ? containerWidth : 0;
  const clampedViewedIndex = useMemo(() => {
    if (!walletList.length) return 0;
    return Math.max(0, Math.min(viewedIndex, walletList.length - 1));
  }, [viewedIndex, walletList.length]);
  const runAsync = useCallback((fn: () => void | Promise<void>) => {
    Promise.resolve(fn()).catch((error) => {
      console.error('[WalletCardCarousel] async handler failed', error);
    });
  }, []);
  const handleActionPress = useCallback(
    (action: TAction) => {
      Promise.resolve(onActionPress(action)).catch((error) => {
        console.error('[WalletCardCarousel] action press failed', error);
      });
    },
    [onActionPress],
  );

  useEffect(() => {
    if (!walletList.length || !pageWidth) return;
    if (lastSyncedIndexRef.current === clampedViewedIndex) return;
    walletScrollRef.current?.scrollTo({ x: clampedViewedIndex * pageWidth, animated: false });
    lastSyncedIndexRef.current = clampedViewedIndex;
  }, [clampedViewedIndex, pageWidth, walletList.length]);

  useEffect(() => {
    if (!walletList.length) {
      lastSyncedIndexRef.current = -1;
    }
  }, [walletList.length]);

  useEffect(() => {
    if (!walletList.length) return;
    if (viewedIndex !== clampedViewedIndex) {
      onViewedIndexChange(clampedViewedIndex);
    }
  }, [walletList.length, viewedIndex, clampedViewedIndex, onViewedIndexChange]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!pageWidth || walletList.length === 0) return;
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      const clampedIndex = Math.max(0, Math.min(nextIndex, walletList.length - 1));
      lastSyncedIndexRef.current = clampedIndex;
      if (clampedIndex !== viewedIndex) {
        onViewedIndexChange(clampedIndex);
      }
    },
    [pageWidth, walletList.length, viewedIndex, onViewedIndexChange],
  );

  return (
    <View
      style={styles.cardWrapper}
      onLayout={(event) => {
        const width = Math.round(event.nativeEvent.layout.width);
        if (width > 0 && width !== containerWidth) {
          setContainerWidth(width);
        }
      }}
    >
      <ScrollView
        ref={walletScrollRef}
        horizontal
        pagingEnabled
        snapToInterval={pageWidth || undefined}
        decelerationRate="fast"
        disableIntervalMomentum
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {walletList.map((wallet, index) => {
          const isActive = wallet.id === activeWalletId || (!activeWalletId && index === 0);
          const isActivating = wallet.id === activatingWalletId;
          return (
            <View key={wallet.id} style={{ width: pageWidth || '100%' }}>
              <TouchableOpacity
                activeOpacity={0.92}
                disabled={isActive || isActivating}
                onPress={() => runAsync(() => onActivateWallet(wallet.id))}
                style={[
                  styles.walletCard,
                  {
                    borderColor: wallet.color ?? colors.border,
                    backgroundColor: wallet.color ? `${wallet.color}12` : colors.card,
                  },
                ]}
              >
                <View style={styles.walletHeader}>
                  <Text style={styles.pill}>{isActive ? 'Active' : 'Wallet'}</Text>
                  <Text style={styles.walletTitle}>{wallet.label ?? `Wallet ${index + 1}`}</Text>
                  <View style={localStyles.headerActions}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[localStyles.settingsButton, { borderColor: colors.border }]}
                      onPress={() => runAsync(() => onSettingsWallet(wallet.id))}
                    >
                      <MaterialCommunityIcons name="cog" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.balanceLabel}>Total value</Text>
                <Text style={styles.balance}>{isActive ? formatCurrency(displayTotal) : '--'}</Text>
                {isActivating && (
                  <View style={localStyles.activatingRow}>
                    <ActivityIndicator size="small" color={colors.accent} />
                    <Text style={[localStyles.activatingText, { color: colors.accent }]}>Activating...</Text>
                  </View>
                )}

                <View style={styles.actionsRow}>
                  {actions.map((action) => (
                    <Pressable
                      key={action.label}
                      style={({ pressed }) => [styles.actionButton, pressed && localStyles.actionButtonPressed]}
                      onPress={() => handleActionPress(action)}
                    >
                      <View style={styles.actionIcon}>
                        <MaterialCommunityIcons name={action.icon} size={22} color="#ffffff" />
                      </View>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
      {walletList.length > 1 && (
        <View style={localStyles.walletPager}>
          {walletList.map((wallet, index) => (
            <View
              key={`wallet-dot-${wallet.id}`}
              style={[
                localStyles.walletDot,
                { backgroundColor: index === viewedIndex ? colors.accent : colors.border },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const localStyles = StyleSheet.create({
  walletPager: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  walletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activatingRow: {
    marginTop: 8,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activatingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  headerActions: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});
