import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';

type PrivateChatSettingsMenuProps = {
  visible: boolean;
  chatName: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onClose: () => void;
};

export default function PrivateChatSettingsMenu({
  visible,
  chatName,
  isMuted,
  onToggleMute,
  onClose,
}: PrivateChatSettingsMenuProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [localMuted, setLocalMuted] = useState(false);
  const muted = typeof isMuted === 'boolean' ? isMuted : localMuted;

  const handleToggleMute = () => {
    if (onToggleMute) {
      onToggleMute();
    } else {
      setLocalMuted((prev) => !prev);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Chat settings</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {chatName}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <MaterialCommunityIcons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.menuItem} onPress={handleToggleMute} activeOpacity={0.85}>
            <View style={styles.menuIcon}>
              <MaterialCommunityIcons
                name={muted ? 'bell-outline' : 'bell-off-outline'}
                size={18}
                color={colors.text}
              />
            </View>
            <View style={styles.menuTextBlock}>
              <Text style={styles.menuTitle}>
                {muted ? 'Unmute notifications' : 'Mute notifications'}
              </Text>
              <Text style={styles.menuSubtitle}>
                {muted ? 'Notifications are paused for this chat.' : 'Silence new message alerts.'}
              </Text>
            </View>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    headerText: {
      flex: 1,
      paddingRight: 12,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      marginTop: 4,
      fontSize: 13,
      color: colors.muted,
    },
    closeButton: {
      padding: 6,
      borderRadius: 14,
      backgroundColor: colors.border,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    menuIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuTextBlock: {
      flex: 1,
      marginLeft: 12,
    },
    menuTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text,
    },
    menuSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: colors.muted,
    },
  });
