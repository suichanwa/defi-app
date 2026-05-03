import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { createProfileStyles } from '@styles/ProfileStyles';
import { useTheme } from '@theme/ThemeProvider';
import ProfileHeader from '@components/profile/ProfileHeader';
import { CHANGELOG_ENTRIES } from '@constants/changelog.constants';

type ChangelogTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
};

export default function ChangelogTab({ scrollStyle, cardStyle, onBack }: ChangelogTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);
  const localStyles = useMemo(
    () =>
      StyleSheet.create({
        entryHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        },
        titleWrap: {
          flex: 1,
          minWidth: 0,
        },
        changeList: {
          marginTop: 8,
        },
        changeItem: {
          marginTop: 6,
          color: colors.text,
        },
        latestPill: {
          alignSelf: 'center',
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: `${colors.accent}66`,
          backgroundColor: `${colors.accent}22`,
          marginLeft: 6,
          flexShrink: 0,
        },
        latestPillText: {
          color: colors.accent,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
        footerNote: {
          marginTop: 8,
          color: colors.muted,
          fontSize: 12,
        },
      }),
    [colors],
  );

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title="Changelog" onBack={onBack} />

      {CHANGELOG_ENTRIES.map((entry, index) => (
        <View key={entry.id} style={cardStyle}>
          <View style={localStyles.entryHeader}>
            <View style={localStyles.titleWrap}>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {entry.title}
              </Text>
            </View>
            {index === 0 && (
              <View style={localStyles.latestPill}>
                <Text style={localStyles.latestPillText}>Latest</Text>
              </View>
            )}
          </View>
          <Text style={styles.metaText}>{`v${entry.version} - ${entry.date}`}</Text>
          {entry.summary ? <Text style={styles.cardSubtitle}>{entry.summary}</Text> : null}
          <View style={localStyles.changeList}>
            {entry.changes.map((change, changeIndex) => (
              <Text key={`${entry.id}-${changeIndex}`} style={localStyles.changeItem}>
                {`- ${change}`}
              </Text>
            ))}
          </View>
        </View>
      ))}

      <Text style={localStyles.footerNote}>
        Changelog entries are updated with each release so you can track changes over time.
      </Text>
    </ScrollView>
  );
}
