import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';

export interface ScreenHeaderProps {
  onBack?: () => void;
  backDisabled?: boolean;
  title?: string;
  subtitle?: string;
  /**
   * Layout format for the title:
   * - 'center' (default): Title is centered in the top bar.
   * - 'left': Title/subtitle block is aligned to the left right next to back button.
   * - 'below': Back button is on top row, title and subtitle render in a block below the back button.
   */
  titlePosition?: 'center' | 'left' | 'below';
  rightElement?: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export default function ScreenHeader({
  onBack,
  backDisabled = false,
  title,
  subtitle,
  titlePosition = 'center',
  rightElement,
  containerStyle,
}: ScreenHeaderProps) {
  const { colors } = useTheme();

  if (titlePosition === 'below') {
    return (
      <View style={[styles.container, containerStyle]}>
        <View style={styles.topRow}>
          {onBack ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Go back"
              activeOpacity={0.7}
              style={[styles.backButton, { borderColor: colors.border }]}
              onPress={onBack}
              disabled={backDisabled}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
          {rightElement ? rightElement : <View style={styles.rightSpacer} />}
        </View>
        {(title || subtitle) && (
          <View style={styles.belowCopyBlock}>
            {title && <Text style={[styles.screenTitle, { color: colors.text }]}>{title}</Text>}
            {subtitle && <Text style={[styles.screenSubtitle, { color: colors.muted }]}>{subtitle}</Text>}
          </View>
        )}
      </View>
    );
  }

  if (titlePosition === 'left') {
    return (
      <View style={[styles.container, styles.topRow, containerStyle]}>
        {onBack && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go back"
            activeOpacity={0.7}
            style={[styles.backButton, { borderColor: colors.border }]}
            onPress={onBack}
            disabled={backDisabled}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.leftTextBlock}>
          {title && <Text style={[styles.titleText, { color: colors.text }]}>{title}</Text>}
          {subtitle && <Text style={[styles.subtitleText, { color: colors.muted }]}>{subtitle}</Text>}
        </View>
        {rightElement ? rightElement : <View style={styles.rightSpacer} />}
      </View>
    );
  }

  // Default 'center' titlePosition
  return (
    <View style={[styles.container, styles.topRow, containerStyle]}>
      {onBack ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.7}
          style={[styles.backButton, { borderColor: colors.border }]}
          onPress={onBack}
          disabled={backDisabled}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.backButtonPlaceholder} />
      )}

      {title ? (
        <Text numberOfLines={1} style={[styles.titleText, styles.centerTitle, { color: colors.text }]}>
          {title}
        </Text>
      ) : (
        <View style={styles.flexSpacer} />
      )}

      {rightElement ? rightElement : <View style={styles.rightSpacer} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  rightSpacer: {
    width: 36,
    height: 36,
  },
  flexSpacer: {
    flex: 1,
  },
  centerTitle: {
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  leftTextBlock: {
    flex: 1,
    marginLeft: 12,
  },
  belowCopyBlock: {
    marginTop: 12,
    gap: 4,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
});
