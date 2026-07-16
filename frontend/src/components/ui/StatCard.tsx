import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography, shadows } from '../../theme';

type StatCardVariant = 'elevated' | 'outlined' | 'flat';
type TrendDirection = 'up' | 'down' | 'neutral';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  iconColor?: string;
  trend?: TrendDirection;
  trendValue?: string;
  variant?: StatCardVariant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

const trendColors: Record<TrendDirection, string> = {
  up: colors.success,
  down: colors.error,
  neutral: colors.textMuted,
};

const trendIcons: Record<TrendDirection, string> = {
  up: '↑',
  down: '↓',
  neutral: '→',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon,
  iconColor,
  trend,
  trendValue,
  variant = 'elevated',
  onPress,
  style,
}) => {
  const containerStyle = [
    styles.container,
    variant === 'outlined' && {
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    variant === 'flat' && {
      backgroundColor: colors.surfaceSecondary,
      ...shadows.sm,
    },
    variant === 'elevated' && {
      ...shadows.md,
    },
    style,
  ];

  const content = (
    <View style={containerStyle}>
      <View style={styles.topRow}>
        {icon && (
          <View style={styles.iconWrap}>
            {typeof icon === 'string' ? (
              <Ionicons name={icon as any} size={20} color={iconColor ?? colors.textSecondary} />
            ) : (
              icon
            )}
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>
          {value}
          {unit && <Text style={styles.unit}> {unit}</Text>}
        </Text>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: `${trendColors[trend]}20` }]}>
            <Text style={[styles.trendIcon, { color: trendColors[trend] }]}>
              {trendIcons[trend]}
            </Text>
            {trendValue && (
              <Text style={[styles.trendValue, { color: trendColors[trend] }]}>
                {trendValue}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${value}`}
        style={({ pressed }) => [
          { transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconWrap: {
    marginRight: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.medium,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  value: {
    fontSize: typography.sizes.xxxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
  },
  unit: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.regular,
    color: colors.textMuted,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.chip,
  },
  trendIcon: {
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.bold,
  },
  trendValue: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.xs,
    fontFamily: typography.families.rounded,
  },
});

export default StatCard;
