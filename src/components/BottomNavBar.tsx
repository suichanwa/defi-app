import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

export type TabName = 'wallet' | 'secureChat' | 'profile';

type BottomNavBarProps = {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
};

export default function BottomNavBar({ activeTab, onTabChange }: BottomNavBarProps) {
  const { colors } = useTheme();

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
        style={[
          styles.navItem,
          activeTab === 'wallet' && { backgroundColor: `${colors.accent}22` },
        ]}
        onPress={() => onTabChange('wallet')}
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
        onPress={() => onTabChange('secureChat')}
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
        onPress={() => onTabChange('profile')}
        activeOpacity={0.8}
      >
        <Ionicons
          name="person-circle-outline"
          size={28}
          color={activeTab === 'profile' ? colors.accent : colors.text}
        />
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
  },
});