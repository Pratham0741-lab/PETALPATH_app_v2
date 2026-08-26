import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Skeleton } from '../ui/Skeleton';
import { colors, progressSizes, radius, spacing, typography } from '../../theme';
import { MetricCard } from './MetricCard';

/**
 * How the child's skills are spread across mastery levels.
 *
 * Stays a stacked bar — it is the right shape for parts of a whole — but on the
 * shared bar height and pill radius rather than its own, and the legend now
 * reads "Mastered 12" as one unit so the count is never orphaned from its
 * colour.
 */

interface SkillDistributionCardProps {
  masteryGroups: Array<{ label: string; count: number; color: string }>;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function SkillDistributionCard({
  masteryGroups,
  loading = false,
  style,
}: SkillDistributionCardProps) {
  const total = masteryGroups.reduce((sum, g) => sum + g.count, 0);

  return (
    <MetricCard
      title="Skill Distribution"
      icon="medal"
      loading={loading}
      style={style}
      footnote={total > 0 ? `${total} skills tracked` : undefined}
      accessibilityLabel={
        total > 0
          ? `Skill distribution. ${masteryGroups.map((g) => `${g.label}: ${g.count}`).join(', ')}.`
          : 'Skill distribution. No skills tracked yet.'
      }
      skeleton={
        <View style={styles.skeleton}>
          <Skeleton variant="rect" width="100%" height={progressSizes.barHeightThick} />
          <View style={styles.skeletonLegend}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} width={70} height={12} />
            ))}
          </View>
        </View>
      }
    >
      <View style={styles.stack}>
        {masteryGroups.map((group) => {
          const share = total > 0 ? (group.count / total) * 100 : 0;
          if (share <= 0) return null;
          return (
            <View
              key={group.label}
              style={{ width: `${share}%`, height: '100%', backgroundColor: group.color }}
            />
          );
        })}
      </View>

      <View style={styles.legend}>
        {masteryGroups.map((group) => (
          <View key={group.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: group.color }]} />
            <Text style={[typography.presets.caption, styles.legendLabel]}>{group.label}</Text>
            <Text style={[typography.presets.caption, styles.legendCount]}>{group.count}</Text>
          </View>
        ))}
      </View>
    </MetricCard>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    gap: spacing.md,
  },
  skeletonLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  stack: {
    flexDirection: 'row',
    height: progressSizes.barHeightThick,
    borderRadius: radius.pill,
    backgroundColor: colors.skeleton,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  legendLabel: {
    color: colors.textSecondary,
  },
  legendCount: {
    color: colors.text,
    fontWeight: '900',
  },
});

export default SkillDistributionCard;
