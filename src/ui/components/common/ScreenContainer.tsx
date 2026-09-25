import React, { useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@theme/ThemeProvider';
import { useNavVisibility } from '@context/NavVisibilityProvider';
import ScreenHeader, { ScreenHeaderProps } from './ScreenHeader';

export interface ScreenContainerProps {
  children: React.ReactNode;
  /** Automatically hide bottom navbar when screen focused. Default `true`. */
  hideNav?: boolean;
  /** Wrap content in a ScrollView. Default `true`. */
  scrollable?: boolean;
  /** Header back button handler. If provided along with or without title, renders ScreenHeader. */
  onBack?: () => void;
  backDisabled?: boolean;
  title?: string;
  subtitle?: string;
  titlePosition?: ScreenHeaderProps['titlePosition'];
  headerRight?: React.ReactNode;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Custom scroll content style (if scrollable=true) */
  contentContainerStyle?: StyleProp<ViewStyle>;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
}

export default function ScreenContainer({
  children,
  hideNav = true,
  scrollable = true,
  onBack,
  backDisabled,
  title,
  subtitle,
  titlePosition = 'center',
  headerRight,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
}: ScreenContainerProps) {
  const { colors } = useTheme();
  const { setNavHidden } = useNavVisibility();

  useFocusEffect(
    useCallback(() => {
      if (!hideNav) return;
      setNavHidden(true);
      return () => setNavHidden(false);
    }, [hideNav, setNavHidden]),
  );

  const showHeader = Boolean(onBack || title || subtitle);

  const headerElement = showHeader ? (
    <ScreenHeader
      onBack={onBack}
      backDisabled={backDisabled}
      title={title}
      subtitle={subtitle}
      titlePosition={titlePosition}
      rightElement={headerRight}
    />
  ) : null;

  const body = scrollable ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={false}
    >
      {headerElement}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.nonScrollContent, contentContainerStyle]}>
      {headerElement}
      {children}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {body}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  nonScrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
});
