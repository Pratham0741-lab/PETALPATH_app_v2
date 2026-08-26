/**
 * StreakCard — current streak and personal best.
 *
 * Redesign notes (§7, §33): the number used to read "🔥 5" — a literal emoji
 * inside the headline figure, sitting right next to an Ionicons flame that said
 * the same thing twice. The emoji is gone and the flame is a single `IconWell`
 * with the `flame` glyph.
 *
 * It is a design-system `Card` rather than an `AppCard`, and it no longer sets
 * its own `margin: spacing.md` — a card that decides its own outer spacing fights
 * whatever lays it out. `DailyChallengesScreen` positions it now.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, spacing, typography } from '../../../theme';
import { Card, IconWell } from '../../design';
import FlameAnimation from './FlameAnimation';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  /**
   * Use the animated flame instead of the static icon well. The screens that
   * feature the streak turn this on; a streak shown incidentally leaves it off.
   */
  animated?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const StreakCard: React.FC<StreakCardProps> = ({
  currentStreak,
  longestStreak,
  animated = false,
  onPress,
  style,
}) => {
  const alive = currentStreak > 0;

  return (
    <Card
      onPress={onPress}
      style={style}
      accessibilityLabel={`${currentStreak} day streak. Personal best ${longestStreak} days.`}
    >
      <View style={styles.row}>
        {animated ? (
          <FlameAnimation active={alive} size={44} />
        ) : (
          <IconWell
            icon="flame"
            color={alive ? colors.warningDark : colors.textMuted}
            soft={alive ? colors.warningLight : colors.skeleton}
            filled={alive}
          />
        )}
        <View style={styles.textWrap}>
          <Text style={styles.number}>{currentStreak}</Text>
          <Text style={styles.label}>day streak</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.bestLabel}>Best</Text>
          <Text style={styles.bestValue}>{longestStreak}</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  number: {
    ...typography.presets.display,
    color: colors.text,
  },
  label: {
    ...typography.presets.subtle,
    color: colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  bestLabel: {
    ...typography.presets.caption,
    color: colors.textSecondary,
  },
  bestValue: {
    ...typography.presets.section,
    color: colors.warningDark,
  },
});

export default StreakCard;
