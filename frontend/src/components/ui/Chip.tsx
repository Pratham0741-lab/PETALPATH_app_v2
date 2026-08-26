/**
 * Chip — small filter / tag pill. Unlike most of the `components/ui` barrel this
 * one has real call sites (13 of them), so the defects below were shipping.
 *
 * Redesign notes (§7, §27, §30):
 *
 *  - The remove affordance was the text character `✕`. It is a real `close`
 *    glyph now, matching every other dismiss control in the app (§7).
 *  - That glyph was `fontSize: 12` with `hitSlop={8}`, giving roughly a 28px
 *    target. A chip is only 28-36px tall so the button cannot grow without
 *    breaking the shape; the hitSlop is computed from `MIN_TOUCH_TARGET`
 *    instead, the same way `IconButton` and `Tag` do it (§30).
 *  - The whole chip is tappable when `onPress` is given, and at `sm` that is a
 *    28px row — also padded out to the minimum now.
 *  - `success` used `leafGreen` on `successLight` and `warning` used `warning`
 *    on `warningLight`. Both are mid-tone fills on pale backgrounds and landed
 *    under 4.5:1; they use the `*Dark` inks now, matching `Tag` and
 *    `FeedbackBanner` (§30, §35).
 *  - The label had `numberOfLines={1}` but no `flexShrink`. RN defaults
 *    `flexShrink` to 0, so a single-line Text in a row measures at its intrinsic
 *    width and pushed straight out through the pill's rounded edges instead of
 *    ellipsizing (§27).
 *  - `active` was visible only as a colour change, with nothing exposed to
 *    assistive tech. It reports `accessibilityState.selected` now (§30).
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography, MIN_TOUCH_TARGET } from '../../theme';
import { PetalIcon } from '../icons';

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
  success: { bg: colors.greenSoft, fg: colors.successDark, border: colors.success },
  warning: { bg: colors.warningLight, fg: colors.warningDark, border: colors.warning },
  error: { bg: colors.errorLight, fg: colors.error, border: colors.error },
};

const chipSizeValues: Record<
  ChipSize,
  { height: number; fontSize: number; paddingHorizontal: number; glyph: number }
> = {
  sm: { height: 28, fontSize: typography.sizes.caption, paddingHorizontal: spacing.md, glyph: 11 },
  md: { height: 36, fontSize: typography.sizes.small, paddingHorizontal: spacing.lg, glyph: 13 },
};

/** The visible circle around the remove glyph. Small by design — see header. */
const REMOVE_DIAMETER = 18;

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

  // Grow the invisible targets out to the minimum without resizing the pill.
  const removeHit = Math.max(0, (MIN_TOUCH_TARGET - REMOVE_DIAMETER) / 2);
  const chipHit = Math.max(0, (MIN_TOUCH_TARGET - sSize.height) / 2);

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
          hitSlop={{
            top: removeHit,
            bottom: removeHit,
            left: removeHit,
            right: removeHit,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          style={styles.closeButton}
        >
          <PetalIcon name="close" size={sSize.glyph} color={vColor.fg} strokeWidth={2.4} />
        </Pressable>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={{ top: chipHit, bottom: chipHit, left: 0, right: 0 }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ selected: active }}
        style={styles.pressWrap}
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
    /* A chip in a row of chips gives way rather than widening past its parent. */
    maxWidth: '100%',
  },
  /* Keeps `alignSelf: 'flex-start'` behaviour when the chip is wrapped. */
  pressWrap: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  label: {
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.medium,
    /* Ellipsize instead of spilling out through the rounded edges (§27). */
    flexShrink: 1,
  },
  iconWrap: {
    marginRight: spacing.xs,
  },
  closeButton: {
    marginLeft: spacing.sm,
    width: REMOVE_DIAMETER,
    height: REMOVE_DIAMETER,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Chip;
