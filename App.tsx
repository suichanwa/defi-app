import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import WalletScreen from './src/screens/WalletScreen';
import SecureChatScreen from './src/screens/SecureChatScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { appShellStyles as styles } from './src/styles/AppShellStyles';

export default function App() {
  const [activeTab, setActiveTab] = useState<'wallet' | 'secureChat' | 'profile'>('wallet');
  const secureTransition = useSharedValue(0);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <Animated.View
        style={[styles.screenLayer, walletAnimatedStyle]}
        pointerEvents={activeTab === 'secureChat' ? 'none' : 'auto'}
      >
        {activeTab === 'profile' ? <ProfileScreen /> : <WalletScreen />}
      </Animated.View>

      <Animated.View
        style={[styles.screenLayer, styles.chatLayer, secureChatAnimatedStyle]}
        pointerEvents={activeTab === 'secureChat' ? 'auto' : 'none'}
      >
        <SecureChatScreen />
      </Animated.View>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'wallet' && styles.navItemActive]}
          onPress={() => setActiveTab('wallet')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="wallet-outline"
            size={26}
            color={activeTab === 'wallet' ? '#4f46e5' : '#111827'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'secureChat' && styles.navItemActive]}
          onPress={() => setActiveTab('secureChat')}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons
            name="message-lock-outline"
            size={26}
            color={activeTab === 'secureChat' ? '#4f46e5' : '#111827'}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.navItemActive]}
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.8}
        >
          <Ionicons name="person-circle-outline" size={28} color={activeTab === 'profile' ? '#4f46e5' : '#111827'} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
