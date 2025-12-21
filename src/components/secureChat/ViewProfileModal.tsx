import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import ViewProfileCard from './ViewProfileCard';
import type { ChatAvatarSource } from '../../types/secureChat';

type ViewProfileModalProps = {
  visible: boolean;
  name: string;
  userId?: string;
  avatarSource: ChatAvatarSource;
  isOnline?: boolean;
  onClose: () => void;
  onCopied?: () => void;
};

export default function ViewProfileModal({
  visible,
  name,
  userId,
  avatarSource,
  isOnline = false,
  onClose,
  onCopied,
}: ViewProfileModalProps) {
  const handleCopyId = async () => {
    if (userId) {
      await Clipboard.setStringAsync(userId);
      onCopied?.();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <ViewProfileCard
            name={name}
            userId={userId}
            avatarSource={avatarSource}
            isOnline={isOnline}
            onClose={onClose}
            onCopyId={handleCopyId}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
});
