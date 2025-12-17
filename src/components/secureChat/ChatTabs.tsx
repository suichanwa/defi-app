import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type TabKey = 'chats' | 'connect';

type Props = {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
};

export default function ChatTabs({ activeTab, onTabChange }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'chats' ? styles.tabActive : styles.tabInactive]}
        onPress={() => onTabChange('chats')}
      >
        <MaterialCommunityIcons name="message-outline" size={18} color={activeTab === 'chats' ? '#ffffff' : '#111827'} />
        <Text style={[styles.tabText, activeTab === 'chats' && styles.tabTextActive]}>Chats</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'connect' ? styles.tabActive : styles.tabInactive]}
        onPress={() => onTabChange('connect')}
      >
        <MaterialCommunityIcons name="access-point" size={18} color={activeTab === 'connect' ? '#ffffff' : '#111827'} />
        <Text style={[styles.tabText, activeTab === 'connect' && styles.tabTextActive]}>Connect</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tabActive: {
    backgroundColor: '#4f46e5',
  },
  tabInactive: {
    backgroundColor: '#e2e8f0',
  },
  tabText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#111827',
  },
  tabTextActive: {
    color: '#ffffff',
  },
});
