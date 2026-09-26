import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { BackHandler, LogBox, Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import ToastManager from 'toastify-react-native';
import WalletScreen from './src/screens/WalletScreen';
import SecureChatScreen from './src/screens/secureChat/SecureChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNavBar, { TabName } from '@components/BottomNavBar';
import NotificationHost from '@components/common/NotificationHost';
import { appShellStyles as styles } from '@styles/AppShellStyles';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { useWalletSession, WalletSessionProvider } from './src/context/WalletSessionProvider';
import * as Sentry from '@sentry/react-native';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NotificationProvider } from './src/context/NotificationProvider';
import { NavVisibilityProvider, useNavVisibility } from './src/context/NavVisibilityProvider';
import { QRReceiveProvider } from './src/context/QRReceiveProvider';
import { ChainProvider } from './src/context/ChainProvider';
import { XmtpProvider } from './src/context/XmtpProvider';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from 'react-native-paper';
import 'react-native-get-random-values';

const ENABLE_IN_APP_CHAT_NOTIFICATIONS = false;

// Benign dev-only warning from Reanimated 4.x internals (see reanimated GitHub
// issues for "Tried to modify key `value`"); our shared-value usage follows the
// documented API. Remove once fixed upstream.
const IGNORED_WARNINGS = [
  '[Worklets] Tried to modify key `value`',
  'props.pointerEvents is deprecated',
  'useNativeDriver',
];
LogBox.ignoreLogs(IGNORED_WARNINGS);
if (__DEV__) {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      IGNORED_WARNINGS.some((warning) => (args[0] as string).includes(warning))
    ) {
      return;
    }
    originalWarn(...args);
  };
}

Sentry.init({
  dsn: 'https://005462e44419a10cf92b86000ff8c484@o4510659003940864.ingest.de.sentry.io/4510659569778768',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});

