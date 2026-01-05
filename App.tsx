import React, { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import ToastManager from 'toastify-react-native';
import WalletScreen from './src/screens/WalletScreen';
import SecureChatScreen from './src/screens/secureChat/SecureChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNavBar, { TabName } from '@components/BottomNavBar';
import { appShellStyles as styles } from '@styles/AppShellStyles';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { useWalletSession, WalletSessionProvider } from './src/context/WalletSessionProvider';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabName>('wallet');
  const [lastNonChatTab, setLastNonChatTab] = useState<TabName>('wallet');
  const [isChatThreadOpen, setIsChatThreadOpen] = useState(false);
  const { status, backupCompleted } = useWalletSession();
  const secureTransition = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isSetupMode = status === 'missing' || status === 'loading' || (status === 'unlocked' && !backupCompleted);

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
      setActiveTab('wallet');
    }
  }, [activeTab, isSetupMode]);

  useEffect(() => {
    if (activeTab !== 'secureChat') {
      setLastNonChatTab(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    secureTransition.value = withTiming(activeTab === 'secureChat' ? 1 : 0, { duration: 280 });
  }, [activeTab, secureTransition]);

  const walletAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - secureTransition.value,
    transform: [{ translateX: -12 * secureTransition.value }],
  }));

  const secureChatAnimatedStyle = useAnimatedStyle(() => ({
    opacity: secureTransition.value,
    transform: [{ translateX: 12 * (1 - secureTransition.value) }],
  }));

  const isWeb = Platform.OS === 'web';
  const walletPointerEvents = activeTab === 'secureChat' ? 'none' : 'auto';
  const chatPointerEvents = activeTab === 'secureChat' ? 'auto' : 'none';

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

        {!isSetupMode && !(activeTab === 'secureChat' && isChatThreadOpen) && (
          <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />
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
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <WalletSessionProvider>
          <AppContent />
        </WalletSessionProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

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
