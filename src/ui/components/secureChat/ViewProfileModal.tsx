import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import ViewProfileCard from '@components/secureChat/ViewProfileCard';
import type { ChatAvatarSource } from '@app-types/securechat-types/secureChat';

type ViewProfileModalProps = {
  visible: boolean;
  name: string;
  userId?: string;
  avatarSource: ChatAvatarSource;
  isOnline?: boolean;
  onClose: () => void;
  onCopied?: () => void;
  onStartP2P?: (userId: string, userName: string) => void;
};

export default function ViewProfileModal({
  visible,
  name,
  userId,
  avatarSource,
  isOnline = false,
  onClose,
  onCopied,
  onStartP2P,
}: ViewProfileModalProps) {
  const handleCopyId = async () => {
    if (userId) {
      await Clipboard.setStringAsync(userId);
      onCopied?.();
    }
  };

  const handleP2P = () => {
    if (userId && onStartP2P) {
      onStartP2P(userId, name);
      onClose();
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
            onP2P={handleP2P}
            canP2P={Boolean(userId && onStartP2P)}
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
