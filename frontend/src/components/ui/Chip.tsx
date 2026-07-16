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

type ChipVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';
type ChipSize = 'sm' | 'md';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  size?: ChipSize;
  active?: boolean;
  onPress?: () => void;
  onClose?: () => void;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const chipVariantColors: Record<ChipVariant, { bg: string; fg: string; border: string }> = {
  default: { bg: colors.surfaceSecondary, fg: colors.textPrimary, border: colors.border },
  primary: { bg: colors.primaryLight, fg: colors.primaryDark, border: colors.primary },
  success: { bg: colors.successLight, fg: colors.leafGreen, border: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warning, border: colors.warning },
  error: { bg: colors.errorLight, fg: colors.error, border: colors.error },
};

const chipSizeValues: Record<ChipSize, { height: number; fontSize: number; paddingHorizontal: number }> = {
  sm: { height: 28, fontSize: typography.sizes.caption, paddingHorizontal: spacing.md },
  md: { height: 36, fontSize: typography.sizes.small, paddingHorizontal: spacing.lg },
};

export const Chip: React.FC<ChipProps> = ({
  label,
  variant: variantProp,
  size = 'md',
  active = false,
  onPress,
  onClose,
  icon,
  accessibilityLabel,
  style,
}) => {
  const variant = active ? 'primary' : (variantProp ?? 'default');
  const vColor = chipVariantColors[variant];
  const sSize = chipSizeValues[size];

  const inner = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: vColor.bg,
          borderColor: vColor.border,
          height: sSize.height,
          paddingHorizontal: sSize.paddingHorizontal,
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text
        style={[
          styles.label,
          { color: vColor.fg, fontSize: sSize.fontSize },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {onClose && (
        <Pressable
          onPress={onClose}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          style={styles.closeButton}
        >
          <Text style={[styles.closeIcon, { color: vColor.fg }]}>✕</Text>
        </Pressable>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.chip,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.medium,
  },
  iconWrap: {
    marginRight: spacing.xs,
  },
  closeButton: {
    marginLeft: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
});

export default Chip;
