import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, spacing, typography, radius } from '../../theme';

interface Props {
  skillName: string;
  correctCount: number;
  totalCount: number;
  accuracy: number;
  mastery: 'beginner' | 'developing' | 'proficient' | 'advanced' | 'mastered';
}

const masteryColors: Record<string, string> = {
  beginner: colors.error,
  developing: colors.orange,
  proficient: colors.blue,
  advanced: colors.primary,
  mastered: colors.green,
};

const masteryLabels: Record<string, string> = {
  beginner: 'Beginner',
  developing: 'Developing',
  proficient: 'Proficient',
  advanced: 'Advanced',
  mastered: 'Mastered',
};

export const SkillScoreCard: React.FC<Props> = ({
  skillName,
  correctCount,
  totalCount,
  accuracy,
  mastery,
}) => {
  const barColor = masteryColors[mastery];

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <Text style={styles.skillName}>{skillName}</Text>
        <View style={[styles.badge, { backgroundColor: barColor }]}>
          <Text style={styles.badgeText}>{masteryLabels[mastery]}</Text>
        </View>
      </View>
      <View style={styles.barOuter}>
        <View style={[styles.barInner, { width: `${accuracy}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={styles.accuracyText}>
        {correctCount}/{totalCount} correct ({Math.round(accuracy)}%)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  skillName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  badgeText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.white,
  },
  barOuter: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 4,
  },
  accuracyText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
});

export default SkillScoreCard;
