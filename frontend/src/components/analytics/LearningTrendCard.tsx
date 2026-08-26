import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { IconWell } from '../design/Cards';
import { spacing } from '../../theme';
import { MetricCard, MetricFigure, trendVisual } from './MetricCard';

/**
 * Which way things are going.
 *
 * The direction used to be a bare 44px Ionicon plus two lines of text, all three
 * coloured the same and each restating the other. Now the glyph sits in a tinted
 * well, the word is the headline, and the percentage is the caption underneath —
 * one fact, said once, with a shape as well as a colour behind it (§30).
 */

interface LearningTrendCardProps {
  trend: 'improving' | 'declining' | 'stable';
  changePercent: number;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const WELL_SIZE = 56;

export function LearningTrendCard({
  trend,
  changePercent,
  loading = false,
  style,
}: LearningTrendCardProps) {
  const v = trendVisual(trend);
  const sign = changePercent >= 0 ? '+' : '';
  const change = `${sign}${Math.round(changePercent)}%`;

  return (
    <MetricCard
      title="Learning Trend"
      icon="chart"
      loading={loading}
      style={style}
      accessibilityLabel={`Learning trend ${v.word.toLowerCase()}, ${change} change.`}
      skeleton={
        <View style={styles.skeleton}>
          <Skeleton variant="circle" width={WELL_SIZE} height={WELL_SIZE} />
          <Skeleton width={110} height={20} />
          <Skeleton width={70} height={14} />
        </View>
      }
    >
      <MetricFigure
        above={<IconWell icon={v.icon} color={v.fg} soft={v.bg} size={WELL_SIZE} />}
        value={v.word}
        valueColor={v.fg}
        caption={`${change} vs. the previous period`}
      />
    </MetricCard>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});

export default LearningTrendCard;
