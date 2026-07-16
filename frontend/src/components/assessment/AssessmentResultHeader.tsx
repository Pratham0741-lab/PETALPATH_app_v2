import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { colors, spacing, typography, radius } from '../../theme';

interface Props {
  title: string;
  percentage: number;
  score: number;
  maxScore: number;
  completedAt: string;
}

const getScoreColor = (pct: number): string => {
  if (pct < 40) return colors.error;
  if (pct < 70) return colors.orange;
  return colors.green;
};

export const AssessmentResultHeader: React.FC<Props> = ({
  title,
  percentage,
  score,
  maxScore,
  completedAt,
}) => {
  const scoreColor = getScoreColor(percentage);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.percentage, { color: scoreColor }]}>
        {Math.round(percentage)}%
      </Text>
      <Text style={[styles.fraction, { color: scoreColor }]}>
        {score} / {maxScore}
      </Text>
      <Text style={styles.date}>{completedAt}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  title: {
    fontSize: typography.sizes.sectionTitle,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  percentage: {
    fontSize: typography.sizes.huge,
    fontWeight: typography.weights.black,
    marginBottom: spacing.sm,
  },
  fraction: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.sm,
  },
  date: {
    fontSize: typography.sizes.body,
    color: colors.textSecondary,
  },
});

export default AssessmentResultHeader;
