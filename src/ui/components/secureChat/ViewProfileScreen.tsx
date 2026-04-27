import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import ChatAvatar from '@components/secureChat/ChatAvatar';
import type { ChatAvatarSource } from '@app-types/securechat-types/secureChat';
import { createSecureChatStyles } from '@styles/SecureChat';

type ViewProfileScreenProps = {
  name: string;
  avatarSource: ChatAvatarSource;
  onBack: () => void;
};

export default function ViewProfileScreen({ name, avatarSource, onBack }: ViewProfileScreenProps) {
  const { colors } = useTheme();
  const shared = useMemo(() => createSecureChatStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors, shared), [colors, shared]);

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityLabel="Back to chat">
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={shared.pageTitle}>Profile</Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          <ChatAvatar source={avatarSource} variant="incoming" size={168} style={styles.avatar} />
        </View>

        <Text style={shared.pageTitle} numberOfLines={2}>
          {name}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], shared: ReturnType<typeof createSecureChatStyles>) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 12,
      paddingHorizontal: 18,
      paddingBottom: 18,
    },
    topBar: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      ...shared.iconButton,
    },
    topSpacer: {
      width: 40,
      height: 40,
    },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    },
    avatarWrap: {
      ...shared.avatarShell,
    },
    avatar: {
      width: 168,
      height: 168,
      borderRadius: 84,
    },
  });
