import { Platform, StyleSheet } from 'react-native';

export type WalletPalette = {
  background: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentText: string;
  success: string;
  successText: string;
  successBackground: string;
  successBorder: string;
  successCardBackground: string;
  warning: string;
  warningText: string;
  warningBackground: string;
  warningBorder: string;
};

const cardShadow = Platform.select({
  web: {
    boxShadow: '0px 4px 12px rgba(17, 24, 39, 0.16)',
  },
  default: {
    shadowColor: '#111827',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});

export const createWalletStyles = (colors: WalletPalette) =>
  StyleSheet.create({
    errorText: {
      color: '#b91c1c',
      marginTop: 8,
      fontSize: 13,
    },
    successText: {
      color: '#16a34a',
      marginTop: 8,
      fontSize: 13,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      flexWrap: 'wrap',
    },
    metaText: {
      color: colors.muted,
      fontSize: 12,
    },
    scrollContent: {
      paddingBottom: 120,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
    setupCard: {
      marginTop: 24,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 18,
    },
    setupTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    setupSubtitle: {
      marginTop: 6,
      color: colors.muted,
    },
    progressContainer: {
      marginTop: 12,
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 8,
    },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.border,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    loadingRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingText: {
      marginLeft: 8,
      color: colors.muted,
      fontSize: 12,
      fontWeight: '600',
    },
    summaryRow: {
      marginTop: 10,
    },
    summaryLabel: {
      color: colors.muted,
      fontSize: 12,
    },
    summaryValue: {
      marginTop: 4,
      color: colors.text,
      fontWeight: '600',
    },
    checkboxRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    checkboxRowChecked: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}1A`,
    },
    checkboxLabel: {
      marginLeft: 8,
      color: colors.text,
      fontWeight: '600',
    },
    checkboxLabelChecked: {
      color: colors.accent,
    },
    mnemonicGrid: {
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    mnemonicWord: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '50%',
      paddingVertical: 4,
    },
    mnemonicIndex: {
      width: 26,
      color: colors.muted,
    },
    mnemonicText: {
      color: colors.text,
      fontWeight: '600',
    },
    successIconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 78,
      height: 78,
      borderRadius: 39,
      backgroundColor: colors.successBackground,
      borderWidth: 1,
      borderColor: colors.successBorder,
      alignSelf: 'center',
      marginBottom: 10,
      marginTop: 14,
    },
    successCard: {
      borderColor: colors.successBorder,
      backgroundColor: colors.successCardBackground,
    },
    successHero: {
      alignItems: 'center',
      marginBottom: 6,
    },
    successTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
    },
    successSubtitle: {
      marginTop: 6,
      color: colors.muted,
      textAlign: 'center',
    },
    successInfoRow: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.successBorder,
      backgroundColor: colors.successBackground,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
    },
    successInfoRowSkipped: {
      borderColor: colors.warningBorder,
      backgroundColor: colors.warningBackground,
    },
    successInfoText: {
      color: colors.successText,
      fontWeight: '600',
    },
    successInfoTextSkipped: {
      color: colors.warningText,
    },
    qrWrap: {
      marginTop: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addressPill: {
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 12,
      color: colors.text,
      backgroundColor: colors.card,
    },
    deviceCutout: {
      alignSelf: 'center',
      height: 36,
      width: 160,
      borderRadius: 18,
      backgroundColor: colors.text,
      marginTop: 12,
      marginBottom: 16,
    },
    headerRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerPills: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    headerSubtitle: {
      marginTop: 4,
      color: colors.muted,
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    networkBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    networkBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    statusText: {
      marginLeft: 6,
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    cardWrapper: {
      marginTop: 16,
    },
    walletCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      ...(cardShadow ?? {}),
    },
    walletHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    pill: {
      backgroundColor: `${colors.accent}1A`,
      color: colors.accent,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      fontSize: 12,
      fontWeight: '600',
      marginRight: 12,
    },
    walletTitle: {
      color: colors.text,
      fontSize: 14,
    },
    balanceLabel: {
      color: colors.muted,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 1.1,
    },
    balance: {
      color: colors.text,
      fontSize: 32,
      fontWeight: '700',
      marginTop: 6,
      marginBottom: 12,
    },
    addressText: {
      color: colors.muted,
      fontSize: 12,
      marginBottom: 16,
    },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingVertical: 10,
      gap: 6,
    },
    actionIcon: {
      backgroundColor: `${colors.accent}1A`,
      borderRadius: 12,
      padding: 6,
    },
    actionLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginTop: 20,
      backgroundColor: colors.card,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
    },
    searchIcon: {
      marginLeft: 8,
      color: colors.text,
    },
    tabRow: {
      flexDirection: 'row',
      marginTop: 16,
    },
    tabBase: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 14,
      alignItems: 'center',
    },
    tabActive: {
      backgroundColor: colors.text,
    },
    tabInactive: {
      backgroundColor: colors.border,
    },
    tabSpacing: {
      marginRight: 12,
    },
    tabActiveText: {
      color: colors.background,
      fontWeight: '700',
    },
    tabInactiveText: {
      color: colors.text,
      fontWeight: '700',
    },
    listCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 12,
      marginTop: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tokenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tokenRowSpacing: {
      marginBottom: 10,
    },
    tokenIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    tokenInfo: {
      flex: 1,
      marginLeft: 12,
    },
    tokenName: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    tokenSymbol: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    tokenAmounts: {
      alignItems: 'flex-end',
    },
    tokenBalance: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 14,
    },
    tokenValue: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 2,
    },
    input: {
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.card,
    },
    passcodeField: {
      marginTop: 12,
    },
    passcodeLabel: {
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: colors.muted,
      marginBottom: 8,
    },
    passcodeRow: {
      flexDirection: 'row',
      alignSelf: 'center',
      padding: 4,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    passcodeRowActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}12`,
    },
    passcodeCell: {
      width: 44,
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    passcodeCellSpacing: {
      marginRight: 8,
    },
    passcodeCellActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}12`,
    },
    passcodeDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.text,
    },
    passcodeDotFilled: {
      opacity: 1,
    },
    passcodeDotEmpty: {
      opacity: 0.15,
    },
    passcodeHiddenInput: {
      position: 'absolute',
      opacity: 0,
      width: 1,
      height: 1,
      left: 0,
      top: 0,
    },
    keypad: {
      marginTop: 16,
    },
    keypadRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 12,
    },
    keypadRowLast: {
      marginBottom: 0,
    },
    keypadKey: {
      flex: 1,
      height: 56,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.text,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keypadKeyAlt: {
      borderRadius: 22,
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}12`,
    },
    keypadKeyAction: {
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    keypadKeyText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    keypadKeySpacer: {
      borderColor: 'transparent',
      backgroundColor: 'transparent',
    },
    modalInput: {
      minHeight: 88,
      textAlignVertical: 'top',
    },
    primaryButton: {
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: colors.accent,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryButtonText: {
      fontWeight: '600',
      color: colors.accentText,
    },
    secondaryButton: {
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: colors.border,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryButtonText: {
      fontWeight: '600',
      color: colors.text,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    fingerprintButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fingerprintIcon: {
      marginRight: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    modalScroll: {
      width: '100%',
      maxHeight: '90%',
    },
    modalCard: {
      width: '100%',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 18,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    modalSubtitle: {
      color: colors.muted,
      marginBottom: 6,
    },
  });
