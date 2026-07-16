import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, spacing, typography, radius } from '../../theme';

type ListItemVariant = 'default' | 'primary' | 'danger';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  showChevron?: boolean;
  disabled?: boolean;
  variant?: ListItemVariant;
  style?: StyleProp<ViewStyle>;
}

const listItemVariants: Record<ListItemVariant, { bg: string; titleColor: string; subtitleColor: string }> = {
  default: { bg: colors.surface, titleColor: colors.textPrimary, subtitleColor: colors.textSecondary },
  primary: { bg: colors.surface, titleColor: colors.primary, subtitleColor: colors.textSecondary },
  danger: { bg: colors.surface, titleColor: colors.error, subtitleColor: colors.textSecondary },
};

export const ListItem: React.FC<ListItemProps> = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onPress,
  onLongPress,
  showChevron = false,
  disabled = false,
  variant = 'default',
  style,
}) => {
  const vStyle = listItemVariants[variant];

  const content = (
    <View style={[styles.inner, { opacity: disabled ? 0.5 : 1 }]}>
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
      <View style={styles.textContainer}>
        <Text
          style={[
            styles.title,
            { color: vStyle.titleColor },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              { color: vStyle.subtitleColor },
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      {showChevron && (
        <Text style={styles.chevron}>›</Text>
      )}
    </View>
  );

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        onLongPress={disabled ? undefined : onLongPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [
          styles.container,
          { backgroundColor: pressed ? colors.surfaceSecondary : vStyle.bg },
          style,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: vStyle.bg }, style]}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftIcon: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.medium,
    fontFamily: typography.families.rounded,
  },
  subtitle: {
    fontSize: typography.sizes.small,
    marginTop: spacing.xs,
    fontFamily: typography.families.rounded,
  },
  rightIcon: {
    marginLeft: spacing.md,
  },
  chevron: {
    fontSize: typography.sizes.xl,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
});

export default ListItem;
