import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Props = {
  isCompact: boolean;
  onConnectPress: () => void;
  onHostPress: () => void;
  timeLabel?: string;
  locationLabel?: string;
};

export default function ChatHeader({
  isCompact,
  onConnectPress,
  onHostPress,
  timeLabel,
  locationLabel,
}: Props) {
  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Secure Chat</Text>
        <Text style={styles.subtitle}>Components mirrored from repo/secureChat</Text>
        {(timeLabel || locationLabel) && (
          <View style={styles.metaRow}>
            {timeLabel && <Text style={styles.metaText}>Local time: {timeLabel}</Text>}
            {locationLabel && <Text style={styles.metaHint}>{locationLabel}</Text>}
          </View>
        )}
      </View>
      <View style={[styles.actions, isCompact && styles.actionsCompact]}>
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, isCompact && styles.fullWidth]}
          onPress={onConnectPress}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="lan-connect" color="#111827" size={18} />
          <Text style={styles.secondaryButtonText}>Connect</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, isCompact ? styles.fullWidth : styles.primaryButtonSpacing]}
          onPress={onHostPress}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons name="rocket-launch" color="#ffffff" size={18} />
          <Text style={styles.primaryButtonText}>Host server</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  containerCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  titleBlock: {
    flexShrink: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    color: '#64748b',
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaText: {
    marginRight: 12,
    fontSize: 12,
    color: '#64748b',
  },
  metaHint: {
    fontSize: 12,
    color: '#94a3b8',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsCompact: {
    width: '100%',
    marginTop: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryButton: {
    backgroundColor: '#e2e8f0',
  },
  secondaryButtonText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#0f172a',
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
  },
  primaryButtonText: {
    marginLeft: 8,
    fontWeight: '600',
    color: '#ffffff',
  },
  primaryButtonSpacing: {
    marginLeft: 12,
  },
  fullWidth: {
    width: '100%',
    marginTop: 8,
  },
});
