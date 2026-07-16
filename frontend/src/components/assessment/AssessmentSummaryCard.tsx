import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { AppCard } from '../cards/AppCard';

interface Props {
  title: string;
  score: number;
  maxScore: number;
  percentage: number;
  duration?: string;
  date?: string;
}

const getScoreColor = (pct: number): string => {
  if (pct < 40) return colors.error;
  if (pct < 70) return colors.orange;
  return colors.green;
};

export const AssessmentSummaryCard: React.FC<Props> = ({
  title,
  score,
  maxScore,
  percentage,
  duration,
  date,
}) => {
  const scoreColor = getScoreColor(percentage);

  return (
    <AppCard>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.scoreRow}>
        <Text style={[styles.percentage, { color: scoreColor }]}>
          {Math.round(percentage)}%
        </Text>
        <Text style={[styles.fraction, { color: scoreColor }]}>
          {score} / {maxScore}
        </Text>
      </View>
      {(duration || date) ? (
        <View style={styles.metaRow}>
          {duration ? (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{duration}</Text>
            </View>
          ) : null}
          {date ? (
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{date}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    color: colors.text,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  percentage: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
  },
  fraction: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    fontSize: typography.sizes.caption,
    color: colors.textSecondary,
  },
});

export default AssessmentSummaryCard;
