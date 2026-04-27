import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
  const { colors, resolved } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isCompactPhone = width < 380 || height < 760;
  const styles = useMemo(
    () => createStyles(colors, insets.bottom, isCompactPhone),
    [colors, insets.bottom, isCompactPhone],
  );
  const isDarkTheme = resolved === 'dark';
  const surfaceIconColor = isDarkTheme ? '#f8fafc' : colors.accentText;
  const accentSurface = isDarkTheme ? withAlpha(colors.accent, '1A') : withAlpha(colors.accent, '22');
  const greenSurface = isDarkTheme ? withAlpha('#22c55e', '1A') : withAlpha('#22c55e', '18');
  const destructiveSurface = isDarkTheme ? withAlpha('#ef4444', '20') : withAlpha('#ef4444', '1A');
  const sheetRef = useRef<React.ElementRef<typeof BottomSheetModal>>(null);
  const closingFromPropRef = useRef(false);
  const [localMuted, setLocalMuted] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const muted = typeof isMuted === 'boolean' ? isMuted : localMuted;

  const snapPoints = useMemo(() => (isCompactPhone ? ['58%', '88%'] : ['42%', '62%']), [isCompactPhone]);

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
              <MaterialCommunityIcons name="cog-outline" size={24} color={surfaceIconColor} />
            </View>

            <View style={styles.headerText}>
              <Text style={styles.title}>Chat settings</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {chatName}
              </Text>
            </View>

            <IconButton
              icon="close"
              size={isCompactPhone ? 16 : 18}
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
                  iconBackground={accentSurface}
                  iconColor={surfaceIconColor}
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
              iconBackground={muted ? greenSurface : accentSurface}
              iconColor={muted ? '#4ade80' : surfaceIconColor}
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
                  iconBackground={destructiveSurface}
                  iconColor={isDarkTheme ? '#fecaca' : '#ef4444'}
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
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={22}
                color={isDarkTheme ? '#fecaca' : '#ef4444'}
              />
            </View>
            <Text style={styles.confirmTitle}>Delete chat?</Text>
            <Text style={styles.confirmText}>
              This removes the conversation from this device only. It may still exist on the other device or the XMTP network.
            </Text>
            <View style={styles.confirmActions}>
              <Button
                mode="outlined"
                onPress={() => setDeleteConfirmVisible(false)}
                style={styles.confirmButton}
                contentStyle={styles.confirmButtonContent}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                buttonColor="#ef4444"
                onPress={handleDeleteChat}
                style={styles.confirmButton}
                contentStyle={styles.confirmButtonContent}
              >
                Delete
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </BottomSheetModal>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], bottomInset: number, isCompactPhone: boolean) =>
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
      paddingHorizontal: isCompactPhone ? 14 : 16,
      paddingTop: isCompactPhone ? 6 : 8,
      paddingBottom: isCompactPhone ? 14 : 10,
      gap: isCompactPhone ? 12 : 14,
    },
    scroll: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isCompactPhone ? 10 : 12,
    },
    headerIconWrap: {
      width: isCompactPhone ? 40 : 44,
      height: isCompactPhone ? 40 : 44,
      borderRadius: isCompactPhone ? 20 : 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: isCompactPhone ? 17 : 18,
      fontWeight: '700',
      color: colors.text,
    },
    subtitle: {
      marginTop: 2,
      fontSize: isCompactPhone ? 11 : 12,
      color: colors.muted,
    },
    closeButton: {
      margin: 0,
      width: isCompactPhone ? 36 : 38,
      height: isCompactPhone ? 36 : 38,
      borderRadius: isCompactPhone ? 18 : 19,
    },
    list: {
      gap: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: isCompactPhone ? 60 : 68,
      paddingHorizontal: isCompactPhone ? 10 : 12,
      paddingVertical: isCompactPhone ? 9 : 11,
      gap: isCompactPhone ? 10 : 12,
    },
    rowPressed: {
      opacity: 0.9,
    },
    iconWrap: {
      width: isCompactPhone ? 40 : 44,
      height: isCompactPhone ? 40 : 44,
      borderRadius: isCompactPhone ? 20 : 22,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontSize: isCompactPhone ? 14 : 15,
      fontWeight: '700',
      color: colors.text,
    },
    rowSubtitle: {
      marginTop: 2,
      fontSize: isCompactPhone ? 11 : 12,
      lineHeight: isCompactPhone ? 15 : 16,
      color: colors.muted,
    },
    rowTrailing: {
      marginLeft: isCompactPhone ? 4 : 6,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    divider: {
      marginLeft: isCompactPhone ? 60 : 68,
      backgroundColor: colors.border,
      height: StyleSheet.hairlineWidth,
    },
    helperRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      paddingLeft: isCompactPhone ? 60 : 68,
      paddingRight: isCompactPhone ? 10 : 12,
      paddingTop: isCompactPhone ? 6 : 8,
      paddingBottom: 4,
    },
    helperText: {
      flex: 1,
      fontSize: isCompactPhone ? 11 : 12,
      lineHeight: isCompactPhone ? 15 : 16,
      color: colors.muted,
      opacity: 0.9,
    },
    confirmBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      justifyContent: 'center',
      padding: isCompactPhone ? 16 : 24,
    },
    confirmCard: {
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: isCompactPhone ? 16 : 18,
      gap: isCompactPhone ? 10 : 12,
    },
    confirmIconWrap: {
      width: isCompactPhone ? 40 : 44,
      height: isCompactPhone ? 40 : 44,
      borderRadius: isCompactPhone ? 20 : 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha('#ef4444', '16'),
    },
    confirmTitle: {
      fontSize: isCompactPhone ? 16 : 17,
      fontWeight: '700',
      color: colors.text,
    },
    confirmText: {
      fontSize: isCompactPhone ? 12 : 13,
      lineHeight: isCompactPhone ? 17 : 18,
      color: colors.muted,
    },
    confirmActions: {
      flexDirection: isCompactPhone ? 'column' : 'row',
      gap: 10,
      justifyContent: 'flex-end',
      marginTop: 4,
    },
    confirmButton: {
      width: isCompactPhone ? '100%' : 96,
    },
    confirmButtonContent: {
      height: 44,
    },
    footer: {
      paddingHorizontal: isCompactPhone ? 14 : 16,
      paddingTop: 8,
      paddingBottom: bottomInset + (isCompactPhone ? 16 : 12),
    },
    doneButton: {
      borderRadius: 14,
    },
    doneButtonContent: {
      height: isCompactPhone ? 44 : 46,
    },
    doneButtonLabel: {
      fontSize: isCompactPhone ? 12 : 13,
      fontWeight: '700',
    },
  });

const withAlpha = (hex: string, alphaHex: string) => {
  if (!hex.startsWith('#')) return hex;
  const value = hex.slice(1);
  if (value.length === 6) return `#${value}${alphaHex}`;
  return hex;
};
