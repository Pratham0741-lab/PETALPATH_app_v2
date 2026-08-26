import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography, radius, shadows } from '../../../theme';
import { AppCard } from '../../cards/AppCard';
import { EmptyState } from '../../../components/common/EmptyState';

interface XPBreakdownSource {
  source: string;
  amount: number;
}

interface XPBreakdownCardProps {
  breakdown: XPBreakdownSource[];
  style?: StyleProp<ViewStyle>;
}

const XPBreakdownCard: React.FC<XPBreakdownCardProps> = ({ breakdown, style }) => {
  const total = breakdown.reduce((sum, item) => sum + item.amount, 0);

  return (
    <AppCard style={[styles.card, style]}>
      <Text style={styles.title}>XP Breakdown</Text>
      {breakdown.length === 0 ? (
        <EmptyState message="No XP breakdown yet" />
      ) : (
        <View style={styles.list}>
          {breakdown.map((item) => (
            <View
              key={item.source}
              style={styles.row}
              accessibilityRole="text"
              accessibilityLabel={`${item.source}: ${item.amount} XP`}
            >
              <Text style={styles.source}>{item.source}</Text>
              <Text style={styles.amount}>{item.amount} XP</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>{total} XP</Text>
          </View>
        </View>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  title: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  list: {
    flexDirection: 'column',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  source: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  amount: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  totalAmount: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.black,
    color: colors.text,
  },
  empty: {
    paddingVertical: spacing.lg,
  },
});

export default XPBreakdownCard;
