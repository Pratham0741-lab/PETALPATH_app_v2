import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { ProgressRing } from '../design/ProgressIndicator';
import { colors, progressSizes, spacing, typography } from '../../theme';
import { MetricCard, MetricFigure, TrendPill } from './MetricCard';

/**
 * Overall completion, as a ring.
 *
 * The ring used to be `charts/ProgressRing` with the percentage absolutely
 * positioned on top of it — two elements that had to be kept in sync by hand and
 * that a screen reader read as a progressbar followed by a loose "62%". The
 * design-system ring has a real centre slot, so the number lives inside it.
 */

interface ProgressSummaryCardProps {
  completionPercentage: number;
  lessonsCompleted: number;
  totalLessons?: number;
  trend?: 'up' | 'down' | 'stable';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ProgressSummaryCard({
  completionPercentage,
  lessonsCompleted,
  totalLessons,
  trend = 'stable',
  loading = false,
  style,
}: ProgressSummaryCardProps) {
  const pct = Math.round(completionPercentage);
  /* The dashboard calls this without `totalLessons`, and the old card printed
     the gap as a literal "12 of ? lessons". Say what is known instead. */
  const lessonLine =
    typeof totalLessons === 'number'
      ? `${lessonsCompleted} of ${totalLessons} lessons completed`
      : `${lessonsCompleted} lessons completed`;

  return (
    <MetricCard
      title="Progress Summary"
      icon="chart"
      loading={loading}
      style={style}
      accessibilityLabel={`${pct} percent complete. ${lessonLine}.`}
      skeleton={
        <View style={styles.skeleton}>
          <Skeleton variant="circle" width={progressSizes.ringSizeLarge} height={progressSizes.ringSizeLarge} />
          <Skeleton width={160} height={14} />
          <Skeleton width={90} height={22} />
        </View>
      }
    >
      <MetricFigure
        above={
          <ProgressRing
            value={completionPercentage}
            size={progressSizes.ringSizeLarge}
            stroke={progressSizes.ringStrokeLarge}
            color={colors.primary}
            accessibilityLabel="Overall completion"
          >
            <Text style={[typography.presets.stat, styles.ringValue]}>{pct}%</Text>
          </ProgressRing>
        }
        caption={lessonLine}
        below={<TrendPill direction={trend} />}
      />
    </MetricCard>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  ringValue: {
    color: colors.text,
  },
});

export default ProgressSummaryCard;
