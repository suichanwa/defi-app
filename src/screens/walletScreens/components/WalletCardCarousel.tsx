import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  activeIndex: number;
  cardWidth: number;
  displayTotal: number;
  formatCurrency: (value: number) => string;
  actions: TAction[];
  onActionPress: (action: TAction) => void;
  onEditWallet: (walletId: string) => void;
  onSettingsWallet: (walletId: string) => void;
  onActivateWallet: (walletId: string) => void;
};

export default function WalletCardCarousel<TAction extends WalletActionItem>({
  walletList,
  activeWalletId,
  activeIndex,
  cardWidth,
  displayTotal,
  formatCurrency,
  actions,
  onActionPress,
  onEditWallet,
  onSettingsWallet,
  onActivateWallet,
}: WalletCardCarouselProps<TAction>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createWalletStyles(colors), [colors]);
  const walletScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!walletList.length || !cardWidth) return;
    walletScrollRef.current?.scrollTo({ x: activeIndex * cardWidth, animated: false });
  }, [activeIndex, cardWidth, walletList.length]);

  return (
    <View style={styles.cardWrapper}>
      <ScrollView
        ref={walletScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => {
          if (!cardWidth || !walletList.length) return;
          walletScrollRef.current?.scrollTo({ x: activeIndex * cardWidth, animated: false });
        }}
        onMomentumScrollEnd={(event) => {
          if (!cardWidth || walletList.length <= 1) return;
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
          const nextWallet = walletList[nextIndex];
          if (nextWallet) {
            onActivateWallet(nextWallet.id);
          }
        }}
      >
        {walletList.map((wallet, index) => {
          const isActive = wallet.id === activeWalletId || (!activeWalletId && index === 0);
          return (
            <View key={wallet.id} style={{ width: cardWidth }}>
              <View
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
                      onPress={() => onEditWallet(wallet.id)}
                    >
                      <MaterialCommunityIcons name="pencil" size={16} color={colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[localStyles.settingsButton, { borderColor: colors.border }]}
                      onPress={() => onSettingsWallet(wallet.id)}
                    >
                      <MaterialCommunityIcons name="cog" size={16} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.balanceLabel}>Total value</Text>
                <Text style={styles.balance}>{isActive ? formatCurrency(displayTotal) : '--'}</Text>
                {!isActive && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[localStyles.activateButton, { borderColor: colors.border }]}
                    onPress={() => onActivateWallet(wallet.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    pressRetentionOffset={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={[localStyles.activateButtonText, { color: colors.text }]}>Activate wallet</Text>
                  </TouchableOpacity>
                )}
                {isActive && <View style={localStyles.activateSpacer} />}

                <View style={styles.actionsRow}>
                  {actions.map((action) => (
                    <TouchableOpacity
                      key={action.label}
                      style={styles.actionButton}
                      activeOpacity={0.7}
                      onPress={() => onActionPress(action)}
                    >
                      <View style={styles.actionIcon}>
                        <MaterialCommunityIcons name={action.icon} size={22} color="#ffffff" />
                      </View>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
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
                { backgroundColor: index === activeIndex ? colors.accent : colors.border },
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
  activateButton: {
    marginTop: 10,
    height: 38,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  activateSpacer: {
    marginTop: 10,
    height: 38,
  },
  activateButtonText: {
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
