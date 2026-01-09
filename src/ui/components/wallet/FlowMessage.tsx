import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createWalletStyles } from '@styles/WalletStyles';
import { useTheme } from '@theme/ThemeProvider';

type Props = {
  styles: ReturnType<typeof createWalletStyles>;
  error?: string | null;
  message?: string | null;
};

export default function FlowMessage({ styles, error, message }: Props) {
  const { colors } = useTheme();
  const localStyles = useMemo(() => createStyles(colors), [colors]);
  if (!error && !message) return null;
  return (
    <View style={localStyles.container}>
      {error ? (
        <View style={[localStyles.messageBox, localStyles.errorBox]}>
          <MaterialCommunityIcons name="alert-circle" size={18} color="#ef4444" />
          <Text style={[localStyles.messageText, localStyles.errorText]}>{error}</Text>
        </View>
      ) : null}
      {message ? (
        <View style={[localStyles.messageBox, localStyles.successBox]}>
          <MaterialCommunityIcons name="information" size={18} color="#3b82f6" />
          <Text style={localStyles.messageText}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    container: {
      gap: 8,
      marginTop: 10,
    },
    messageBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      position: 'relative',
    },
    messageText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      color: colors.text,
    },
    errorText: {
      color: colors.warningText,
    },
    errorBox: {
      backgroundColor: `${colors.warningBackground}`,
      borderColor: `${colors.warningBorder}`,
    },
    successBox: {
      backgroundColor: `${colors.accent}14`,
      borderColor: `${colors.accent}4d`,
    },
  });
