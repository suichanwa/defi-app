import { StyleSheet } from 'react-native';
import type { useTheme } from '@theme/ThemeProvider';

type NavigationChromeColors = ReturnType<typeof useTheme>['colors'];

export type NavigationChromeOptions = {
  compact?: boolean;
};

const withAlpha = (hex: string, alphaHex: string) => {
  if (!hex.startsWith('#')) return hex;
  const value = hex.slice(1);
  if (value.length === 6) return `#${value}${alphaHex}`;
  return hex;
};

export const createNavigationChromeStyles = (
  colors: NavigationChromeColors,
  options: NavigationChromeOptions = {},
) => {
  const compact = options.compact ?? false;
  return StyleSheet.create({
    shell: {
      backgroundColor: colors.nav,
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, '44'),
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    surface: {
      backgroundColor: colors.nav,
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, '44'),
      shadowColor: colors.accent,
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
      elevation: 4,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      width: '100%',
      borderRadius: 32,
      paddingHorizontal: compact ? 10 : 12,
      paddingVertical: compact ? 10 : 12,
      minHeight: compact ? 62 : 66,
    },
    actionButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.accent, '22'),
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, '44'),
      shadowColor: colors.accent,
      shadowOpacity: 0.16,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 2,
      flexShrink: 0,
    },
    actionIcon: {
      textAlign: 'center',
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      position: 'relative',
    },
    itemBackground: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
      backgroundColor: withAlpha(colors.accent, '22'),
    },
    itemText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.text,
    },
    itemTextActive: {
      color: colors.accent,
    },
  });
};
