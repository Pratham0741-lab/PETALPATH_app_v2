import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { BarChart } from '../charts/BarChart';
import { colors, spacing, typography } from '../../theme';
import { MetricCard } from './MetricCard';
import type { PetalIconName } from '../icons';

/**
 * Activity buckets over a window, as bars.
 *
 * `WeeklyLearningCard` and `MonthlyLearningCard` were the same forty lines twice
 * over, differing only in two strings — so they are now both this component
 * with different props (§28). Kept as its own file rather than folded into
 * MetricCard because it pulls in the chart.
 *
 * Deliberately *not* given a grouped `accessibilityLabel`: BarChart already
 * announces its full series ("Mon: 3, Tue: 5, …"), and grouping the card body
 * would hide that behind a shorter summary.
 */

export interface ActivityBucketsCardProps {
  title: string;
  icon?: PetalIconName;
  buckets: Array<{ label: string; total: number }>;
  /** Word after the total, e.g. "activities this week". */
  totalNoun?: string;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const CHART_HEIGHT = 180;

export const ActivityBucketsCard: React.FC<ActivityBucketsCardProps> = ({
  title,
  icon = 'chart',
  buckets,
  totalNoun = 'total',
  loading = false,
  style,
}) => {
  const total = buckets.reduce((sum, b) => sum + b.total, 0);

  return (
    <MetricCard
      title={title}
      icon={icon}
      loading={loading}
      style={style}
      skeleton={
        <View style={styles.skeleton}>
          <Skeleton variant="rect" width="100%" height={CHART_HEIGHT} />
          <Skeleton width={90} height={14} />
        </View>
      }
    >
      <BarChart
        data={buckets.map((b) => ({ label: b.label, value: b.total }))}
        height={CHART_HEIGHT}
        showValues
      />
      <Text style={[typography.presets.subtle, styles.total]}>
        {total} {totalNoun}
      </Text>
    </MetricCard>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  total: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default ActivityBucketsCard;
