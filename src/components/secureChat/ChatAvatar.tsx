import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { buildIdenticon } from '../../utils/identicon';
import type { ChatAvatarSource } from '../../types/secureChat';

type Props = {
  source: ChatAvatarSource;
  variant?: 'incoming' | 'outgoing';
  size?: number;
  style?: ViewStyle;
};

export default function ChatAvatar({ source, variant = 'incoming', size = 36, style }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, size), [colors, size]);
  const containerStyle = variant === 'outgoing' ? styles.avatarOutgoing : styles.avatarIncoming;

  if (source.kind === 'image') {
    return (
      <View style={[styles.avatarBase, containerStyle, style]}>
        <Image source={{ uri: source.uri }} style={styles.avatarImage} />
      </View>
    );
  }

  if (source.kind === 'identicon') {
    const identicon = buildIdenticon(source.seed);
    return (
      <View style={[styles.avatarBase, containerStyle, style]}>
        <View style={styles.identiconGrid}>
          {identicon.grid.map((filled, index) => (
            <View
              key={`${source.seed}-${index}`}
              style={[styles.identiconCell, filled && { backgroundColor: identicon.color }]}
            />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.avatarBase, containerStyle, style]}>
      <Text style={styles.avatarText}>{source.initials}</Text>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors'], size: number) => {
  const gridSize = Math.max(size - 8, 10);
  const cellSize = gridSize / 5;
  return StyleSheet.create({
    avatarBase: {
      width: size,
      height: size,
      borderRadius: size / 2,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarIncoming: {
      backgroundColor: colors.border,
    },
    avatarOutgoing: {
      backgroundColor: `${colors.accent}33`,
    },
    avatarImage: {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    avatarText: {
      color: colors.text,
      fontWeight: '700',
      fontSize: Math.max(12, Math.floor(size * 0.4)),
    },
    identiconGrid: {
      width: gridSize,
      height: gridSize,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    identiconCell: {
      width: cellSize,
      height: cellSize,
      backgroundColor: 'transparent',
    },
  });
};
