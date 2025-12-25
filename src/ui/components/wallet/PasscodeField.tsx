import React, { useEffect, useRef } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  isActive,
  onActivate,
  styles,
}: PasscodeFieldProps) {
  const inputRef = useRef<TextInput>(null);
  const prevAutoFocus = useRef(false);
  const digits = value.split('');
  const activeIndex = Math.min(value.length, PASSCODE_LENGTH - 1);

  useEffect(() => {
    if (!autoFocus || prevAutoFocus.current) {
      prevAutoFocus.current = Boolean(autoFocus);
      return;
    }
    prevAutoFocus.current = true;
    onActivate?.();
    const id = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, [autoFocus, onActivate]);

  const handleActivate = () => {
    onActivate?.();
    inputRef.current?.focus();
  };

  const handleChangeText = (nextValue: string) => {
    const sanitized = nextValue.replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
    onChange(sanitized);
  };

  return (
    <View style={styles.passcodeField}>
      <Text style={styles.passcodeLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.passcodeRow, isActive && styles.passcodeRowActive]}
        onPress={handleActivate}
        activeOpacity={0.9}
      >
        {Array.from({ length: PASSCODE_LENGTH }).map((_, index) => {
          const isCellActive = value.length < PASSCODE_LENGTH && index === activeIndex;
          return (
            <View
              key={`passcode-${index}`}
              style={[
                styles.passcodeCell,
                index < PASSCODE_LENGTH - 1 && styles.passcodeCellSpacing,
                isCellActive && styles.passcodeCellActive,
              ]}
            >
              <View style={[styles.passcodeDot, digits[index] ? styles.passcodeDotFilled : styles.passcodeDotEmpty]} />
            </View>
          );
        })}
      </TouchableOpacity>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChangeText}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={PASSCODE_LENGTH}
        autoFocus={autoFocus}
        secureTextEntry
        style={styles.passcodeHiddenInput}
        showSoftInputOnFocus={false}
        caretHidden
        contextMenuHidden
        autoCorrect={false}
      />
    </View>
  );
}
