import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Variant = 'success' | 'error' | 'info';

type Props = {
  visible: boolean;
  title?: string;
  message: string;
  variant?: Variant;
  onClose: () => void;
};

const variantStyles: Record<Variant, { bg: string; fg: string }> = {
  success: { bg: '#22c55e', fg: '#ffffff' },
  error: { bg: '#ef4444', fg: '#ffffff' },
  info: { bg: '#4f46e5', fg: '#ffffff' },
};

export default function StatusDialog({
  visible,
  title = 'Status',
  message,
  variant = 'info',
  onClose,
}: Props) {
  const palette = variantStyles[variant];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.bg }]}
            onPress={onClose}
            activeOpacity={0.9}
          >
            <Text style={[styles.buttonText, { color: palette.fg }]}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  message: {
    color: '#111827',
    lineHeight: 20,
    marginBottom: 16,
  },
  button: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  buttonText: {
    fontWeight: '600',
  },
});
