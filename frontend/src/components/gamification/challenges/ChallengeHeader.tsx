/**
 * ChallengeHeader — section heading above the day's challenge list.
 *
 * Redesign notes (§6, §29): the hand-rolled font stack becomes typography
 * presets, and the day pill uses the `blueSoft`/`blueDark` token pair instead of
 * `colors.blue + '1A'` — mid blue on its own 10% tint was about 2.3:1, so the
 * day label was close to unreadable (§30).
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '../../../theme';

interface Props {
  title: string;
  subtitle?: string;
  day?: string;
}

export const ChallengeHeader: React.FC<Props> = ({ title, subtitle, day }) => {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
          {title}
        </Text>
        {day ? (
          <View style={styles.dayPill}>
            <Text style={styles.dayText}>{day}</Text>
          </View>
        ) : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    ...typography.presets.section,
    color: colors.text,
    flex: 1,
    minWidth: 0,
  },
  dayPill: {
    backgroundColor: colors.blueSoft,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
  },
  dayText: {
    ...typography.presets.caption,
    color: colors.blueDark,
    fontWeight: typography.weights.bold,
  },
  subtitle: {
    ...typography.presets.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});

export default ChallengeHeader;
