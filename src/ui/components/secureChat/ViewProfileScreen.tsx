import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@theme/ThemeProvider';
import ChatAvatar from '@components/secureChat/ChatAvatar';
import type { ChatAvatarSource } from '@app-types/securechat-types/secureChat';

type ViewProfileScreenProps = {
  name: string;
  avatarSource: ChatAvatarSource;
  onBack: () => void;
};

export default function ViewProfileScreen({ name, avatarSource, onBack }: ViewProfileScreenProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} accessibilityLabel="Back to chat">
          <MaterialCommunityIcons name="arrow-left" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Profile</Text>
        <View style={styles.topSpacer} />
      </View>

      <View style={styles.body}>
        <View style={styles.avatarWrap}>
          <ChatAvatar source={avatarSource} variant="incoming" size={168} style={styles.avatar} />
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {name}
        </Text>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
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
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.border,
    },
    topTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
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
      padding: 10,
      borderRadius: 999,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    avatar: {
      width: 168,
      height: 168,
      borderRadius: 84,
    },
    name: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '800',
      color: colors.text,
      textAlign: 'center',
      paddingHorizontal: 12,
    },
  });
