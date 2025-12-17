import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  isCompact: boolean;
  timeLabel?: string;
  locationLabel?: string;
};

export default function ChatHeader({ isCompact, timeLabel, locationLabel }: Props) {
  const hasMeta = Boolean(timeLabel || locationLabel);

  return (
    <View style={[styles.container, isCompact && styles.containerCompact]}>
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Secure Chat</Text>
        <Text style={styles.subtitle}>Components mirrored from repo/secureChat</Text>
        {hasMeta ? (
          <View style={styles.metaRow}>
            {timeLabel ? <Text style={styles.metaText}>Local time: {timeLabel}</Text> : null}
            {locationLabel ? <Text style={styles.metaHint}>{locationLabel}</Text> : null}
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
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 4,
    color: '#64748b',
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaText: {
    marginRight: 12,
    fontSize: 12,
    color: '#64748b',
  },
  metaHint: {
    fontSize: 12,
    color: '#94a3b8',
  },
});
