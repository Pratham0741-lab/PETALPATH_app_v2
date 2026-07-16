import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Skeleton } from '../ui/Skeleton';

interface DailyProgressProps {
  todayCompleted?: number;
  dailyGoal?: number;
  completionPercentage?: number;
  minutesLearned?: number;
  loading?: boolean;
}

export const DailyProgress: React.FC<DailyProgressProps> = ({
  todayCompleted = 0,
  dailyGoal = 5,
  completionPercentage,
  minutesLearned,
  loading = false,
}) => {
  const pct = completionPercentage ?? (dailyGoal > 0 ? Math.round((todayCompleted / dailyGoal) * 100) : 0);

  if (loading) {
    return (
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <Skeleton variant="circle" width={32} height={32} />
          <Skeleton width={120} height={16} style={{ marginLeft: spacing.sm }} />
        </View>
        <Skeleton width="100%" height={16} style={{ marginTop: spacing.md }} />
        <Skeleton width={80} height={14} style={{ marginTop: spacing.sm }} />
      </Card>
    );
  }

  return (
    <Card
      style={styles.card}
      accessibilityLabel={`Daily progress: ${pct}% complete`}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${colors.success}18` }]}>
          <Ionicons name="sunny" size={20} color={colors.success} />
        </View>
        <Text style={styles.title}>Daily Progress</Text>
      </View>

      <ProgressBar
        progress={pct}
        variant="success"
        showPercentage
        label={`${todayCompleted} of ${dailyGoal} lessons`}
        style={styles.progressBar}
      />

      {typeof minutesLearned === 'number' && (
        <View style={styles.minutesRow}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.minutesText}>{minutesLearned} min learned today</Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  progressBar: {
    marginBottom: spacing.sm,
  },
  minutesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  minutesText: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
});

export default DailyProgress;
