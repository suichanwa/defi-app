import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Platform, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import WalletScreen from './src/screens/WalletScreen';
import SecureChatScreen from './src/screens/SecureChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { appShellStyles as styles } from './src/styles/AppShellStyles';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { WalletSessionProvider } from './src/context/WalletSessionProvider';

function AppContent() {
  const [activeTab, setActiveTab] = useState<'wallet' | 'secureChat' | 'profile'>('wallet');
  const secureTransition = useSharedValue(0);
  const insets = useSafeAreaInsets();
  const { colors, resolved } = useTheme();

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

  return (
    <View
      style={[
        styles.safeArea,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
          backgroundColor: colors.background,
        },
      ]}
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
        {activeTab === 'profile' ? <ProfileScreen /> : <WalletScreen />}
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
        <SecureChatScreen />
      </Animated.View>

      <View style={[styles.bottomNav, { backgroundColor: colors.nav }]}>
        <TouchableOpacity
          style={[
            styles.navItem,
            activeTab === 'wallet' && { backgroundColor: `${colors.accent}22` },
          ]}
          onPress={() => setActiveTab('wallet')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="wallet-outline"
            size={26}
            color={activeTab === 'wallet' ? colors.accent : colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navItem,
            activeTab === 'secureChat' && { backgroundColor: `${colors.accent}22` },
          ]}
          onPress={() => setActiveTab('secureChat')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="message-lock-outline"
            size={26}
            color={activeTab === 'secureChat' ? colors.accent : colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.navItem,
            activeTab === 'profile' && { backgroundColor: `${colors.accent}22` },
          ]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person-circle-outline"
            size={28}
            color={activeTab === 'profile' ? colors.accent : colors.text}
          />
        </TouchableOpacity>
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
