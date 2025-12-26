import React, { useMemo } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';

type Props = {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
};

export default function ChatImageViewer({ uri, visible, onClose }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="Close image viewer">
          <MaterialCommunityIcons name="close" size={22} color={colors.accentText} />
        </Pressable>
        <Pressable style={styles.imageWrapper} onPress={onClose}>
          {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : null}
        </Pressable>
      </View>
    </Modal>
  );
}

const createStyles = (colors: { accent: string; accentText: string }) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(7, 10, 20, 0.92)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButton: {
      position: 'absolute',
      top: 24,
      right: 20,
      backgroundColor: colors.accent,
      borderRadius: 18,
      padding: 8,
      zIndex: 2,
    },
    imageWrapper: {
      width: '90%',
      height: '80%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: '100%',
      height: '100%',
    },
  });
