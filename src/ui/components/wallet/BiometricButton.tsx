import React, { useCallback, useRef } from 'react';
import { StyleProp, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type BiometricButtonProps = {
  style?: StyleProp<ViewStyle>;
  iconColor: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export default function BiometricButton({
  style,
  iconColor,
  onPress,
  disabled = false,
  accessibilityLabel = 'Use biometric unlock',
}: BiometricButtonProps) {
  const inFlightRef = useRef(false);

  const handlePress = useCallback(async () => {
    if (disabled || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await Promise.resolve(onPress());
    } finally {
      inFlightRef.current = false;
    }
  }, [disabled, onPress]);

  return (
    <TouchableOpacity
      style={style}
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name="finger-print" size={22} color={iconColor} />
    </TouchableOpacity>
  );
}
