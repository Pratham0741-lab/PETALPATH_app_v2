import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { ProgressRing } from '../design/ProgressIndicator';
import { colors, progressSizes, spacing, typography } from '../../theme';
import { MetricCard, MetricFigure, TrendPill } from './MetricCard';

interface CompletionRateCardProps {
  rate: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function CompletionRateCard({
  rate,
  trend,
  change,
  loading = false,
  style,
}: CompletionRateCardProps) {
  const pct = Math.round(rate);

  return (
    <MetricCard
      title="Completion Rate"
      icon="check"
      loading={loading}
      style={style}
      accessibilityLabel={`Completion rate ${pct} percent, ${change >= 0 ? 'up' : 'down'} ${Math.abs(Math.round(change))} percent.`}
      skeleton={
        <View style={styles.skeleton}>
          <Skeleton variant="circle" width={progressSizes.ringSize} height={progressSizes.ringSize} />
          <Skeleton width={90} height={22} />
        </View>
      }
    >
      <MetricFigure
        above={
          <ProgressRing
            value={rate}
            size={progressSizes.ringSizeLarge}
            stroke={progressSizes.ringStrokeLarge}
            color={colors.success}
            accessibilityLabel="Completion rate"
          >
            <Text style={[typography.presets.stat, styles.ringValue]}>{pct}%</Text>
          </ProgressRing>
        }
        below={<TrendPill direction={trend} change={change} />}
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

export default CompletionRateCard;
