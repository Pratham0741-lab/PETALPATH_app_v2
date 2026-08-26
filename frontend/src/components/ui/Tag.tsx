/**
 * Tag — a small labelled chip, optionally removable.
 *
 * Redesign notes (§7, §30): exported from the `components/ui` barrel with no
 * call sites today, so it shipped its pre-redesign details untouched.
 *
 *  - The remove affordance was the text character `✕` at `fontSize: 10`. It is a
 *    real `close` glyph now (§7).
 *  - That button was an 18×18 circle with `hitSlop={6}`, giving a 30px target.
 *    A chip is only 24–30px tall, so the button cannot grow without breaking the
 *    shape — the hitSlop is computed instead, so the invisible target always
 *    reaches the 48px minimum no matter which size the chip is (§30).
 *  - `success` drew `colors.leafGreen` on `colors.successLight`. The other four
 *    variants pair a `*Dark` foreground with a soft background; green now does
 *    too, which also lifts it to the same contrast as its neighbours.
 */

import React from 'react';
import { StyleSheet, View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';

import { colors, radius, spacing, typography, MIN_TOUCH_TARGET } from '../../theme';
import { PetalIcon } from '../icons';

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
  success: { bg: colors.greenSoft, fg: colors.successDark },
  warning: { bg: colors.warningLight, fg: colors.warningDark },
  error: { bg: colors.errorLight, fg: colors.error },
};

const tagSizes: Record<TagSize, { height: number; fontSize: number; glyph: number }> = {
  sm: { height: 24, fontSize: typography.sizes.caption, glyph: 11 },
  md: { height: 30, fontSize: typography.sizes.small, glyph: 13 },
};

/** The visible circle around the glyph — deliberately small; see file header. */
const REMOVE_DIAMETER = 20;

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

  // Grow the invisible target out to the minimum in every direction.
  const hit = Math.max(0, (MIN_TOUCH_TARGET - REMOVE_DIAMETER) / 2);

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
        style={[styles.label, { color: vStyle.fg, fontSize: sSize.fontSize }]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {hasRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={{ top: hit, bottom: hit, left: hit, right: hit }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${label}`}
          style={({ pressed }) => [styles.removeButton, pressed && styles.removePressed]}
        >
          <PetalIcon name="close" size={sSize.glyph} color={vStyle.fg} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
  },
  label: {
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.medium,
  },
  removeButton: {
    width: REMOVE_DIAMETER,
    height: REMOVE_DIAMETER,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePressed: {
    opacity: 0.6,
  },
});

export default Tag;
