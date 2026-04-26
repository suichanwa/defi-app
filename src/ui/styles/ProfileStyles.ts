import { StyleSheet } from 'react-native';

export type ProfilePalette = {
  background: string;
  card: string;
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
};

export const createProfileStyles = (colors: ProfilePalette) =>
  StyleSheet.create({
    scrollContent: {
      padding: 20,
      paddingBottom: 120,
      backgroundColor: colors.background,
    },
    titleBlock: {
      marginBottom: 16,
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    pillText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    card: {
      marginBottom: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardBody: {
      flex: 1,
      marginHorizontal: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    cardSubtitle: {
      marginTop: 4,
      color: colors.muted,
    },
    input: {
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.background,
    },
    bioInput: {
      minHeight: 96,
      paddingTop: 12,
    },
    hint: {
      marginTop: 8,
      fontSize: 12,
      color: colors.muted,
    },
    avatarRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarPreview: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.muted,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    identiconGrid: {
      width: 60,
      height: 60,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    identiconCell: {
      width: 10,
      height: 10,
      margin: 1,
      borderRadius: 2,
    },
    avatarOptions: {
      marginLeft: 16,
      flex: 1,
    },
    optionRow: {
      marginTop: 8,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    optionButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginRight: 8,
      marginTop: 8,
      backgroundColor: colors.background,
    },
    optionButtonActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    optionText: {
      fontWeight: '600',
      color: colors.text,
    },
    optionTextActive: {
      fontWeight: '600',
      color: colors.accentText,
    },
    actionRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    chipButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      marginRight: 8,
      marginTop: 6,
      gap: 6,
    },
    chipPrimary: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    chipPrimaryText: {
      color: colors.accentText,
      fontWeight: '700',
    },
    chipGhost: {
      backgroundColor: '#fff1f2',
      borderColor: '#ffe4e6',
    },
    chipGhostText: {
      color: '#b91c1c',
      fontWeight: '700',
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
      marginTop: 10,
      borderRadius: 12,
      backgroundColor: colors.muted,
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
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    errorText: {
      color: '#dc2626',
      marginBottom: 8,
    },
    successText: {
      color: '#16a34a',
      marginBottom: 8,
    },
    metaText: {
      marginTop: 6,
      fontSize: 12,
      color: colors.muted,
    },
    pointsValue: {
      marginTop: 6,
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
    },
    listItem: {
      marginTop: 8,
      color: colors.text,
    },
    activityRow: {
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },
    activityInfo: {
      flex: 1,
      paddingRight: 12,
    },
    activityTitle: {
      fontWeight: '600',
      color: colors.text,
    },
    pointsDelta: {
      fontWeight: '700',
      color: '#16a34a',
    },
    avatarImage: {
      width: 72,
      height: 72,
      borderRadius: 36,
    },
  });
