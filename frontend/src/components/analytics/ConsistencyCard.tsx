import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { ProgressIndicator } from '../design/ProgressIndicator';
import { ParentStatGrid } from '../design/ParentSection';
import { colors, progressSizes, spacing } from '../../theme';
import { MetricCard } from './MetricCard';

/**
 * How reliably the child shows up.
 *
 * The two streak figures were a hand-rolled 2-up row of Ionicons and text; they
 * are now `ParentStatGrid` tiles, which is the same shape used everywhere else
 * in the parent section. `minTileWidth` is dropped to 120 because this grid is
 * nested inside a card and so has ~36px less room than one at screen level.
 */

interface ConsistencyCardProps {
  score: number;
  currentStreak: number;
  longestStreak: number;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ConsistencyCard({
  score,
  currentStreak,
  longestStreak,
  loading = false,
  style,
}: ConsistencyCardProps) {
  return (
    <MetricCard
      title="Consistency"
      icon="flame"
      loading={loading}
      style={style}
      accessibilityLabel={`Consistency score ${Math.round(score)} percent. Current streak ${currentStreak} days, longest streak ${longestStreak} days.`}
      skeleton={
        <View style={styles.skeleton}>
          <Skeleton width="55%" height={14} />
          <Skeleton variant="rect" width="100%" height={progressSizes.barHeight} />
          <View style={styles.skeletonRow}>
            <Skeleton variant="rect" width="47%" height={64} />
            <Skeleton variant="rect" width="47%" height={64} />
          </View>
        </View>
      }
    >
      <ProgressIndicator
        value={score}
        label="Consistency score"
        showPercentage
        color={colors.leafGreen}
        accessibilityLabel="Consistency score"
      />
      <ParentStatGrid
        minTileWidth={120}
        style={styles.streaks}
        stats={[
          {
            label: 'Current Streak',
            value: String(currentStreak),
            icon: 'flame',
            color: colors.warning,
          },
          {
            label: 'Longest Streak',
            value: String(longestStreak),
            icon: 'trophy',
            color: colors.accent,
          },
        ]}
      />
    </MetricCard>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    gap: spacing.xs,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  streaks: {
    marginTop: spacing.lg,
  },
});

export default ConsistencyCard;
