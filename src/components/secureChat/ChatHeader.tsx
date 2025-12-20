import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type Props = {
  isCompact: boolean;
  timeLabel?: string;
  locationLabel?: string;
};

export default function ChatHeader({ isCompact, timeLabel, locationLabel }: Props) {
  const hasMeta = Boolean(timeLabel || locationLabel);
  const { colors, resolved } = useTheme();
  const titleColor = resolved === 'dark' ? colors.accent : colors.text;

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: titleColor }]}>Secure Chat</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Components mirrored from repo/secureChat</Text>
        {hasMeta ? (
          <View style={styles.metaRow}>
            {timeLabel ? (
              <Text style={[styles.metaText, { color: colors.muted }]}>Local time: {timeLabel}</Text>
            ) : null}
            {locationLabel ? (
              <Text style={[styles.metaHint, { color: colors.muted }]}>{locationLabel}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  containerCompact: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  titleBlock: {
    flexShrink: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaText: {
    marginRight: 12,
    fontSize: 12,
  },
  metaHint: {
    fontSize: 12,
    opacity: 0.85,
  },
});
