import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { BarChart } from '../charts/BarChart';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';

interface MonthlyLearningCardProps {
  buckets: Array<{ label: string; total: number }>;
  loading?: boolean;
  style?: ViewStyle;
}

export function MonthlyLearningCard({
  buckets,
  loading = false,
  style,
}: MonthlyLearningCardProps) {
  const { theme: { colors: themeColors } } = useTheme();

  if (loading) {
    return (
      <Card style={style} accessibilityLabel="Loading monthly learning">
        <Skeleton width={100} height={22} style={{ marginBottom: spacing.md }} />
        <Skeleton variant="rect" width="100%" height={100} style={{ marginBottom: spacing.md }} />
        <Skeleton width={80} height={14} style={{ alignSelf: 'center' }} />
      </Card>
    );
  }

  const monthlyTotal = buckets.reduce((sum, b) => sum + b.total, 0);

  return (
    <Card
      style={style}
      accessibilityLabel={`This month: ${monthlyTotal} total learning activities`}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>This Month</Text>
      <View style={styles.chartContainer}>
        <BarChart
          data={buckets.map((b) => ({ label: b.label, value: b.total }))}
        />
      </View>
      <Text style={[styles.total, { color: themeColors.textSecondary }]}>
        {monthlyTotal} total
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: typography.sizes.cardTitle,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.md,
  },
  chartContainer: {
    marginBottom: spacing.sm,
  },
  total: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
});

export default MonthlyLearningCard;
