import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  ActivityIndicator,
  View,
  Animated,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography, shadows, MIN_TOUCH_TARGET } from '../../theme';

/**
 * @deprecated Use `PrimaryButton` / `SecondaryButton` from `components/design`.
 *
 * This is a parallel implementation of the same control (§28) that predates the
 * design system. Nothing renders it today, but it is exported from the
 * `components/ui` barrel and so ships in the bundle, so it has been brought up
 * to the accessibility and responsive baseline rather than left as a trap:
 *
 *  - The label had neither `numberOfLines` nor `flexShrink`. RN defaults
 *    `flexShrink` to 0, so a single-line Text in a row measures at its intrinsic
 *    width — a long label pushed straight out through the pill's rounded edges
 *    instead of ellipsizing (§27).
 *  - `size="sm"` is a 40px pill, below the 48px minimum. It leans on hitSlop for
 *    the missing height now, the same way `IconButton` does (§30).
 *
 * The `opacity` on the disabled state is deliberate and matches `PrimaryButton`:
 * WCAG 1.4.3 exempts inactive controls from the contrast minimum, and fading is
 * the conventional signal. That is *not* true of a disabled text input, which
 * still shows content — see the note in `forms/FormInput.tsx`.
 */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title?: string;
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const variantStyles: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.textInverse },
  secondary: { bg: colors.secondary, fg: colors.textInverse },
  outline: { bg: colors.transparent, fg: colors.primary, border: colors.primary },
  ghost: { bg: colors.transparent, fg: colors.primary },
  danger: { bg: colors.error, fg: colors.textInverse },
  success: { bg: colors.success, fg: colors.textInverse },
};

const sizeStyles: Record<ButtonSize, { height: number; paddingHorizontal: number; fontSize: number; iconSize: number }> = {
  sm: { height: 40, paddingHorizontal: spacing.lg, fontSize: typography.sizes.sm, iconSize: 16 },
  md: { height: 48, paddingHorizontal: spacing.xl, fontSize: typography.sizes.body, iconSize: 20 },
  lg: { height: 56, paddingHorizontal: spacing.xxl, fontSize: typography.sizes.lg, iconSize: 24 },
};

export const Button: React.FC<ButtonProps> = ({
  title,
  label: labelProp,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  accessibilityLabel,
  style,
}) => {
  const resolvedTitle = title ?? labelProp ?? '';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  // `sm` is a 40px pill; pad the target out to the minimum without resizing it.
  const hit = Math.max(0, (MIN_TOUCH_TARGET - sStyle.height) / 2);

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }, style]}>
      <Pressable
        onPress={isDisabled ? undefined : onPress}
        onPressIn={isDisabled ? undefined : handlePressIn}
        onPressOut={isDisabled ? undefined : handlePressOut}
        disabled={isDisabled}
        hitSlop={{ top: hit, bottom: hit, left: 0, right: 0 }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? resolvedTitle}
        accessibilityState={{ disabled: isDisabled }}
        style={[
          styles.base,
          {
            backgroundColor: vStyle.bg,
            borderColor: vStyle.border ?? colors.transparent,
            height: sStyle.height,
            paddingHorizontal: sStyle.paddingHorizontal,
            opacity: isDisabled ? 0.5 : 1,
          },
          fullWidth && { width: '100%' },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={vStyle.fg} />
        ) : (
          <View style={styles.content}>
            {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: vStyle.fg,
                  fontSize: sStyle.fontSize,
                },
              ]}
            >
              {resolvedTitle}
            </Text>
            {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.button,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    ...shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  label: {
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.bold,
    flexShrink: 1,
    textAlign: 'center',
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
});

export default Button;
