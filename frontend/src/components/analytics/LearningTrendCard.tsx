import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';

interface LearningTrendCardProps {
  trend: 'improving' | 'declining' | 'stable';
  changePercent: number;
  loading?: boolean;
  style?: ViewStyle;
}

type TrendIconName = 'trending-up' | 'trending-down' | 'remove-circle';

const TREND_ICON: Record<LearningTrendCardProps['trend'], TrendIconName> = {
  improving: 'trending-up',
  declining: 'trending-down',
  stable: 'remove-circle',
};

export function LearningTrendCard({
  trend,
  changePercent,
  loading = false,
  style,
}: LearningTrendCardProps) {
  const { theme: { colors: themeColors } } = useTheme();

  if (loading) {
    return (
      <Card style={style} accessibilityLabel="Loading learning trend">
        <Skeleton width={120} height={22} style={{ marginBottom: spacing.md }} />
        <Skeleton variant="circle" width={48} height={48} style={{ alignSelf: 'center', marginBottom: spacing.sm }} />
        <Skeleton width={100} height={18} style={{ alignSelf: 'center', marginBottom: spacing.xs }} />
        <Skeleton width={60} height={14} style={{ alignSelf: 'center' }} />
      </Card>
    );
  }

  const isImproving = trend === 'improving';
  const isDeclining = trend === 'declining';
  const trendColor = isImproving ? themeColors.success : isDeclining ? themeColors.error : themeColors.textMuted;
  const sign = changePercent >= 0 ? '+' : '';

  return (
    <Card
      style={style}
      accessibilityLabel={`Learning trend: ${trend}, ${sign}${changePercent}% change`}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>Learning Trend</Text>
      <View style={styles.iconContainer}>
        <Ionicons name={TREND_ICON[trend]} size={44} color={trendColor} />
      </View>
      <Text style={[styles.trendLabel, { color: trendColor }]}>
        {isImproving ? 'Improving' : isDeclining ? 'Declining' : 'Stable'}
      </Text>
      <Text style={[styles.changeText, { color: trendColor }]}>
        {sign}{changePercent}%
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
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  trendLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  changeText: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
});

export default LearningTrendCard;
