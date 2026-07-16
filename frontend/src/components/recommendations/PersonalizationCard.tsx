import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../theme';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { ProgressBar } from '../ui/ProgressBar';

interface PersonalizationCardProps {
  factor: string;
  value: number;
  maxValue?: number;
  icon?: string;
  color?: string;
  loading?: boolean;
  style?: ViewStyle;
}

export const PersonalizationCard: React.FC<PersonalizationCardProps> = ({
  factor,
  value,
  maxValue,
  icon,
  color,
  loading = false,
  style,
}) => {
  if (loading) {
    return (
      <Card style={[styles.card, style]}>
        <View style={styles.skeletonRow}>
          <Skeleton variant="circle" width={32} height={32} />
          <View style={styles.skeletonText}>
            <Skeleton width={80} height={14} />
            <Skeleton width="100%" height={6} style={{ marginTop: spacing.xs }} />
            <Skeleton width={40} height={12} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
      </Card>
    );
  }

  const resolvedMax = maxValue ?? 100;
  const progressValue = (value / resolvedMax) * 100;
  const progressColor = color ?? colors.primary;

  return (
    <Card
      style={[styles.card, style]}
      accessibilityLabel={`${factor}: ${value}${maxValue ? ` out of ${maxValue}` : ''}`}
    >
      <View style={styles.row}>
        {icon && (
          <View style={[styles.iconWrap, { backgroundColor: `${progressColor}18` }]}>
            <Ionicons name={icon as any} size={18} color={progressColor} />
          </View>
        )}
        <View style={styles.content}>
          <Text style={styles.factor} numberOfLines={1}>{factor}</Text>
          <ProgressBar
            progress={progressValue}
            height={6}
            color={progressColor}
            style={{ marginTop: spacing.xs }}
          />
          <Text style={[styles.value, { color: progressColor }]}>
            {Math.round(value)}{maxValue ? ` / ${maxValue}` : ''}
          </Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.sm,
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
    alignItems: 'center',
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
  },
  factor: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  value: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    marginTop: 2,
  },
});
