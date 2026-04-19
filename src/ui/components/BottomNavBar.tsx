import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, View, StyleSheet, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';

export type TabName = 'wallet' | 'secureChat' | 'profile';

type BottomNavBarProps = {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
};

export default function BottomNavBar({ activeTab, onTabChange }: BottomNavBarProps) {
  const { colors } = useTheme();
  
  const walletScale = useRef(new Animated.Value(activeTab === 'wallet' ? 1 : 0.9)).current;
  const secureChatScale = useRef(new Animated.Value(activeTab === 'secureChat' ? 1 : 0.9)).current;
  const profileScale = useRef(new Animated.Value(activeTab === 'profile' ? 1 : 0.9)).current;
  
  const walletBgOpacity = useRef(new Animated.Value(activeTab === 'wallet' ? 1 : 0)).current;
  const secureChatBgOpacity = useRef(new Animated.Value(activeTab === 'secureChat' ? 1 : 0)).current;
  const profileBgOpacity = useRef(new Animated.Value(activeTab === 'profile' ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(walletScale, {
        toValue: activeTab === 'wallet' ? 1.1 : 0.9,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(walletBgOpacity, {
        toValue: activeTab === 'wallet' ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate secureChat tab
    Animated.parallel([
      Animated.spring(secureChatScale, {
        toValue: activeTab === 'secureChat' ? 1.1 : 0.9,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(secureChatBgOpacity, {
        toValue: activeTab === 'secureChat' ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate profile tab
    Animated.parallel([
      Animated.spring(profileScale, {
        toValue: activeTab === 'profile' ? 1.1 : 0.9,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(profileBgOpacity, {
        toValue: activeTab === 'profile' ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeTab, walletScale, secureChatScale, profileScale, walletBgOpacity, secureChatBgOpacity, profileBgOpacity]);

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: colors.nav,
          borderColor: `${colors.accent}44`,
          shadowColor: colors.accent,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => onTabChange('wallet')}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.navItemBackground,
            {
              backgroundColor: `${colors.accent}22`,
              opacity: walletBgOpacity,
            },
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
        style={styles.navItem}
        onPress={() => onTabChange('secureChat')}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.navItemBackground,
            {
              backgroundColor: `${colors.accent}22`,
              opacity: secureChatBgOpacity,
            },
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
        style={styles.navItem}
        onPress={() => onTabChange('profile')}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.navItemBackground,
            {
              backgroundColor: `${colors.accent}22`,
              opacity: profileBgOpacity,
            },
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
    bottom: 18,
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
    borderRadius: 20,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
});