import React from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../../theme';

type BadgeVariant = 'primary' | 'error' | 'success' | 'warning';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  count?: number;
  label?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

const badgeColors: Record<BadgeVariant, string> = {
  primary: colors.primary,
  error: colors.error,
  success: colors.success,
  warning: colors.warning,
};

const badgeSizeValues: Record<BadgeSize, { minWidth: number; height: number; fontSize: number; paddingHorizontal: number; dotSize: number }> = {
  sm: { minWidth: 18, height: 18, fontSize: typography.sizes.caption, paddingHorizontal: spacing.xs, dotSize: 8 },
  md: { minWidth: 22, height: 22, fontSize: typography.sizes.small, paddingHorizontal: spacing.sm, dotSize: 10 },
};

export const Badge: React.FC<BadgeProps> = ({
  count,
  label,
  variant = 'error',
  size = 'md',
  dot = false,
  color: colorProp,
  style,
}) => {
  const color = colorProp ?? badgeColors[variant];
  const sSize = badgeSizeValues[size];

  if (dot) {
    return (
      <View
        style={[
          styles.dot,
          {
            width: sSize.dotSize,
            height: sSize.dotSize,
            borderRadius: sSize.dotSize / 2,
            backgroundColor: color,
          },
          style,
        ]}
        accessibilityRole="progressbar"
        accessibilityLabel="Notification"
      />
    );
  }

  if (label) {
    return (
      <View
        style={[
          styles.badge,
          {
            minWidth: sSize.minWidth,
            height: sSize.height,
            borderRadius: sSize.height / 2,
            paddingHorizontal: sSize.paddingHorizontal,
            backgroundColor: color,
          },
          style,
        ]}
        accessibilityRole="text"
        accessibilityLabel={label}
      >
        <Text
          style={[
            styles.text,
            { fontSize: sSize.fontSize },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    );
  }

  if (count === undefined || count === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          minWidth: sSize.minWidth,
          height: sSize.height,
          borderRadius: sSize.height / 2,
          paddingHorizontal: sSize.paddingHorizontal,
          backgroundColor: color,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${count} notifications`}
    >
      <Text
        style={[
          styles.text,
          { fontSize: sSize.fontSize },
        ]}
        numberOfLines={1}
      >
        {count > 99 ? '99+' : count}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  text: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
  },
  dot: {
    alignSelf: 'flex-start',
  },
});

export default Badge;
