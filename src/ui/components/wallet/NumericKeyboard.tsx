import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';

type NumericKeyboardProps = {
  styles: ReturnType<typeof createWalletStyles>;
  iconColor: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onClear: () => void;
};

export default function NumericKeyboard({ onDigit, onDelete, onClear }: NumericKeyboardProps) {
  const { colors } = useTheme();

  const renderButton = (label: string, onPress: () => void, icon?: string) => (
    <TouchableOpacity
      style={[localStyles.button, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icon ? (
        <MaterialCommunityIcons name={icon as any} size={28} color={colors.text} />
      ) : (
        <Text style={[localStyles.buttonText, { color: colors.text }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={localStyles.container}>
      <View style={localStyles.row}>
        {renderButton('1', () => onDigit('1'))}
        {renderButton('2', () => onDigit('2'))}
        {renderButton('3', () => onDigit('3'))}
      </View>
      <View style={localStyles.row}>
        {renderButton('4', () => onDigit('4'))}
        {renderButton('5', () => onDigit('5'))}
        {renderButton('6', () => onDigit('6'))}
      </View>
      <View style={localStyles.row}>
        {renderButton('7', () => onDigit('7'))}
        {renderButton('8', () => onDigit('8'))}
        {renderButton('9', () => onDigit('9'))}
      </View>
      <View style={localStyles.row}>
        {renderButton('', onClear, 'refresh')}
        {renderButton('0', () => onDigit('0'))}
        {renderButton('', onDelete, 'backspace-outline')}
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 28,
    fontWeight: '600',
  },
});
