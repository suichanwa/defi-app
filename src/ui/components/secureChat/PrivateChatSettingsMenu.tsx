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
import { createSecureChatStyles } from '@styles/SecureChat';

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
  const shared = useMemo(
    () => createSecureChatStyles(colors, { compact: isCompactPhone, bottomInset: insets.bottom }),
    [colors, insets.bottom, isCompactPhone],
  );
  const styles = useMemo(
    () => createStyles(colors, insets.bottom, isCompactPhone, shared),
    [colors, insets.bottom, isCompactPhone, shared],
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

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  bottomInset: number,
  isCompactPhone: boolean,
  shared: ReturnType<typeof createSecureChatStyles>,
) =>
  StyleSheet.create({
    sheetContent: {
      ...shared.sheetContent,
    },
    sheetBackground: {
      ...shared.sheetBackground,
    },
    handle: {
      ...shared.sheetHandle,
    },
    handleIndicator: {
      ...shared.sheetHandleIndicator,
    },
    content: {
      ...shared.sheetContentPadding,
    },
    scroll: {
      ...shared.sheetScroll,
    },
    header: {
      ...shared.headerRow,
      justifyContent: 'flex-start',
    },
    headerIconWrap: {
      ...shared.headerIconWrap,
      backgroundColor: colors.accent,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    title: {
      ...shared.headerTitle,
    },
    subtitle: {
      ...shared.headerSubtitle,
      marginTop: 2,
    },
    closeButton: {
      ...shared.closeButton,
    },
    list: {
      gap: 0,
    },
    row: {
      ...shared.row,
    },
    rowPressed: {
      ...shared.rowPressed,
    },
    iconWrap: {
      ...shared.iconCircle,
    },
    textBlock: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      ...shared.rowTitle,
    },
    rowSubtitle: {
      ...shared.rowSubtitle,
    },
    rowTrailing: {
      ...shared.rowTrailing,
    },
    divider: {
      marginLeft: isCompactPhone ? 60 : 68,
      ...shared.divider,
    },
    helperRow: {
      paddingLeft: isCompactPhone ? 60 : 68,
      paddingRight: isCompactPhone ? 10 : 12,
      ...shared.helperRow,
    },
    helperText: {
      ...shared.helperText,
    },
    confirmBackdrop: {
      ...shared.modalBackdrop,
    },
    confirmCard: {
      ...shared.modalCard,
    },
    confirmIconWrap: {
      ...shared.modalIconWrap,
      backgroundColor: withAlpha('#ef4444', '16'),
    },
    confirmTitle: {
      ...shared.modalTitle,
    },
    confirmText: {
      ...shared.modalText,
    },
    confirmActions: {
      ...shared.modalActions,
    },
    confirmButton: {
      ...shared.modalButton,
    },
    confirmButtonContent: {
      ...shared.modalButtonContent,
    },
    footer: {
      ...shared.footer,
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
