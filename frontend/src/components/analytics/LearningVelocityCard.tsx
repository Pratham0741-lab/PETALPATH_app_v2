import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { colors, spacing } from '../../theme';
import { MetricCard, MetricFigure, TrendPill } from './MetricCard';

interface LearningVelocityCardProps {
  velocity: number;
  trend: 'up' | 'down' | 'stable';
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function LearningVelocityCard({
  velocity,
  trend,
  loading = false,
  style,
}: LearningVelocityCardProps) {
  return (
    <MetricCard
      title="Learning Velocity"
      icon="flame"
      loading={loading}
      style={style}
      accessibilityLabel={`Learning velocity ${velocity} lessons per week, ${trendPhrase(trend)}.`}
      skeleton={
        <View style={styles.skeleton}>
          <Skeleton width={90} height={40} />
          <Skeleton width={130} height={14} />
          <Skeleton width={90} height={22} />
        </View>
      }
    >
      <MetricFigure
        value={String(velocity)}
        valueColor={colors.primary}
        large
        caption="Lessons per week"
        below={<TrendPill direction={trend} />}
      />
    </MetricCard>
  );
}

const trendPhrase = (trend: 'up' | 'down' | 'stable'): string =>
  trend === 'up' ? 'speeding up' : trend === 'down' ? 'slowing down' : 'holding steady';

const styles = StyleSheet.create({
  skeleton: {
    alignItems: 'center',
    gap: spacing.sm,
  },
});

export default LearningVelocityCard;
