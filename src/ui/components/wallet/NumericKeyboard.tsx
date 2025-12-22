import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import BiometricButton from './BiometricButton';

type NumericKeyboardProps = {
  styles: ReturnType<typeof createWalletStyles>;
  iconColor: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onBiometric?: () => void;
  biometricsAvailable?: boolean;
};

const KEYPAD_LAYOUT = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['bio', '0', 'del'],
];

export default function NumericKeyboard({
  styles,
  iconColor,
  onDigit,
  onDelete,
  onClear,
  onBiometric,
  biometricsAvailable = false,
}: NumericKeyboardProps) {
  return (
    <View style={styles.keypad}>
      {KEYPAD_LAYOUT.map((row, rowIndex) => (
        <View
          key={`keypad-row-${rowIndex}`}
          style={[styles.keypadRow, rowIndex === KEYPAD_LAYOUT.length - 1 && styles.keypadRowLast]}
        >
          {row.map((key, colIndex) => {
            const isAlt = (rowIndex + colIndex) % 2 === 1;
            const baseKeyStyle = [styles.keypadKey, isAlt && styles.keypadKeyAlt];

            if (key === 'bio') {
              if (!biometricsAvailable || !onBiometric) {
                return <View key="bio" style={[...baseKeyStyle, styles.keypadKeySpacer]} />;
              }
              return (
                <BiometricButton
                  key="bio"
                  style={[...baseKeyStyle, styles.keypadKeyAction]}
                  onPress={onBiometric}
                  iconColor={iconColor}
                />
              );
            }

            if (key === 'del') {
              return (
                <TouchableOpacity
                  key="del"
                  style={[...baseKeyStyle, styles.keypadKeyAction]}
                  onPress={onDelete}
                  onLongPress={onClear}
                  activeOpacity={0.85}
                  accessibilityLabel="Delete digit"
                >
                  <Ionicons name="backspace-outline" size={20} color={iconColor} />
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={key}
                style={baseKeyStyle}
                onPress={() => onDigit(key)}
                activeOpacity={0.85}
                accessibilityLabel={`Digit ${key}`}
              >
                <Text style={styles.keypadKeyText}>{key}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}
