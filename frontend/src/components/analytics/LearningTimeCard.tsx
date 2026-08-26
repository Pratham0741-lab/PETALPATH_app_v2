import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { ParentRow } from '../design/ParentSection';
import { colors, spacing } from '../../theme';
import { MetricCard } from './MetricCard';
import type { PetalIconName } from '../icons';

/**
 * Time spent, per window.
 *
 * These four label/value rows were a private row style repeated inline; they are
 * `ParentRow` now, which is the same row used by every settings and detail list
 * in the parent section and which guarantees the 48px minimum height the old
 * 30px rows missed (§30).
 */

interface LearningTimeCardProps {
  dailyMinutes: number;
  weeklyMinutes: number;
  monthlyMinutes: number;
  averageSessionMinutes: number;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

function formatMinutes(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

export function LearningTimeCard({
  dailyMinutes,
  weeklyMinutes,
  monthlyMinutes,
  averageSessionMinutes,
  loading = false,
  style,
}: LearningTimeCardProps) {
  const rows: Array<{ label: string; minutes: number; icon: PetalIconName }> = [
    { label: 'Today', minutes: dailyMinutes, icon: 'clock' },
    { label: 'This Week', minutes: weeklyMinutes, icon: 'calendar' },
    { label: 'This Month', minutes: monthlyMinutes, icon: 'calendar' },
  ];

  return (
    <MetricCard
      title="Learning Time"
      icon="clock"
      loading={loading}
      style={style}
      accessibilityLabel={`Learning time. Today ${formatMinutes(dailyMinutes)}, this week ${formatMinutes(weeklyMinutes)}, this month ${formatMinutes(monthlyMinutes)}. Average session ${formatMinutes(averageSessionMinutes)}.`}
      skeleton={
        <View style={styles.skeleton}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={20} />
          ))}
        </View>
      }
    >
      {rows.map((row, i) => (
        <ParentRow
          key={row.label}
          label={row.label}
          icon={row.icon}
          value={formatMinutes(row.minutes)}
          divided={i > 0}
        />
      ))}
      <ParentRow
        label="Average Session"
        icon="clock"
        value={formatMinutes(averageSessionMinutes)}
        divided
        style={styles.average}
      />
    </MetricCard>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    gap: spacing.md,
  },
  average: {
    /* The one row that is a derived figure rather than a window of time, so it
       gets a heavier separator than the hairlines above it. */
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
});

export default LearningTimeCard;
