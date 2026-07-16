import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';
type TagSize = 'sm' | 'md';

interface TagProps {
  label: string;
  variant?: TagVariant;
  onRemove?: () => void;
  size?: TagSize;
  removable?: boolean;
  style?: StyleProp<ViewStyle>;
}

const tagVariants: Record<TagVariant, { bg: string; fg: string }> = {
  default: { bg: colors.surfaceSecondary, fg: colors.textSecondary },
  primary: { bg: colors.primaryLight, fg: colors.primaryDark },
  success: { bg: colors.successLight, fg: colors.leafGreen },
  warning: { bg: colors.warningLight, fg: colors.warning },
  error: { bg: colors.errorLight, fg: colors.error },
};

const tagSizes: Record<TagSize, { height: number; fontSize: number }> = {
  sm: { height: 24, fontSize: typography.sizes.caption },
  md: { height: 30, fontSize: typography.sizes.small },
};

export const Tag: React.FC<TagProps> = ({
  label,
  variant = 'default',
  onRemove,
  size = 'md',
  removable = false,
  style,
}) => {
  const vStyle = tagVariants[variant];
  const sSize = tagSizes[size];
  const hasRemove = removable || !!onRemove;

  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: vStyle.bg,
          height: sSize.height,
          borderRadius: sSize.height / 2,
          paddingLeft: spacing.sm,
          paddingRight: hasRemove ? spacing.xs : spacing.sm,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: vStyle.fg,
            fontSize: sSize.fontSize,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {hasRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          style={styles.removeButton}
        >
          <Text style={[styles.removeIcon, { color: vStyle.fg }]}>✕</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.medium,
  },
  removeButton: {
    marginLeft: spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeIcon: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
});

export default Tag;
