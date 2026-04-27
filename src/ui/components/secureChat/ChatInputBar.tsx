import React, { useMemo } from 'react';
import { Image, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import type { ChatReplyReference } from '@app-types/securechat-types/secureChat';
import { createSecureChatStyles } from '@styles/SecureChat';

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
  const styles = useMemo(() => createSecureChatStyles(colors), [colors]);
  const hasAttachment = Boolean(attachmentUri);
  const hasFile = Boolean(fileAttachment);

  return (
    <View style={styles.chatInputContainer}>
      {replyTarget ? (
        <View style={styles.chatReplyRow}>
          <View style={styles.chatReplyAccent} />
          <View style={styles.chatReplyBody}>
            <Text numberOfLines={1} style={styles.chatReplyAuthor}>
              Replying to {replyTarget.author}
            </Text>
            <Text numberOfLines={2} style={styles.chatReplyText}>
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
              style={styles.chatReplyClose}
              accessibilityLabel="Cancel reply"
            >
              <MaterialCommunityIcons name="close" size={16} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {hasAttachment && attachmentUri ? (
        <View style={styles.chatAttachmentRow}>
          <Image source={{ uri: attachmentUri }} style={styles.chatAttachmentThumb} />
          <Text style={styles.chatAttachmentLabel}>Photo attached</Text>
          {onClearAttachment ? (
            <TouchableOpacity onPress={onClearAttachment} style={styles.chatAttachmentClear} accessibilityLabel="Remove photo">
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {hasFile && fileAttachment ? (
        <View style={styles.chatAttachmentRow}>
          <MaterialCommunityIcons name="file-outline" size={18} color={colors.text} />
          <Text style={styles.chatAttachmentLabel} numberOfLines={1}>
            {fileAttachment.name}
          </Text>
          {onClearFile ? (
            <TouchableOpacity onPress={onClearFile} style={styles.chatAttachmentClear} accessibilityLabel="Remove file">
              <MaterialCommunityIcons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      <View style={styles.chatInputRow}>
        <TouchableOpacity onPress={onPickImage} style={styles.chatAttachButton} accessibilityLabel="Attach photo">
          <MaterialCommunityIcons name="image-outline" size={22} color={colors.accentText} />
        </TouchableOpacity>
        {onPickFile ? (
          <TouchableOpacity onPress={onPickFile} style={styles.chatAttachButton} accessibilityLabel="Attach file">
            <MaterialCommunityIcons name="paperclip" size={22} color={colors.accentText} />
          </TouchableOpacity>
        ) : null}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          style={styles.chatTextInput}
          value={draft}
          onChangeText={onDraftChange}
          onSubmitEditing={onSend}
          returnKeyType="send"
          blurOnSubmit={false}
          multiline
          textAlignVertical="top"
        />
        <TouchableOpacity onPress={onSend} style={styles.chatSendButton} accessibilityLabel="Send message">
          <MaterialCommunityIcons name="send" size={20} color={colors.accentText} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
