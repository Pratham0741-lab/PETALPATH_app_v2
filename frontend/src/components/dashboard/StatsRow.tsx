import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius, shadows } from '../../theme';
import { Skeleton } from '../ui/Skeleton';

interface StatsRowProps {
  streak?: number;
  xp?: number;
  coins?: number;
  hearts?: number;
  level?: number;
  loading?: boolean;
}

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}

export const StatsRow: React.FC<StatsRowProps> = ({
  streak,
  xp,
  coins,
  hearts,
  level,
  loading = false,
}) => {
  if (loading) {
    return (
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.skeletonCard}>
            <Skeleton variant="circle" width={32} height={32} />
            <Skeleton width={24} height={20} style={{ marginTop: spacing.xs }} />
            <Skeleton width={36} height={12} style={{ marginTop: spacing.xs }} />
          </View>
        ))}
      </View>
    );
  }

  const stats: StatItem[] = [
    ...(typeof streak === 'number' ? [{ label: 'Streak', value: streak, icon: 'flame' as const, color: colors.orange }] : []),
    ...(typeof xp === 'number' ? [{ label: 'XP', value: xp, icon: 'flash' as const, color: colors.accent }] : []),
    ...(typeof coins === 'number' ? [{ label: 'Coins', value: coins, icon: 'wallet' as const, color: colors.accent }] : []),
    ...(typeof hearts === 'number' ? [{ label: 'Hearts', value: hearts, icon: 'heart' as const, color: colors.coral }] : []),
    ...(typeof level === 'number' ? [{ label: 'Level', value: level, icon: 'trophy' as const, color: colors.primary }] : []),
  ];

  if (stats.length === 0) {
    return null;
  }

  return (
    <View style={styles.row} accessibilityLabel="Stats summary" accessibilityRole="summary">
      {stats.map((stat) => (
        <View key={stat.label} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: `${stat.color}18` }]}>
            <Ionicons name={stat.icon} size={18} color={stat.color} />
          </View>
          <Text style={styles.value}>{stat.value}</Text>
          <Text style={styles.label}>{stat.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: {
    flex: 1,
    minWidth: 64,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    ...shadows.sm,
  },
  skeletonCard: {
    flex: 1,
    minWidth: 64,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  value: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  label: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});

export default StatsRow;
