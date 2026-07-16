import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { ProgressRing } from '../charts/ProgressRing';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';

interface ProgressSummaryCardProps {
  completionPercentage: number;
  lessonsCompleted: number;
  totalLessons?: number;
  trend?: 'up' | 'down' | 'stable';
  loading?: boolean;
  style?: ViewStyle;
}

export function ProgressSummaryCard({
  completionPercentage,
  lessonsCompleted,
  totalLessons,
  trend = 'stable',
  loading = false,
  style,
}: ProgressSummaryCardProps) {
  const { theme: { colors: themeColors } } = useTheme();

  if (loading) {
    return (
      <Card style={style} accessibilityLabel="Loading progress summary">
        <Skeleton width={140} height={22} style={{ marginBottom: spacing.md }} />
        <Skeleton variant="circle" width={110} height={110} style={{ alignSelf: 'center', marginBottom: spacing.md }} />
        <Skeleton width={160} height={14} style={{ alignSelf: 'center', marginBottom: spacing.xs }} />
        <Skeleton width={80} height={12} style={{ alignSelf: 'center' }} />
      </Card>
    );
  }

  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const trendIcon = isUp ? 'arrow-up' : isDown ? 'arrow-down' : 'remove';
  const trendColor = isUp ? themeColors.success : isDown ? themeColors.error : themeColors.textMuted;
  const trendLabel = isUp ? 'Improving' : isDown ? 'Declining' : 'Stable';

  return (
    <Card
      style={style}
      accessibilityLabel={`Progress Summary: ${Math.round(completionPercentage)}% complete, ${lessonsCompleted} of ${totalLessons ?? '?'} lessons`}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>Progress Summary</Text>
      <View style={styles.ringContainer}>
        <ProgressRing progress={completionPercentage / 100} size={110} strokeWidth={10} color={themeColors.primary} />
        <Text style={[styles.percentage, { color: themeColors.text }]}>{Math.round(completionPercentage)}%</Text>
      </View>
      <Text style={[styles.subtext, { color: themeColors.textSecondary }]}>
        {lessonsCompleted} of {totalLessons ?? '?'} lessons completed
      </Text>
      <View style={styles.trendRow}>
        <Ionicons name={trendIcon as 'arrow-up' | 'arrow-down' | 'remove'} size={16} color={trendColor} />
        <Text style={[styles.trendLabel, { color: trendColor }]}>{trendLabel}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  percentage: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    position: 'absolute',
  },
  subtext: {
    fontSize: typography.sizes.small,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  trendLabel: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
});

export default ProgressSummaryCard;
