import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { ProgressBar } from '../../../components/ui';

interface BadgeProgressProps {
  earnedCount: number;
  totalCount: number;
  style?: StyleProp<ViewStyle>;
}

export const BadgeProgress: React.FC<BadgeProgressProps> = ({ earnedCount, totalCount, style }) => {
  const progress = totalCount > 0 ? (earnedCount / totalCount) * 100 : 0;
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>Badge Progress</Text>
      <Text style={styles.count}>
        Earned {earnedCount} / {totalCount}
      </Text>
      <View style={styles.bar}>
        <ProgressBar progress={progress} color={colors.purple} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadows.md,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
  },
  count: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginVertical: spacing.sm,
  },
  bar: {
    width: '100%',
  },
});
