import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  visible: boolean;
  title?: string;
  message: string;
  variant?: 'error' | 'warning' | 'info';
  onClose: () => void;
};

export default function ErrorDialog({ visible, title = 'Error', message, variant = 'error', onClose }: Props) {
  const variantStyle = variantStyles[variant];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, variantStyle.card]}>
          <Text style={[styles.title, variantStyle.title]}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={[styles.button, variantStyle.button]} onPress={onClose} activeOpacity={0.9}>
            <Text style={styles.buttonText}>OK</Text>
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
    color: '#ffffff',
    fontWeight: '600',
  },
});

const variantStyles = {
  error: StyleSheet.create({
    card: { borderColor: '#fecaca' },
    title: { color: '#b91c1c' },
    button: { backgroundColor: '#ef4444' },
  }),
  warning: StyleSheet.create({
    card: { borderColor: '#fde68a' },
    title: { color: '#b45309' },
    button: { backgroundColor: '#f59e0b' },
  }),
  info: StyleSheet.create({
    card: { borderColor: '#bfdbfe' },
    title: { color: '#1d4ed8' },
    button: { backgroundColor: '#2563eb' },
  }),
} as const;
