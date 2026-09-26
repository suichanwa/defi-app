import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import { createNavigationChromeStyles } from '@styles/NavigationChrome';

export type TabName = 'wallet' | 'secureChat' | 'profile';

type BottomNavBarProps = {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
};

export default function BottomNavBar({ activeTab, onTabChange }: BottomNavBarProps) {
  const { colors } = useTheme();
  const chrome = createNavigationChromeStyles(colors);
  
  const walletScale = useRef(new Animated.Value(activeTab === 'wallet' ? 1 : 0.9)).current;
  const secureChatScale = useRef(new Animated.Value(activeTab === 'secureChat' ? 1 : 0.9)).current;
  const profileScale = useRef(new Animated.Value(activeTab === 'profile' ? 1 : 0.9)).current;
  
  const walletBgOpacity = useRef(new Animated.Value(activeTab === 'wallet' ? 1 : 0)).current;
  const secureChatBgOpacity = useRef(new Animated.Value(activeTab === 'secureChat' ? 1 : 0)).current;
  const profileBgOpacity = useRef(new Animated.Value(activeTab === 'profile' ? 1 : 0)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    Animated.parallel([
      Animated.spring(walletScale, {
        toValue: activeTab === 'wallet' ? 1.1 : 0.9,
        friction: 4,
        tension: 80,
        useNativeDriver,
      }),
      Animated.timing(walletBgOpacity, {
        toValue: activeTab === 'wallet' ? 1 : 0,
        duration: 200,
        useNativeDriver,
      }),
    ]).start();

    // Animate secureChat tab
    Animated.parallel([
      Animated.spring(secureChatScale, {
        toValue: activeTab === 'secureChat' ? 1.1 : 0.9,
        friction: 4,
        tension: 80,
        useNativeDriver,
      }),
      Animated.timing(secureChatBgOpacity, {
        toValue: activeTab === 'secureChat' ? 1 : 0,
        duration: 200,
        useNativeDriver,
      }),
    ]).start();

    // Animate profile tab
    Animated.parallel([
      Animated.spring(profileScale, {
        toValue: activeTab === 'profile' ? 1.1 : 0.9,
        friction: 4,
        tension: 80,
        useNativeDriver,
      }),
      Animated.timing(profileBgOpacity, {
        toValue: activeTab === 'profile' ? 1 : 0,
        duration: 200,
        useNativeDriver,
      }),
    ]).start();
  }, [activeTab, walletScale, secureChatScale, profileScale, walletBgOpacity, secureChatBgOpacity, profileBgOpacity]);

  return (
    <View
      style={[
        styles.bottomNav,
        chrome.shell,
        {
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.navItem, chrome.item]}
        onPress={() => onTabChange('wallet')}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.navItemBackground,
            chrome.itemBackground,
            { opacity: walletBgOpacity },
          ]}
        />
        <Animated.View
          style={{
            transform: [{ scale: walletScale }],
          }}
        >
          <MaterialCommunityIcons
            name="wallet-outline"
            size={26}
            color={activeTab === 'wallet' ? colors.accent : colors.text}
          />
        </Animated.View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navItem, chrome.item]}
        onPress={() => onTabChange('secureChat')}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.navItemBackground,
            chrome.itemBackground,
            { opacity: secureChatBgOpacity },
          ]}
        />
        <Animated.View
          style={{
            transform: [{ scale: secureChatScale }],
          }}
        >
          <MaterialCommunityIcons
            name="message-lock-outline"
            size={26}
            color={activeTab === 'secureChat' ? colors.accent : colors.text}
          />
        </Animated.View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navItem, chrome.item]}
        onPress={() => onTabChange('profile')}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.navItemBackground,
            chrome.itemBackground,
            { opacity: profileBgOpacity },
          ]}
        />
        <Animated.View
          style={{
            transform: [{ scale: profileScale }],
          }}
        >
          <Ionicons
            name="person-circle-outline"
            size={28}
            color={activeTab === 'profile' ? colors.accent : colors.text}
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 32,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  navItem: {
    padding: 12,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemBackground: {
    position: 'absolute',
  },
});
