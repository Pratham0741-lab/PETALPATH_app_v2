/**
 * BadgeProgress — the "Earned n / m" summary above the badge grid.
 *
 * Redesign notes (§5, §29): a hand-rolled surface with its own radius and shadow
 * becomes a design-system `Card` with an `IconWell` and `ProgressIndicator`, so
 * it matches `AchievementSummary` on the sibling screen (§35).
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '../../../theme';
import { Card, IconWell, ProgressIndicator } from '../../design';

interface BadgeProgressProps {
  earnedCount: number;
  totalCount: number;
  style?: StyleProp<ViewStyle>;
}

export const BadgeProgress: React.FC<BadgeProgressProps> = ({
  earnedCount,
  totalCount,
  style,
}) => {
  const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;

  return (
    <Card style={style}>
      <View style={styles.row}>
        <IconWell icon="medal" color={colors.primary} soft={colors.primaryLight} filled />
        <View style={styles.info}>
          <Text style={styles.title} accessibilityRole="header">
            Badge Progress
          </Text>
          <Text style={styles.count}>
            Earned {earnedCount} of {totalCount}
          </Text>
        </View>
      </View>
      <ProgressIndicator
        value={progress}
        color={colors.primary}
        style={styles.bar}
        accessibilityLabel={`${earnedCount} of ${totalCount} badges earned`}
      />
    </Card>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.presets.section,
    color: colors.text,
  },
  count: {
    ...typography.presets.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bar: {
    marginTop: spacing.md,
  },
});

export default BadgeProgress;
