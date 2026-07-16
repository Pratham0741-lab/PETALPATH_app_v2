import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';

interface AdaptiveInsightCardProps {
  title: string;
  description: string;
  insightType: 'momentum' | 'trend' | 'consistency' | 'focus';
  value: number;
  change?: number;
  loading?: boolean;
  style?: ViewStyle;
}

const insightIcons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  momentum: 'trending-up',
  trend: 'pulse',
  consistency: 'repeat',
  focus: 'eye',
};

const insightColors: Record<string, string> = {
  momentum: colors.primary,
  trend: colors.secondary,
  consistency: colors.success,
  focus: colors.accent,
};

export const AdaptiveInsightCard: React.FC<AdaptiveInsightCardProps> = ({
  title,
  description,
  insightType,
  value,
  change,
  loading = false,
  style,
}) => {
  if (loading) {
    return (
      <Card style={[styles.card, style]}>
        <View style={styles.skeletonRow}>
          <Skeleton variant="circle" width={36} height={36} />
          <View style={styles.skeletonText}>
            <Skeleton width={100} height={16} />
            <Skeleton width="100%" height={12} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
        <View style={styles.skeletonRow}>
          <Skeleton width={60} height={24} />
          <Skeleton width={50} height={16} style={{ marginLeft: spacing.sm }} />
        </View>
      </Card>
    );
  }

  const iconName = insightIcons[insightType];
  const iconColor = insightColors[insightType];

  return (
    <Card
      style={[styles.card, style]}
      accessibilityLabel={`Insight: ${title}, ${Math.round(value)}${insightType === 'momentum' ? '%' : ''}`}
    >
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.description} numberOfLines={2}>{description}</Text>
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: iconColor }]}>
          {insightType === 'momentum' ? `${Math.round(value)}%` : Math.round(value)}
        </Text>
        {change !== undefined && (
          <View style={styles.changeRow}>
            <Ionicons
              name={change >= 0 ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={change >= 0 ? colors.success : colors.error}
            />
            <Text
              style={[
                styles.changeText,
                { color: change >= 0 ? colors.success : colors.error },
              ]}
            >
              {Math.abs(change)}%
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  description: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: typography.lineHeights.xs,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  value: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  changeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    marginLeft: 2,
  },
});
