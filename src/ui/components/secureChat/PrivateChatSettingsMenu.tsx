import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Button, Divider, IconButton, Surface, Switch } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme/ThemeProvider';

type PrivateChatSettingsMenuProps = {
  visible: boolean;
  chatName: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onViewProfile?: () => void;
  onClose: () => void;
};

export default function PrivateChatSettingsMenu({
  visible,
  chatName,
  isMuted,
  onToggleMute,
  onViewProfile,
  onClose,
}: PrivateChatSettingsMenuProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const sheetRef = useRef<React.ElementRef<typeof BottomSheetModal>>(null);
  const closingFromPropRef = useRef(false);
  const [localMuted, setLocalMuted] = useState(false);
  const muted = typeof isMuted === 'boolean' ? isMuted : localMuted;

  const snapPoints = useMemo(() => ['46%', '68%'], []);

  useEffect(() => {
    if (visible) {
      closingFromPropRef.current = false;
      sheetRef.current?.present();
      return;
    }
    closingFromPropRef.current = true;
    sheetRef.current?.dismiss();
  }, [visible]);

  const handleDismiss = useCallback(() => {
    if (closingFromPropRef.current) {
      closingFromPropRef.current = false;
      return;
    }
    onClose();
  }, [onClose]);

  const toggleMute = useCallback(() => {
    if (onToggleMute) {
      onToggleMute();
      return;
    }
    setLocalMuted((prev) => !prev);
  }, [onToggleMute]);

  const handleViewProfile = useCallback(() => {
    onClose();
    onViewProfile?.();
  }, [onClose, onViewProfile]);

  const handleBackdropPress = useCallback((props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      pressBehavior="close"
      opacity={0.52}
    />
  ), []);

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDismissOnClose
      onDismiss={handleDismiss}
      backdropComponent={handleBackdropPress}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
      handleStyle={styles.handle}
      topInset={12}
      bottomInset={insets.bottom + 10}
    >
      <BottomSheetScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIconWrap}>
            <MaterialCommunityIcons name="chat-processing-outline" size={20} color={colors.accentText} />
          </View>

          <View style={styles.headerText}>
            <Text style={styles.title}>Chat settings</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {chatName}
            </Text>
          </View>

          <IconButton
            icon="close"
            size={20}
            iconColor={colors.text}
            containerColor={colors.border}
            style={styles.closeButton}
            onPress={handleDismiss}
            accessibilityLabel="Close chat settings"
          />
        </View>

        {onViewProfile ? (
          <Surface style={styles.profileCard} elevation={0}>
            <Pressable
              style={({ pressed }) => [styles.profileRow, pressed && styles.profileRowPressed]}
              onPress={handleViewProfile}
              accessibilityRole="button"
              accessibilityLabel="View profile"
            >
              <View style={styles.profileIcon}>
                <MaterialCommunityIcons name="account-circle-outline" size={18} color={colors.accentText} />
              </View>

              <View style={styles.profileTextBlock}>
                <Text style={styles.profileTitle}>View profile</Text>
                <Text style={styles.profileSubtitle}>Open name and avatar on full screen.</Text>
              </View>

              <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
            </Pressable>
          </Surface>
        ) : null}

        <Surface style={styles.actionCard} elevation={0}>
          <Pressable
            style={({ pressed }) => [styles.actionRow, pressed && styles.actionRowPressed]}
            onPress={toggleMute}
            accessibilityRole="button"
            accessibilityLabel={muted ? 'Unmute notifications' : 'Mute notifications'}
          >
            <View style={[styles.actionIcon, muted ? styles.actionIconMuted : styles.actionIconActive]}>
              <MaterialCommunityIcons
                name={muted ? 'bell-outline' : 'bell-off-outline'}
                size={18}
                color={muted ? '#b45309' : '#15803d'}
              />
            </View>

            <View style={styles.actionTextBlock}>
              <Text style={styles.actionTitle}>{muted ? 'Unmute notifications' : 'Mute notifications'}</Text>
              <Text style={styles.actionSubtitle}>
                {muted
                  ? 'Bring message alerts back for this conversation.'
                  : 'Silence this chat without leaving the thread.'}
              </Text>
            </View>

            <Switch
              value={muted}
              onValueChange={toggleMute}
              color={colors.accent}
              accessibilityLabel={muted ? 'Muted' : 'Notifications on'}
            />
          </Pressable>

          <Divider style={styles.divider} />

          <View style={styles.helperRow}>
            <MaterialCommunityIcons name="information-outline" size={16} color={colors.muted} />
            <Text style={styles.helperText}>
              {muted
                ? 'Muted chats still receive messages. They just do not surface notifications.'
                : 'You can always mute again from this menu.'}
            </Text>
          </View>
        </Surface>

        <Button
          mode="contained"
          onPress={handleDismiss}
          style={styles.doneButton}
          contentStyle={styles.doneButtonContent}
          labelStyle={styles.doneButtonLabel}
        >
          Done
        </Button>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], bottomInset: number) =>
  StyleSheet.create({
    sheetBackground: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    handle: {
      paddingTop: 10,
      paddingBottom: 6,
    },
    handleIndicator: {
      width: 46,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },
    content: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 18 + bottomInset,
      gap: 14,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      marginTop: 3,
      fontSize: 13,
      color: colors.muted,
    },
    closeButton: {
      margin: 0,
    },
    profileCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    profileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    profileRowPressed: {
      opacity: 0.88,
    },
    profileIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
    },
    profileTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    profileTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    profileSubtitle: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      color: colors.muted,
    },
    actionCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    actionRowPressed: {
      opacity: 0.88,
    },
    actionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    actionIconActive: {
      backgroundColor: '#ecfdf3',
      borderColor: '#bbf7d0',
    },
    actionIconMuted: {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
    },
    actionTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    actionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    actionSubtitle: {
      marginTop: 4,
      fontSize: 12,
      lineHeight: 17,
      color: colors.muted,
    },
    divider: {
      backgroundColor: colors.border,
      height: StyleSheet.hairlineWidth,
    },
    helperRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    helperText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
      color: colors.muted,
    },
    doneButton: {
      borderRadius: 14,
    },
    doneButtonContent: {
      height: 48,
    },
    doneButtonLabel: {
      fontSize: 14,
      fontWeight: '700',
    },
  });
