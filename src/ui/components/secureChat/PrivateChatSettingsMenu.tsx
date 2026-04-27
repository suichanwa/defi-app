import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { Button, Divider, IconButton, Switch } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@theme/ThemeProvider';

type PrivateChatSettingsMenuProps = {
  visible: boolean;
  chatName: string;
  canDeleteChat?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onViewProfile?: () => void;
  onDeleteChat?: () => void;
  onClose: () => void;
};

const SettingsMenuRow = ({
  icon,
  iconBackground,
  iconColor,
  title,
  description,
  onPress,
  trailing,
  styles,
  accessibilityLabel,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconBackground: string;
  iconColor: string;
  title: string;
  description?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
  accessibilityLabel?: string;
}) => (
  <Pressable
    onPress={onPress}
    disabled={!onPress}
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={accessibilityLabel ?? title}
    style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
  >
    <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
      <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
    </View>

    <View style={styles.textBlock}>
      <Text style={styles.rowTitle}>{title}</Text>
      {description ? <Text style={styles.rowSubtitle}>{description}</Text> : null}
    </View>

    <View style={styles.rowTrailing}>{trailing}</View>
  </Pressable>
);

export default function PrivateChatSettingsMenu({
  visible,
  chatName,
  canDeleteChat,
  isMuted,
  onToggleMute,
  onViewProfile,
  onDeleteChat,
  onClose,
}: PrivateChatSettingsMenuProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const sheetRef = useRef<React.ElementRef<typeof BottomSheetModal>>(null);
  const closingFromPropRef = useRef(false);
  const [localMuted, setLocalMuted] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const muted = typeof isMuted === 'boolean' ? isMuted : localMuted;

  const snapPoints = useMemo(() => ['42%', '62%'], []);

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

  const handleDeleteChat = useCallback(() => {
    setDeleteConfirmVisible(false);
    onClose();
    onDeleteChat?.();
  }, [onClose, onDeleteChat]);

  const handleBackdropPress = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.52}
      />
    ),
    [],
  );

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
      <View style={styles.sheetContent}>
        <BottomSheetScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <MaterialCommunityIcons name="cog-outline" size={24} color={colors.accentText} />
            </View>

            <View style={styles.headerText}>
              <Text style={styles.title}>Chat settings</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {chatName}
              </Text>
            </View>

            <IconButton
              icon="close"
              size={18}
              iconColor={colors.text}
              containerColor={colors.border}
              style={styles.closeButton}
              onPress={handleDismiss}
              accessibilityLabel="Close chat settings"
            />
          </View>

          <View style={styles.list}>
            {onViewProfile ? (
              <>
                <SettingsMenuRow
                  icon="account-circle-outline"
                  iconBackground={withAlpha(colors.accent, '22')}
                  iconColor={colors.accentText}
                  title="View profile"
                  description="Open name and avatar on full screen."
                  onPress={handleViewProfile}
                  trailing={<MaterialCommunityIcons name="chevron-right" size={17} color={colors.muted} />}
                  styles={styles}
                />
                <Divider style={styles.divider} />
              </>
            ) : null}

            <SettingsMenuRow
              icon="bell-off-outline"
              iconBackground={muted ? withAlpha('#22c55e', '18') : withAlpha(colors.accent, '16')}
              iconColor={muted ? '#16a34a' : colors.accentText}
              title={muted ? 'Unmute notifications' : 'Mute notifications'}
              description="Silence this chat without leaving the thread."
              onPress={toggleMute}
              trailing={
                <Switch
                  value={muted}
                  onValueChange={toggleMute}
                  color={colors.accent}
                  accessibilityLabel={muted ? 'Muted' : 'Notifications on'}
                />
              }
              styles={styles}
              accessibilityLabel={muted ? 'Unmute notifications' : 'Mute notifications'}
            />

            <View style={styles.helperRow}>
              <MaterialCommunityIcons name="information-outline" size={14} color={colors.muted} />
              <Text style={styles.helperText}>You can always mute again from this menu.</Text>
            </View>

            {canDeleteChat && onDeleteChat ? (
              <>
                <Divider style={styles.divider} />
                <SettingsMenuRow
                  icon="trash-can-outline"
                  iconBackground={withAlpha('#ef4444', '1A')}
                  iconColor="#ef4444"
                  title="Delete chat"
                  description="Remove this conversation from this device."
                  onPress={() => setDeleteConfirmVisible(true)}
                  trailing={<MaterialCommunityIcons name="chevron-right" size={17} color={colors.muted} />}
                  styles={styles}
                  accessibilityLabel="Delete chat"
                />
              </>
            ) : null}
          </View>
        </BottomSheetScrollView>

        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleDismiss}
            style={styles.doneButton}
            contentStyle={styles.doneButtonContent}
            labelStyle={styles.doneButtonLabel}
          >
            Done
          </Button>
        </View>
      </View>
      <Modal
        visible={deleteConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <Pressable style={styles.confirmBackdrop} onPress={() => setDeleteConfirmVisible(false)}>
          <Pressable style={styles.confirmCard} onPress={(event) => event.stopPropagation()}>
            <View style={styles.confirmIconWrap}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#ef4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete chat?</Text>
            <Text style={styles.confirmText}>
              This removes the conversation from this device only. It may still exist on the other device or the XMTP network.
            </Text>
            <View style={styles.confirmActions}>
              <Button mode="outlined" onPress={() => setDeleteConfirmVisible(false)} style={styles.confirmButton}>
                Cancel
              </Button>
              <Button mode="contained" buttonColor="#ef4444" onPress={handleDeleteChat} style={styles.confirmButton}>
                Delete
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </BottomSheetModal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], bottomInset: number) =>
  StyleSheet.create({
    sheetContent: {
      flex: 1,
    },
    sheetBackground: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    handle: {
      paddingTop: 8,
      paddingBottom: 4,
    },
    handleIndicator: {
      width: 46,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 14,
    },
    scroll: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    headerIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
      paddingTop: 1,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      marginTop: 3,
      fontSize: 12,
      color: colors.muted,
    },
    closeButton: {
      margin: 0,
      width: 38,
      height: 38,
      borderRadius: 19,
    },
    list: {
      gap: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 68,
      paddingHorizontal: 12,
      paddingVertical: 11,
      gap: 12,
    },
    rowPressed: {
      opacity: 0.9,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
    },
    rowSubtitle: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 16,
      color: colors.muted,
    },
    rowTrailing: {
      marginLeft: 6,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    divider: {
      marginLeft: 68,
      backgroundColor: colors.border,
      height: StyleSheet.hairlineWidth,
    },
    helperRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingLeft: 68,
      paddingRight: 12,
      paddingTop: 8,
      paddingBottom: 4,
    },
    helperText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 16,
      color: colors.muted,
      opacity: 0.9,
    },
    confirmBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      padding: 24,
    },
    confirmCard: {
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 12,
    },
    confirmIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha('#ef4444', '16'),
    },
    confirmTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: colors.text,
    },
    confirmText: {
      fontSize: 13,
      lineHeight: 18,
      color: colors.muted,
    },
    confirmActions: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
      marginTop: 4,
    },
    confirmButton: {
      minWidth: 96,
    },
    footer: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: bottomInset + 12,
    },
    doneButton: {
      borderRadius: 14,
    },
    doneButtonContent: {
      height: 46,
    },
    doneButtonLabel: {
      fontSize: 13,
      fontWeight: '700',
    },
  });

const withAlpha = (hex: string, alphaHex: string) => {
  if (!hex.startsWith('#')) return hex;
  const value = hex.slice(1);
  if (value.length === 6) return `#${value}${alphaHex}`;
  return hex;
};
