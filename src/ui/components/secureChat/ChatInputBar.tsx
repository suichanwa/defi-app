import React, { useMemo } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';

type Props = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  attachmentUri?: string | null;
  onClearAttachment?: () => void;
  placeholder?: string;
};

export default function ChatInputBar({
  draft,
  onDraftChange,
  onSend,
  onPickImage,
  attachmentUri,
  onClearAttachment,
  placeholder = 'Type a message...',
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasAttachment = Boolean(attachmentUri);

  return (
    <View style={styles.container}>
      {hasAttachment && attachmentUri ? (
        <View style={styles.attachmentRow}>
          <Image source={{ uri: attachmentUri }} style={styles.attachmentThumb} />
          <Text style={styles.attachmentLabel}>Photo attached</Text>
          {onClearAttachment ? (
            <TouchableOpacity onPress={onClearAttachment} style={styles.clearButton} accessibilityLabel="Remove photo">
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <TouchableOpacity onPress={onPickImage} style={styles.attachButton} accessibilityLabel="Attach photo">
          <MaterialCommunityIcons name="image-outline" size={18} color={colors.accentText} />
        </TouchableOpacity>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={draft}
          onChangeText={onDraftChange}
          onSubmitEditing={onSend}
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <TouchableOpacity onPress={onSend} style={styles.sendButton} accessibilityLabel="Send message">
          <MaterialCommunityIcons name="send" size={18} color={colors.accentText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: {
  text: string;
  muted: string;
  accent: string;
  accentText: string;
  border: string;
  card: string;
}) =>
  StyleSheet.create({
    container: {
      gap: 8,
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: colors.border,
    },
    attachmentThumb: {
      width: 44,
      height: 44,
      borderRadius: 8,
      marginRight: 10,
    },
    attachmentLabel: {
      flex: 1,
      fontSize: 13,
      color: colors.text,
      fontWeight: '600',
    },
    clearButton: {
      padding: 4,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    },
    attachButton: {
      padding: 10,
      borderRadius: 16,
      backgroundColor: colors.accent,
      marginRight: 8,
    },
    input: {
      flex: 1,
      color: colors.text,
      minHeight: 40,
      fontSize: 16,
    },
    sendButton: {
      marginLeft: 8,
      padding: 10,
      borderRadius: 16,
      backgroundColor: colors.accent,
    },
  });
