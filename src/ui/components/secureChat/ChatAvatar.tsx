import React, { useEffect, useMemo, useState } from 'react';
import { Image, Platform, StyleSheet, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useTheme } from '@theme/ThemeProvider';
import { buildIdenticon } from '@utils/identicon';
import type { ChatAvatarSource } from '@app-types/securechat-types/secureChat';

type ChatAvatarProps = {
  source: ChatAvatarSource;
  variant: 'incoming' | 'outgoing';
  style?: StyleProp<ViewStyle>;
  size?: number;
  onPress?: () => void;
};

export default function ChatAvatar({ source, variant, style, size = 32, onPress }: ChatAvatarProps) {
  const { colors } = useTheme();
  const [imageFailed, setImageFailed] = useState(false);

  // Check if custom URI is usable (not a local file on web)
  const isCustomUriUsable = useMemo(() => {
    if (source.avatarType !== 'custom' || !source.uri) return false;
    // On web, file:// URIs cannot be displayed
    if (Platform.OS === 'web') {
      const uri = source.uri;
      if (uri.startsWith('file://') || uri.startsWith('/data/')) {
        return false;
      }
    }
    return true;
  }, [source]);

  const imageUri = isCustomUriUsable && source.uri ? source.uri : undefined;

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri, source.avatarType]);

  const identiconData = useMemo(() => {
    // Use identicon if custom URI is not usable
    if ((source.avatarType === 'identicon' || !isCustomUriUsable || imageFailed) && source.seed) {
      return buildIdenticon(source.seed);
    }
    return null;
  }, [source, isCustomUriUsable, imageFailed]);

  const containerStyle = [
    styles.container,
    { width: size, height: size, borderRadius: size / 2 },
    variant === 'outgoing' ? styles.outgoing : styles.incoming,
    { backgroundColor: colors.border },
    style,
  ];

  const imageSize = size - 4;
  const cellSize = imageSize / 5;

  const renderIdenticon = () => {
    if (!identiconData) return null;
    const { grid, color } = identiconData;
    const rects: React.ReactNode[] = [];
    for (let i = 0; i < 25; i++) {
      if (grid[i]) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        rects.push(
          <Rect
            key={i}
            x={col * cellSize}
            y={row * cellSize}
            width={cellSize}
            height={cellSize}
            fill={color}
          />
        );
      }
    }
    return (
      <Svg width={imageSize} height={imageSize} style={{ borderRadius: imageSize / 2 }}>
        <Rect x={0} y={0} width={imageSize} height={imageSize} fill={colors.card} />
        {rects}
      </Svg>
    );
  };

  const content = (
    <View style={containerStyle}>
      {imageUri && !imageFailed ? (
        <Image
          source={{ uri: imageUri }}
          style={{ width: imageSize, height: imageSize, borderRadius: imageSize / 2 }}
          onError={() => setImageFailed(true)}
        />
      ) : identiconData ? (
        renderIdenticon()
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: imageSize, height: imageSize, borderRadius: imageSize / 2, backgroundColor: colors.muted },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  incoming: {},
  outgoing: {},
  placeholder: {},
});
