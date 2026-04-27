import React, { useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import ChatAvatar from '@components/secureChat/ChatAvatar';
import type { ChatAvatarSource } from '@app-types/securechat-types/secureChat';
import { createSecureChatStyles } from '@styles/SecureChat';

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
  const shared = useMemo(() => createSecureChatStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors, shared), [colors, shared]);
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const isAnimating = useRef(false);

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }], opacity }]}>
      <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
        <MaterialCommunityIcons name="close" size={20} color={colors.muted} />
      </TouchableOpacity>

      <View style={styles.avatarContainer}>
        <ChatAvatar source={avatarSource} variant="incoming" style={styles.avatar} size={80} />
        <View style={[styles.statusDot, isOnline ? styles.statusOnline : styles.statusOffline]} />
      </View>

      <Text style={shared.cardTitle}>{name}</Text>
      <Text style={shared.smallText}>{isOnline ? 'Online' : 'Offline'}</Text>

      {userId && (
        <TouchableOpacity style={styles.idRow} onPress={onCopyId} activeOpacity={0.7}>
          <Text style={shared.labelText}>User ID</Text>
          <View style={styles.idValueRow}>
            <Text style={styles.idValue} numberOfLines={1} ellipsizeMode="middle">
              {userId}
            </Text>
            <MaterialCommunityIcons name="content-copy" size={14} color={colors.muted} />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionButton, styles.actionSecondary]} activeOpacity={0.8}>
          <MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.text} />
          <Text style={[shared.buttonSecondaryText, styles.actionTextSecondary]}>Add Friend</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  shared: ReturnType<typeof createSecureChatStyles>,
) =>
  StyleSheet.create({
    card: {
      ...shared.surfaceRaised,
      padding: 24,
      alignItems: 'center',
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
      flexWrap: 'wrap',
      gap: 12,
      width: '100%',
    },
    actionButton: {
      flexBasis: '48%',
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
    actionTextSecondary: {
      color: colors.text,
    },
  });
