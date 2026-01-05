import React from 'react';
import { Text, View, StyleSheet, TextInput } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';

type PasscodeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  isActive?: boolean;
  onActivate?: () => void;
  styles: ReturnType<typeof createWalletStyles>;
};

export default function PasscodeField({
  label,
  value,
  onChange,
  autoFocus,
  isActive,
  onActivate,
}: PasscodeFieldProps) {
  const { colors } = useTheme();
  const PASSCODE_LENGTH = 6;

  return (
    <View style={localStyles.container}>
      <Text style={[localStyles.label, { color: colors.muted }]}>{label}</Text>
      
      {/* Hidden input for native keyboard */}
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        maxLength={PASSCODE_LENGTH}
        autoFocus={autoFocus}
        secureTextEntry={false}
        style={localStyles.hiddenInput}
        onFocus={onActivate}
      />
      
      {/* Visual dots display */}
      <View style={localStyles.dotsContainer}>
        {Array.from({ length: PASSCODE_LENGTH }).map((_, index) => (
          <View
            key={index}
            style={[
              localStyles.dot,
              {
                backgroundColor: index < value.length ? colors.accent : 'transparent',
                borderColor: isActive ? colors.accent : colors.border,
                borderWidth: 2,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
