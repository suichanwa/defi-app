import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeProvider';
import ChatAvatar from './ChatAvatar';
import type { ChatAvatarSource } from '../../types/secureChat';

type ViewProfileCardProps = {
  name: string;
  userId?: string;
  avatarSource: ChatAvatarSource;
  isOnline?: boolean;
  onClose: () => void;
  onCopyId?: () => void;
};

export default function ViewProfileCard({
  name,
  userId,
  avatarSource,
  isOnline = false,
  onClose,
  onCopyId,
}: ViewProfileCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
        <MaterialCommunityIcons name="close" size={20} color={colors.muted} />
      </TouchableOpacity>

      <View style={styles.avatarContainer}>
        <ChatAvatar source={avatarSource} variant="incoming" style={styles.avatar} size={80} />
        <View style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]} />
      </View>

      <Text style={styles.name}>{name}</Text>
      <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>

      {userId && (
        <TouchableOpacity style={styles.idRow} onPress={onCopyId} activeOpacity={0.7}>
          <Text style={styles.idLabel}>User ID</Text>
          <View style={styles.idValueRow}>
            <Text style={styles.idValue} numberOfLines={1} ellipsizeMode="middle">
              {userId}
            </Text>
            <MaterialCommunityIcons name="content-copy" size={14} color={colors.muted} />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.8}>
          <MaterialCommunityIcons name="message-text-outline" size={20} color={colors.accentText} />
          <Text style={styles.actionText}>Message</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.actionSecondary]} activeOpacity={0.8}>
          <MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.text} />
          <Text style={[styles.actionText, styles.actionTextSecondary]}>Add Friend</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      minWidth: 280,
      maxWidth: 320,
    },
    closeButton: {
      position: 'absolute',
      top: 12,
      right: 12,
      padding: 8,
      borderRadius: 20,
      backgroundColor: colors.border,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
    },
    statusDot: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 3,
      borderColor: colors.card,
    },
    statusOnline: {
      backgroundColor: '#22c55e',
    },
    statusOffline: {
      backgroundColor: '#9ca3af',
    },
    name: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    statusText: {
      fontSize: 13,
      color: colors.muted,
      marginBottom: 16,
    },
    idRow: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 12,
      marginBottom: 20,
    },
    idLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    idValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    idValue: {
      fontSize: 13,
      color: colors.text,
      flex: 1,
      fontFamily: 'monospace',
    },
    actionsRow: {
      flexDirection: 'row',
      gap: 12,
      width: '100%',
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: colors.accent,
    },
    actionSecondary: {
      backgroundColor: colors.border,
    },
    actionText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.accentText,
    },
    actionTextSecondary: {
      color: colors.text,
    },
  });