function AppContent({ activeTab, onTabChange }: { activeTab: TabName; onTabChange: (tab: TabName) => void }) {
  const [lastNonChatTab, setLastNonChatTab] = useState<TabName>('wallet');
  const [isChatThreadOpen, setIsChatThreadOpen] = useState(false);
  const { status, backupCompleted } = useWalletSession();
  const secureTransition = useSharedValue(0);
  const navbarOpacity = useSharedValue(1);
  const navbarTranslateY = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const { isNavHidden } = useNavVisibility();
  const isSetupMode = status === 'missing' || status === 'loading' || (status === 'unlocked' && !backupCompleted);
  const showNavbar =
    status === 'unlocked' && backupCompleted && !(activeTab === 'secureChat' && isChatThreadOpen) && !isNavHidden;

  const toastConfig = useMemo(() => {
    return {
      default: ({ text1, text2 }: { text1?: string; text2?: string }) => (
        <View
          style={[
            toastStyles.toast,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderLeftColor: colors.accent,
              shadowColor: colors.accent,
            },
          ]}
        >
          <Text numberOfLines={1} style={[toastStyles.toastTitle, { color: colors.text }]}>
            {text1 ?? ''}
          </Text>
          {text2 ? (
            <Text numberOfLines={2} style={[toastStyles.toastMessage, { color: colors.muted }]}>
              {text2}
            </Text>
          ) : null}
        </View>
      ),
    };
  }, [colors]);

  useEffect(() => {
    if (isSetupMode && activeTab !== 'wallet') {
      onTabChange('wallet');
    }
  }, [activeTab, isSetupMode, onTabChange]);

  useEffect(() => {
    if (activeTab !== 'secureChat') {
      setLastNonChatTab(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    secureTransition.value = withTiming(activeTab === 'secureChat' ? 1 : 0, { duration: 280 });
  }, [activeTab, secureTransition]);

  useEffect(() => {
    const shouldHideNavbar = activeTab === 'secureChat' && isChatThreadOpen;
    navbarOpacity.value = withTiming(shouldHideNavbar ? 0 : 1, { duration: 250 });
    navbarTranslateY.value = withTiming(shouldHideNavbar ? 20 : 0, { duration: 250 });
  }, [isChatThreadOpen, activeTab, navbarOpacity, navbarTranslateY]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (activeTab === 'profile') {
        onTabChange('wallet');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [activeTab, onTabChange]);

  const walletAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - secureTransition.value,
    transform: [{ translateX: -12 * secureTransition.value }],
  }));

  const navbarAnimatedStyle = useAnimatedStyle(() => ({
    opacity: navbarOpacity.value,
    transform: [{ translateY: navbarTranslateY.value }],
  }));

  const secureChatAnimatedStyle = useAnimatedStyle(() => ({
    opacity: secureTransition.value,
    transform: [{ translateX: 12 * (1 - secureTransition.value) }],
  }));

  const walletPointerEvents = activeTab === 'secureChat' ? 'none' : 'auto';
  const chatPointerEvents = activeTab === 'secureChat' ? 'auto' : 'none';
  const paperTheme = useMemo(
    () => ({
      ...(resolved === 'dark' ? MD3DarkTheme : MD3LightTheme),
      dark: resolved === 'dark',
      roundness: 14,
      colors: {
        ...(resolved === 'dark' ? MD3DarkTheme.colors : MD3LightTheme.colors),
        primary: colors.accent,
        onPrimary: colors.accentText,
        primaryContainer: colors.accent,
        onPrimaryContainer: colors.accentText,
        secondary: colors.accent,
        background: colors.background,
        onBackground: colors.text,
        surface: colors.card,
        onSurface: colors.text,
        surfaceVariant: colors.border,
        onSurfaceVariant: colors.muted,
        outline: colors.border,
        outlineVariant: colors.border,
        error: '#ef4444',
      },
    }),
    [colors, resolved],
  );

  const renderWalletLayer = () => {
    const tabToRender = activeTab === 'secureChat' ? lastNonChatTab : activeTab;
    if (tabToRender === 'profile') {
      return <ProfileScreen />;
    }
    if (tabToRender === 'wallet') {
      return <WalletScreen />;
    }
    return null;
  };

  return (
    <PaperProvider theme={paperTheme}>
      <BottomSheetModalProvider>
        <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
          <View
            style={{
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
              flex: 1,
            }}
          >
            <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
            <Animated.View
              style={[
                styles.screenLayer,
                { backgroundColor: colors.background, pointerEvents: walletPointerEvents },
                walletAnimatedStyle,
              ]}
            >
              {renderWalletLayer()}
            </Animated.View>

            <Animated.View
              style={[
                styles.screenLayer,
                styles.chatLayer,
                { backgroundColor: colors.background, pointerEvents: chatPointerEvents },
                secureChatAnimatedStyle,
              ]}
            >
              <SecureChatScreen
                isActive={activeTab === 'secureChat'}
                onChatViewChange={(view) => setIsChatThreadOpen(view === 'thread')}
              />
            </Animated.View>

            {showNavbar && (
              <Animated.View
                style={[
                  navbarAnimatedStyle,
                  { pointerEvents: activeTab === 'secureChat' && isChatThreadOpen ? 'none' : 'auto' },
                ]}
              >
                <BottomNavBar activeTab={activeTab} onTabChange={onTabChange} />
              </Animated.View>
            )}

            {activeTab === 'wallet' && <NotificationHost scope="wallet" animation="slide" />}
            {activeTab === 'secureChat' && (
              <NotificationHost
                scope="chat"
                animation="slide"
                enabled={ENABLE_IN_APP_CHAT_NOTIFICATIONS}
              />
            )}

            <ToastManager
              config={toastConfig}
              position="top"
              topOffset={insets.top + 12}
              duration={3500}
              showProgressBar
              useModal={false}
            />
          </View>
        </View>
      </BottomSheetModalProvider>
    </PaperProvider>
  );
}

export default Sentry.wrap(function App() {
  const [activeTab, setActiveTab] = useState<TabName>('wallet');
  
  return (
    <ThemeProvider>
      <ChainProvider>
        <WalletSessionProvider isWalletActive={activeTab === 'wallet'}>
          <XmtpProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <SafeAreaProvider>
                <NotificationProvider>
                  <NavVisibilityProvider>
                    <QRReceiveProvider>
                      <AppContent activeTab={activeTab} onTabChange={setActiveTab} />
                    </QRReceiveProvider>
                  </NavVisibilityProvider>
                  <Toast />
                </NotificationProvider>
              </SafeAreaProvider>
            </GestureHandlerRootView>
          </XmtpProvider>
        </WalletSessionProvider>
      </ChainProvider>
    </ThemeProvider>
  );
});

const toastStyles = StyleSheet.create({
  toast: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  toastTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  toastMessage: {
    fontSize: 12,
  },
});
