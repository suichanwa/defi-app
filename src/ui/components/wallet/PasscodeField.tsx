import React, { useCallback, useEffect, useRef } from 'react';
import { InteractionManager, Pressable, Text, View, StyleSheet, TextInput } from 'react-native';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';

type PasscodeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  isActive?: boolean;
  onActivate?: () => void;
  error?: string | null;
  styles: ReturnType<typeof createWalletStyles>;
};

export default function PasscodeField({
  label,
  value,
  onChange,
  autoFocus,
  isActive,
  onActivate,
  error,
}: PasscodeFieldProps) {
  const { colors } = useTheme();
  const PASSCODE_LENGTH = 6;
  const inputRef = useRef<TextInput>(null);

  const focusInput = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      inputRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    if (isActive || autoFocus) {
      focusInput();
    }
  }, [autoFocus, focusInput, isActive]);

  // Clear input when error occurs
  useEffect(() => {
    if (error && value.length > 0) {
      console.log('=== PasscodeField: Error detected, clearing input ===', label, error);
      onChange('');
    }
  }, [error, value.length, onChange, label]);

  return (
    <View style={localStyles.container}>
      <Text style={[localStyles.label, { color: colors.muted }]}>{label}</Text>
      
      {/* Visual dots display */}
      <Pressable
        style={[
          localStyles.dotsContainer,
          isActive && { backgroundColor: `${colors.accent}10` }
        ]}
        onPress={() => {
          console.log('=== PasscodeField Pressable Pressed ===', label);
          onActivate?.();
          focusInput();
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {/* Hidden input overlays the dots - positioned to cover the entire pressable area */}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(text) => {
            console.log('=== PasscodeField TextInput onChangeText ===', label, text);
            onChange(text);
          }}
          keyboardType="number-pad"
          maxLength={PASSCODE_LENGTH}
          autoFocus={autoFocus}
          showSoftInputOnFocus={true}
          secureTextEntry={false}
          style={localStyles.hiddenInput}
          onFocus={() => {
            console.log('=== PasscodeField TextInput onFocus ===', label);
            onActivate?.();
          }}
          onBlur={() => {
            console.log('=== PasscodeField TextInput onBlur ===', label);
          }}
          editable={true}
          selectTextOnFocus={false}
          caretHidden={true}
        />
        
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
      </Pressable>
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
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    color: 'transparent',
    backgroundColor: 'transparent',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    minHeight: 56,
    alignItems: 'center',
    position: 'relative',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    zIndex: -1,
  },
});
