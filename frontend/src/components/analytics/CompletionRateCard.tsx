import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { ProgressRing } from '../charts/ProgressRing';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';

interface CompletionRateCardProps {
  rate: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  loading?: boolean;
  style?: ViewStyle;
}

export function CompletionRateCard({
  rate,
  trend,
  change,
  loading = false,
  style,
}: CompletionRateCardProps) {
  const { theme: { colors: themeColors } } = useTheme();

  if (loading) {
    return (
      <Card style={style} accessibilityLabel="Loading completion rate">
        <Skeleton width={130} height={22} style={{ marginBottom: spacing.md }} />
        <Skeleton variant="circle" width={100} height={100} style={{ alignSelf: 'center', marginBottom: spacing.sm }} />
        <Skeleton width={80} height={14} style={{ alignSelf: 'center' }} />
      </Card>
    );
  }

  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const trendColor = isUp ? themeColors.success : isDown ? themeColors.error : themeColors.textMuted;
  const trendIcon = isUp ? 'arrow-up' : isDown ? 'arrow-down' : 'remove';
  const sign = change >= 0 ? '+' : '';

  return (
    <Card
      style={style}
      accessibilityLabel={`Completion rate: ${Math.round(rate)}%, ${sign}${change}% ${trend}`}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>Completion Rate</Text>
      <View style={styles.ringContainer}>
        <ProgressRing progress={rate / 100} size={100} strokeWidth={8} color={themeColors.success} />
        <Text style={[styles.rateText, { color: themeColors.text }]}>{Math.round(rate)}%</Text>
      </View>
      <View style={styles.trendRow}>
        <Ionicons name={trendIcon as 'arrow-up' | 'arrow-down' | 'remove'} size={16} color={trendColor} />
        <Text style={[styles.changeText, { color: trendColor }]}>
          {sign}{change}%
        </Text>
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
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  rateText: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.black,
    position: 'absolute',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  changeText: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
});

export default CompletionRateCard;
