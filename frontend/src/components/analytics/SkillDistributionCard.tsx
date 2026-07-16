import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';

interface SkillDistributionCardProps {
  masteryGroups: Array<{ label: string; count: number; color: string }>;
  loading?: boolean;
  style?: ViewStyle;
}

export function SkillDistributionCard({
  masteryGroups,
  loading = false,
  style,
}: SkillDistributionCardProps) {
  const { theme: { colors: themeColors } } = useTheme();

  if (loading) {
    return (
      <Card style={style} accessibilityLabel="Loading skill distribution">
        <Skeleton width={130} height={22} style={{ marginBottom: spacing.md }} />
        <Skeleton variant="rect" width="100%" height={28} style={{ marginBottom: spacing.md, borderRadius: radius.sm }} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ alignItems: 'center', gap: spacing.xs }}>
              <Skeleton variant="circle" width={12} height={12} />
              <Skeleton width={30} height={12} />
            </View>
          ))}
        </View>
      </Card>
    );
  }

  const total = masteryGroups.reduce((sum, g) => sum + g.count, 0);

  return (
    <Card
      style={style}
      accessibilityLabel={`Skill distribution: ${masteryGroups.map((g) => `${g.label}: ${g.count}`).join(', ')}`}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>Skill Distribution</Text>
      <View style={[styles.stackedBar, { backgroundColor: themeColors.surfaceSecondary }]}>
        {masteryGroups.map((group) => {
          const widthPercent = total > 0 ? (group.count / total) * 100 : 0;
          return (
            <View
              key={group.label}
              style={[styles.barSegment, { width: `${widthPercent}%`, backgroundColor: group.color }]}
            />
          );
        })}
      </View>
      <View style={styles.legend}>
        {masteryGroups.map((group) => (
          <View key={group.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: group.color }]} />
            <Text style={[styles.legendLabel, { color: themeColors.textSecondary }]}>{group.label}</Text>
            <Text style={[styles.legendCount, { color: themeColors.text }]}>{group.count}</Text>
          </View>
        ))}
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
  stackedBar: {
    flexDirection: 'row',
    height: 28,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  barSegment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: typography.sizes.caption,
  },
  legendCount: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
});

export default SkillDistributionCard;
