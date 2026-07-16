import React from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type PillVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';
type PillSize = 'sm' | 'md';

interface PillProps {
  label: string;
  variant?: PillVariant;
  active?: boolean;
  onPress?: () => void;
  size?: PillSize;
  style?: StyleProp<ViewStyle>;
}

const pillVariants: Record<PillVariant, { bg: string; fg: string; activeBg: string; activeFg: string }> = {
  default: { bg: colors.surfaceSecondary, fg: colors.textSecondary, activeBg: colors.primary, activeFg: colors.textInverse },
  primary: { bg: colors.primaryLight, fg: colors.primaryDark, activeBg: colors.primary, activeFg: colors.textInverse },
  success: { bg: colors.successLight, fg: colors.leafGreen, activeBg: colors.success, activeFg: colors.textInverse },
  warning: { bg: colors.warningLight, fg: colors.warning, activeBg: colors.warning, activeFg: colors.textInverse },
  error: { bg: colors.errorLight, fg: colors.error, activeBg: colors.error, activeFg: colors.textInverse },
};

const pillSizes: Record<PillSize, { height: number; fontSize: number; paddingHorizontal: number }> = {
  sm: { height: 28, fontSize: typography.sizes.caption, paddingHorizontal: spacing.md },
  md: { height: 36, fontSize: typography.sizes.small, paddingHorizontal: spacing.xl },
};

export const Pill: React.FC<PillProps> = ({
  label,
  variant = 'default',
  active = false,
  onPress,
  size = 'md',
  style,
}) => {
  const vStyle = pillVariants[variant];
  const sSize = pillSizes[size];
  const bg = active ? vStyle.activeBg : vStyle.bg;
  const fg = active ? vStyle.activeFg : vStyle.fg;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: bg,
          height: sSize.height,
          paddingHorizontal: sSize.paddingHorizontal,
          borderRadius: sSize.height / 2,
        },
        { transform: [{ scale: pressed ? 0.95 : 1 }] },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: fg,
            fontSize: sSize.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 0,
  },
  label: {
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
});

export default Pill;
