import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
          <Text style={[styles.errorText, localStyles.messageText]}>{error}</Text>
        </View>
      ) : null}
      {message ? (
        <View style={[localStyles.messageBox, localStyles.successBox]}>
          <Text style={[styles.successText, localStyles.messageText]}>{message}</Text>
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
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
    },
    messageText: {
      fontSize: 13,
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
