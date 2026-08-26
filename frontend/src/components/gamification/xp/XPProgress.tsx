import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../../theme';
import { ProgressBar } from '../../../components/ui';

interface XPProgressProps {
  currentLevelXP: number;
  nextLevelXP: number;
  xpForCurrentLevel: number;
  progressToNext: number;
}

const XPProgress: React.FC<XPProgressProps> = ({
  currentLevelXP,
  nextLevelXP,
  xpForCurrentLevel,
  progressToNext,
}) => {
  const remaining = nextLevelXP - currentLevelXP;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{xpForCurrentLevel} XP to Level up</Text>
        <Text style={styles.counter}>
          {xpForCurrentLevel} / {remaining} XP
        </Text>
      </View>
      <ProgressBar progress={progressToNext} color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  counter: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
  },
});

export default XPProgress;
