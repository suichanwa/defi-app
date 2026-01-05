import React, { useEffect, useRef } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';

const PASSCODE_LENGTH = 6;

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
  styles,
}: PasscodeFieldProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus) {
      const id = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(id);
    }
  }, [autoFocus]);

  const handleChangeText = (nextValue: string) => {
    const sanitized = nextValue.replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
    onChange(sanitized);
  };

  return (
    <View style={styles.passcodeField}>
      <Text style={styles.passcodeLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={PASSCODE_LENGTH}
        autoFocus={autoFocus}
        secureTextEntry
        placeholder="••••••"
        placeholderTextColor="#94a3b8"
        style={{
          borderWidth: 2,
          borderColor: value.length > 0 ? '#4f46e5' : '#e2e8f0',
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 18,
          fontSize: 24,
          fontWeight: '600',
          color: '#0f172a',
          backgroundColor: '#f8fafc',
          marginTop: 12,
          textAlign: 'center',
          letterSpacing: 12,
          shadowColor: '#4f46e5',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: value.length > 0 ? 0.1 : 0,
          shadowRadius: 8,
          elevation: value.length > 0 ? 2 : 0,
        }}
        autoCorrect={false}
        autoComplete="off"
      />
    </View>
  );
}
