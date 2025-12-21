import React, { useMemo } from 'react';
import { ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { createProfileStyles } from '@styles/ProfileStyles';
import { useTheme } from '@theme/ThemeProvider';
import ProfileHeader from '@components/profile/ProfileHeader';

type AboutAppTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
};

export default function AboutAppTab({ scrollStyle, cardStyle, onBack }: AboutAppTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <ProfileHeader title="About app" onBack={onBack} />
      <View style={cardStyle}>
        <Text style={styles.cardTitle}>What is this?</Text>
        <Text style={styles.cardSubtitle}>
          bAsically the idea is to make an anonimous crypto chat in which you could talk and trade with others just like
          you, and shits supposed to be annonymous and it'll also have an AI that's gonna help you to mAnAGe your mOnEy
          kinda, we will see tho.
        </Text>
      </View>
    </ScrollView>
  );
}
