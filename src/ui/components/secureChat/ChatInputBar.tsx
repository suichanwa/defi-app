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
import type { ChatReplyReference } from '@app-types/securechat-types/secureChat';

type Props = {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onPickImage: () => void;
  onPickFile?: () => void;
  attachmentUri?: string | null;
  fileAttachment?: { uri: string; name: string } | null;
  onClearAttachment?: () => void;
  onClearFile?: () => void;
  replyTarget?: ChatReplyReference | null;
  onClearReplyTarget?: () => void;
  placeholder?: string;
};

export default function ChatInputBar({
  draft,
  onDraftChange,
  onSend,
  onPickImage,
  onPickFile,
  attachmentUri,
  fileAttachment,
  onClearAttachment,
  onClearFile,
  replyTarget,
  onClearReplyTarget,
  placeholder = 'Type a message...',
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasAttachment = Boolean(attachmentUri);
  const hasFile = Boolean(fileAttachment);

  return (
    <View style={styles.container}>
      {replyTarget ? (
        <View style={styles.replyRow}>
          <View style={styles.replyAccent} />
          <View style={styles.replyBody}>
            <Text numberOfLines={1} style={styles.replyAuthor}>
              Replying to {replyTarget.author}
            </Text>
            <Text numberOfLines={2} style={styles.replyText}>
              {replyTarget.attachment?.kind === 'image'
                ? 'Photo'
                : replyTarget.attachment?.kind === 'file'
                  ? replyTarget.attachment.label
                  : replyTarget.content}
            </Text>
          </View>
          {onClearReplyTarget ? (
            <TouchableOpacity
              onPress={onClearReplyTarget}
              style={styles.replyClose}
              accessibilityLabel="Cancel reply"
            >
              <MaterialCommunityIcons name="close" size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
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
      {hasFile && fileAttachment ? (
        <View style={styles.attachmentRow}>
          <MaterialCommunityIcons name="file-outline" size={18} color={colors.text} />
          <Text style={styles.attachmentLabel} numberOfLines={1}>
            {fileAttachment.name}
          </Text>
          {onClearFile ? (
            <TouchableOpacity onPress={onClearFile} style={styles.clearButton} accessibilityLabel="Remove file">
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <TouchableOpacity onPress={onPickImage} style={styles.attachButton} accessibilityLabel="Attach photo">
          <MaterialCommunityIcons name="image-outline" size={22} color={colors.accentText} />
        </TouchableOpacity>
        {onPickFile ? (
          <TouchableOpacity onPress={onPickFile} style={styles.attachButton} accessibilityLabel="Attach file">
            <MaterialCommunityIcons name="paperclip" size={22} color={colors.accentText} />
          </TouchableOpacity>
        ) : null}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          style={styles.input}
          value={draft}
          onChangeText={onDraftChange}
          onSubmitEditing={onSend}
          returnKeyType="send"
          blurOnSubmit={false}
          multiline
          textAlignVertical="top"
        />
        <TouchableOpacity onPress={onSend} style={styles.sendButton} accessibilityLabel="Send message">
          <MaterialCommunityIcons name="send" size={20} color={colors.accentText} />
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
    replyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: withAlpha(colors.accent, '22'),
      backgroundColor: withAlpha(colors.accent, '10'),
    },
    replyAccent: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 999,
      backgroundColor: colors.accent,
    },
    replyBody: {
      flex: 1,
      minWidth: 0,
    },
    replyAuthor: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.accentText,
    },
    replyText: {
      marginTop: 2,
      fontSize: 13,
      lineHeight: 18,
      color: colors.text,
    },
    replyClose: {
      padding: 4,
    },
    attachmentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
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
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 10 : 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 2,
    },
    attachButton: {
      padding: 12,
      borderRadius: 18,
      backgroundColor: colors.accent,
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      color: colors.text,
      minHeight: 44,
      fontSize: 16,
    },
    sendButton: {
      padding: 12,
      borderRadius: 18,
      backgroundColor: colors.accent,
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

const withAlpha = (hex: string, alphaHex: string) => {
  if (!hex.startsWith('#')) return hex;
  const value = hex.slice(1);
  if (value.length === 6) return `#${value}${alphaHex}`;
  return hex;
};
