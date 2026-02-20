import { StyleSheet } from 'react-native';
import type { useTheme } from '@theme/ThemeProvider';

export const createWalletStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 120,
    },

    // Header styles
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 24,
      flexWrap: 'wrap',
      rowGap: 12,
    },
    headerTitle: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.text,
      letterSpacing: -0.5,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 4,
      fontWeight: '500',
    },
    headerPills: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    networkBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    networkBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    // Card wrapper with better shadow
    cardWrapper: {
      marginBottom: 24,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8,
    },

    // Main wallet card
    walletCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.border,
    },
    walletHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    pill: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.accent,
      backgroundColor: `${colors.accent}15`,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      overflow: 'hidden',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    walletTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    balanceLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    balance: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 4,
      letterSpacing: -1,
    },
    addressText: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: 'monospace',
      marginBottom: 18,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: colors.background,
      borderRadius: 8,
      overflow: 'hidden',
    },

    // Action buttons - completely redesigned
    actionsRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    actionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      marginTop: 2,
    },

    // Search container
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 20,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.text,
      padding: 0,
    },
    searchIcon: {
      color: colors.muted,
      opacity: 0.6,
    },

    // Meta row
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    metaText: {
      fontSize: 12,
      color: colors.muted,
      fontWeight: '500',
    },

    // Error text
    errorText: {
      fontSize: 13,
      color: '#ef4444',
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: '#ef444410',
      borderRadius: 12,
      borderLeftWidth: 3,
      borderLeftColor: '#ef4444',
      fontWeight: '600',
    },

    // Tabs
    tabRow: {
      flexDirection: 'row',
      marginBottom: 16,
      gap: 8,
    },
    tabBase: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 12,
      borderWidth: 1.5,
    },
    tabActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    tabInactive: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
    },
    tabSpacing: {
      marginRight: 0,
    },
    tabActiveText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#ffffff',
    },
    tabInactiveText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.muted,
    },

    // Token list card
    listCard: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tokenRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
    },
    tokenRowSpacing: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tokenIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
      borderWidth: 2,
    },
    tokenInfo: {
      flex: 1,
    },
    tokenName: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    tokenSymbol: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
    },
    tokenAmounts: {
      alignItems: 'flex-end',
    },
    tokenBalance: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    tokenValue: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.muted,
    },

    // Setup screen styles
    setupCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      marginTop: 24,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8,
    },
    qrWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
    },
    addressPill: {
      fontSize: 12,
      color: colors.muted,
      fontFamily: 'monospace',
      marginBottom: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.background,
      borderRadius: 10,
      overflow: 'hidden',
    },
    setupTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    setupSubtitle: {
      fontSize: 15,
      color: colors.muted,
      marginBottom: 32,
      lineHeight: 22,
      fontWeight: '500',
    },
    mnemonicGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 20,
    },
    mnemonicWord: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mnemonicIndex: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.muted,
      marginRight: 6,
    },
    mnemonicText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    mnemonicInputCell: {
      flex: 1,
      minWidth: '30%',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mnemonicInputCellFocused: {
      borderColor: colors.accent,
    },
    mnemonicInputField: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
      padding: 0,
    },
    checkboxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 16,
    },
    checkboxRowChecked: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}10`,
    },
    checkboxLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    checkboxLabelChecked: {
      color: colors.accent,
    },
    primaryButton: {
      backgroundColor: colors.accent,
      paddingVertical: 18,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
      shadowColor: colors.accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 0.3,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalScroll: {
      flex: 1,
    },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 24,
      paddingBottom: 40,
      marginTop: 'auto',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
    },
    modalSubtitle: {
      fontSize: 15,
      color: colors.muted,
      marginBottom: 24,
      lineHeight: 22,
      fontWeight: '500',
    },
    modalInput: {
      height: 100,
      textAlignVertical: 'top',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      paddingVertical: 18,
      paddingHorizontal: 24,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: 0.3,
    },
    buttonDisabled: {
      opacity: 0.5,
    },

    // Progress indicator
    progressContainer: {
      marginBottom: 24,
    },
    progressLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.accent,
      borderRadius: 3,
    },

    // Loading styles
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingVertical: 20,
    },
    loadingText: {
      fontSize: 14,
      color: colors.muted,
      fontWeight: '600',
    },

    // Input styles
    input: {
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
      marginBottom: 16,
    },
    inputFocused: {
      borderColor: colors.accent,
      backgroundColor: colors.background,
    },
    inputError: {
      borderColor: '#ef4444',
    },

    // Message styles
    messageText: {
      fontSize: 13,
      marginBottom: 16,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      fontWeight: '600',
    },
    messageSuccess: {
      color: '#22c55e',
      backgroundColor: '#22c55e10',
      borderLeftWidth: 3,
      borderLeftColor: '#22c55e',
    },
    messageWarning: {
      color: '#f59e0b',
      backgroundColor: '#f59e0b10',
      borderLeftWidth: 3,
      borderLeftColor: '#f59e0b',
    },
    messageError: {
      color: '#ef4444',
      backgroundColor: '#ef444410',
      borderLeftWidth: 3,
      borderLeftColor: '#ef4444',
    },
    messageInfo: {
      color: colors.accent,
      backgroundColor: `${colors.accent}10`,
      borderLeftWidth: 3,
      borderLeftColor: colors.accent,
    },

    // Passcode display
    passcodeDisplay: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
      marginBottom: 32,
    },
    passcodeDot: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: colors.border,
    },
    passcodeDotFilled: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },

    // Keypad
    keypad: {
      gap: 12,
    },
    keypadRow: {
      flexDirection: 'row',
      gap: 12,
    },
    keypadButton: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keypadButtonText: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
    },
    keypadButtonIcon: {
      color: colors.text,
    },
  });
