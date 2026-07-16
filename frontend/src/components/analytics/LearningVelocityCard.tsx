import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';

interface LearningVelocityCardProps {
  velocity: number;
  trend: 'up' | 'down' | 'stable';
  loading?: boolean;
  style?: ViewStyle;
}

export function LearningVelocityCard({
  velocity,
  trend,
  loading = false,
  style,
}: LearningVelocityCardProps) {
  const { theme: { colors: themeColors } } = useTheme();

  if (loading) {
    return (
      <Card style={style} accessibilityLabel="Loading learning velocity">
        <Skeleton width={140} height={22} style={{ marginBottom: spacing.md }} />
        <Skeleton width={80} height={40} style={{ alignSelf: 'center', marginBottom: spacing.xs }} />
        <Skeleton width={110} height={14} style={{ alignSelf: 'center', marginBottom: spacing.sm }} />
        <Skeleton width={60} height={12} style={{ alignSelf: 'center' }} />
      </Card>
    );
  }

  const isUp = trend === 'up';
  const isDown = trend === 'down';
  const trendIcon = isUp ? 'arrow-up' : isDown ? 'arrow-down' : 'remove';
  const trendColor = isUp ? themeColors.success : isDown ? themeColors.error : themeColors.textMuted;

  return (
    <Card
      style={style}
      accessibilityLabel={`Learning velocity: ${velocity} lessons per week, trend ${trend}`}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>Learning Velocity</Text>
      <Text style={[styles.velocityValue, { color: themeColors.primary }]}>{velocity}</Text>
      <Text style={[styles.velocityLabel, { color: themeColors.textSecondary }]}>Lessons per week</Text>
      <View style={styles.trendRow}>
        <Ionicons name={trendIcon as 'arrow-up' | 'arrow-down' | 'remove'} size={18} color={trendColor} />
        <Text style={[styles.trendText, { color: trendColor, textTransform: 'capitalize' }]}>{trend}</Text>
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
  velocityValue: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
    textAlign: 'center',
    lineHeight: typography.sizes.display * 1.1,
  },
  velocityLabel: {
    fontSize: typography.sizes.small,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  trendText: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.medium,
  },
});

export default LearningVelocityCard;
