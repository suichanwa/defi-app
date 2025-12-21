import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import WalletScreen from './src/screens/WalletScreen';
import SecureChatScreen from './src/screens/SecureChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import BottomNavBar, { TabName } from './src/components/BottomNavBar';
import { appShellStyles as styles } from './src/styles/AppShellStyles';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { useWalletSession, WalletSessionProvider } from './src/context/WalletSessionProvider';

function AppContent() {
  const [activeTab, setActiveTab] = useState<TabName>('wallet');
  const { status, backupCompleted } = useWalletSession();
  const secureTransition = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();
  const isSetupMode = status === 'missing' || status === 'loading' || (status === 'unlocked' && !backupCompleted);

  useEffect(() => {
    if (isSetupMode && activeTab !== 'wallet') {
      setActiveTab('wallet');
    }
  }, [activeTab, isSetupMode]);

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
    if (activeTab === 'profile') {
      return <ProfileScreen />;
    }
    if (activeTab === 'wallet') {
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
            { backgroundColor: colors.background },
            walletAnimatedStyle,
            isWeb && { pointerEvents: walletPointerEvents },
          ]}
          pointerEvents={isWeb ? undefined : walletPointerEvents}
        >
          {renderWalletLayer()}
        </Animated.View>

        <Animated.View
          style={[
            styles.screenLayer,
            styles.chatLayer,
            { backgroundColor: colors.background },
            secureChatAnimatedStyle,
            isWeb && { pointerEvents: chatPointerEvents },
          ]}
          pointerEvents={isWeb ? undefined : chatPointerEvents}
        >
          <SecureChatScreen isActive={activeTab === 'secureChat'} />
        </Animated.View>

        {!isSetupMode && (
          <BottomNavBar activeTab={activeTab} onTabChange={setActiveTab} />
        )}
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
