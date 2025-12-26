import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';

type MessageSettingsMenuProps = {
  canManage: boolean;
  canEdit?: boolean;
  iconColor?: string;
  onCopy: () => void;
  onReply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export default function MessageSettingsMenu({
  canManage,
  canEdit = true,
  iconColor,
  onCopy,
  onReply,
  onEdit,
  onDelete,
}: MessageSettingsMenuProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const deleteColor = '#ef4444';
  const [visible, setVisible] = useState(false);

  const handleClose = () => setVisible(false);

  const handleAction = (action: () => void) => {
    action();
    handleClose();
  };

  const showEdit = canManage && canEdit && onEdit;
  const showDelete = canManage && onDelete;

  return (
    <>
      <TouchableOpacity
        style={styles.iconButton}
        onPress={() => setVisible(true)}
        accessibilityLabel="Message settings"
        hitSlop={8}
      >
        <MaterialCommunityIcons name="dots-vertical" size={16} color={iconColor ?? colors.muted} />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={styles.backdrop} onPress={handleClose}>
          <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleAction(onReply)}>
              <MaterialCommunityIcons name="reply-outline" size={16} color={colors.text} />
              <Text style={styles.menuText}>Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => handleAction(onCopy)}>
              <MaterialCommunityIcons name="content-copy" size={16} color={colors.text} />
              <Text style={styles.menuText}>Copy</Text>
            </TouchableOpacity>
            {showEdit && (
              <TouchableOpacity style={styles.menuItem} onPress={() => handleAction(onEdit)}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={colors.text} />
                <Text style={styles.menuText}>Edit</Text>
              </TouchableOpacity>
            )}
            {showDelete && (
              <TouchableOpacity style={styles.menuItem} onPress={() => handleAction(onDelete)}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={deleteColor} />
                <Text style={[styles.menuText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    iconButton: {
      paddingHorizontal: 4,
      paddingVertical: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.45)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    card: {
      width: '80%',
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 8,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    menuText: {
      marginLeft: 10,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    deleteText: {
      color: '#ef4444',
    },
  });
