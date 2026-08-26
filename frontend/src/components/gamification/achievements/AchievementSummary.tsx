/**
 * AchievementSummary — the "n of m unlocked" header on the Achievements screen.
 *
 * Redesign notes (§5, §7): a hand-rolled surface with an Ionicons trophy on a
 * solid `accent` circle becomes a design-system `Card` with an `IconWell` and a
 * real progress bar, so the child can see how far along they are rather than
 * having to compare two numbers. Yellow on yellow was also unreadable, so the
 * glyph uses the darkened amber on the yellow tint (§30).
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '../../../theme';
import { Card, IconWell, ProgressIndicator } from '../../design';

interface AchievementSummaryProps {
  total: number;
  completed: number;
  style?: StyleProp<ViewStyle>;
}

export const AchievementSummary: React.FC<AchievementSummaryProps> = ({
  total,
  completed,
  style,
}) => {
  const percent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <Card style={style}>
      <View style={styles.row}>
        <IconWell icon="trophy" color={colors.warningDark} soft={colors.yellowSoft} filled />
        <View style={styles.info}>
          <Text style={styles.title} accessibilityRole="header">
            Achievements
          </Text>
          <Text style={styles.count}>
            {completed} of {total} unlocked
          </Text>
        </View>
      </View>
      <ProgressIndicator
        value={percent}
        color={colors.accent}
        style={styles.progress}
        accessibilityLabel={`${completed} of ${total} achievements unlocked`}
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
  progress: {
    marginTop: spacing.md,
  },
});

export default AchievementSummary;
