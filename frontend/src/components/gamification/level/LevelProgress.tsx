import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';
import { ProgressBar } from '../../../components/ui';

interface LevelProgressProps {
  level: number;
  progressToNext: number;
  xpForCurrentLevel: number;
  xpNeeded: number;
}

export const LevelProgress: React.FC<LevelProgressProps> = ({
  level,
  progressToNext,
  xpForCurrentLevel,
  xpNeeded,
}) => {
  const percent = Math.round(progressToNext * 100);
  return (
    <View style={styles.container}>
      <Text style={styles.endLabel}>Level {level}</Text>
      <View style={styles.middle}>
        <ProgressBar progress={progressToNext} color={colors.purple} style={styles.bar} />
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <Text style={styles.endLabel}>Level {level + 1}</Text>
      <View style={styles.xpRow}>
        <Text style={styles.xpText}>{xpForCurrentLevel} XP</Text>
        <Text style={styles.xpText}>{xpNeeded} XP</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  middle: {
    flex: 1,
    marginHorizontal: spacing.sm,
  },
  bar: {
    marginBottom: spacing.xs,
  },
  percent: {
    textAlign: 'center',
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    fontFamily: typography.families.rounded,
    color: colors.purple,
  },
  endLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
    color: colors.text,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  xpText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    fontFamily: typography.families.rounded,
    color: colors.textMuted,
  },
});
