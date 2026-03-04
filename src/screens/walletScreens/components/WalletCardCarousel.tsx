import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  cardWidth: number;
  displayTotal: number;
  formatCurrency: (value: number) => string;
  actions: TAction[];
  onActionPress: (action: TAction) => void | Promise<void>;
  onEditWallet: (walletId: string) => void | Promise<void>;
  onSettingsWallet: (walletId: string) => void | Promise<void>;
  onActivateWallet: (walletId: string) => Promise<void>;
  activatingWalletId: string | null;
  onViewedIndexChange: (index: number) => void;
};

export default function WalletCardCarousel<TAction extends WalletActionItem>({
  walletList,
  activeWalletId,
  viewedIndex,
  cardWidth,
  displayTotal,
  formatCurrency,
  actions,
  onActionPress,
  onEditWallet,
  onSettingsWallet,
  onActivateWallet,
  activatingWalletId,
  onViewedIndexChange,
}: WalletCardCarouselProps<TAction>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const walletScrollRef = useRef<ScrollView>(null);
  const runAsync = useCallback((fn: () => void | Promise<void>) => {
    Promise.resolve(fn()).catch((error) => {
      console.error('[WalletCardCarousel] async handler failed', error);
    });
  }, []);

  useEffect(() => {
    if (!walletList.length || !cardWidth) return;
    walletScrollRef.current?.scrollTo({ x: viewedIndex * cardWidth, animated: false });
  }, [viewedIndex, cardWidth, walletList.length]);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!cardWidth || walletList.length === 0) return;
      const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
      const clampedIndex = Math.max(0, Math.min(nextIndex, walletList.length - 1));
      if (clampedIndex !== viewedIndex) {
        onViewedIndexChange(clampedIndex);
      }
    },
    [cardWidth, walletList.length, viewedIndex, onViewedIndexChange],
  );

  return (
    <View style={styles.cardWrapper}>
      <ScrollView
        ref={walletScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onContentSizeChange={() => {
          if (!cardWidth || !walletList.length) return;
          walletScrollRef.current?.scrollTo({ x: viewedIndex * cardWidth, animated: false });
        }}
      >
        {walletList.map((wallet, index) => {
          const isActive = wallet.id === activeWalletId || (!activeWalletId && index === 0);
          const isActivating = wallet.id === activatingWalletId;
          return (
            <View key={wallet.id} style={{ width: cardWidth }}>
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
                      style={[localStyles.editButton, { borderColor: colors.border }]}
                      onPress={() => runAsync(() => onEditWallet(wallet.id))}
                    >
                      <MaterialCommunityIcons name="pencil" size={16} color={colors.text} />
                    </TouchableOpacity>
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
                    <TouchableOpacity
                      key={action.label}
                      style={styles.actionButton}
                      activeOpacity={0.7}
                      onPress={() => runAsync(() => onActionPress(action))}
                    >
                      <View style={styles.actionIcon}>
                        <MaterialCommunityIcons name={action.icon} size={22} color="#ffffff" />
                      </View>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
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
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
