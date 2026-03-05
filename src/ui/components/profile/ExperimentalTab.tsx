import React, { useMemo } from 'react';
import { ScrollView, Switch, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createProfileStyles } from '@styles/ProfileStyles';
import { useTheme } from '@theme/ThemeProvider';

type ExperimentalTabProps = {
  scrollStyle: StyleProp<ViewStyle>;
  cardStyle: StyleProp<ViewStyle>;
  onBack: () => void;
  cardNamesEnabled: boolean;
  onToggleCardNames: (enabled: boolean) => void;
  onSave: () => Promise<void>;
  message: string | null;
  error: string | null;
};

export default function ExperimentalTab({
  scrollStyle,
  cardStyle,
  onBack,
  cardNamesEnabled,
  onToggleCardNames,
  onSave,
  message,
  error,
}: ExperimentalTabProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createProfileStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={scrollStyle} showsVerticalScrollIndicator={false}>
      <View style={styles.titleBlock}>
        <TouchableOpacity onPress={onBack} style={{ marginRight: 12 }}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Experimental</Text>
          <Text style={styles.cardSubtitle}>Try out new features in development.</Text>
        </View>
      </View>

      <View style={cardStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={styles.cardTitle}>Names for cards</Text>
            <Text style={styles.cardSubtitle}>
              Add custom names to your wallet cards during creation for easier identification.
            </Text>
          </View>
          <Switch
            value={cardNamesEnabled}
            onValueChange={onToggleCardNames}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={colors.background}
          />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
        {message && <Text style={styles.successText}>{message}</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={onSave} activeOpacity={0.9}>
          <Text style={styles.primaryButtonText}>Save preferences</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
