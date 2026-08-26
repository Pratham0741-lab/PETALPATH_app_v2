import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import {
  colors,
  radius,
  shadows,
  spacing,
  typography,
  buttonSizes,
  iconButtonSizes,
  ButtonSizeToken,
  IconButtonSizeToken,
  MIN_TOUCH_TARGET,
} from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';

/**
 * Buttons (spec §28).
 *
 *  - PrimaryButton   solid pink, the one obvious action on a screen
 *  - SecondaryButton outlined / tinted, for the supporting action
 *  - IconButton      square tap target for chrome (back, sound, settings)
 *
 * All three are real, semantic, accessible buttons — never a styled View —
 * and all meet the 44-48px minimum touch target from the sizing tokens.
 */

type Tone = 'brand' | 'purple' | 'green' | 'blue' | 'yellow' | 'danger' | 'neutral';

/**
 * Each tone carries a *fill* (`solid`/`soft`) and, separately, an `ink` — the
 * colour to draw with when the control is transparent or sits on white.
 *
 * These were one field, and conflating them made every back button in the app
 * invisible. `IconButton variant="surface"` puts a white circle down and drew
 * its glyph in `solid`; for `tone="neutral"` that is `surfaceSecondary`
 * (#FFFDFC) on `surface` (#FFFFFF) — a contrast ratio of 1.01:1. The chevron in
 * `PageHeader`, `ActivityHeader` and `TopBar` was being painted, faithfully, in
 * white on white, and `FormPasswordInput`'s show-password eye had the same fate.
 * A neutral *fill* genuinely is near-white; a neutral *mark* has to be ink.
 *
 * For every other tone `ink` equals `solid`, so nothing else changes appearance.
 */
const TONES: Record<
  Tone,
  { solid: string; pressed: string; onSolid: string; soft: string; onSoft: string; ink: string }
> = {
  brand: {
    solid: colors.primary,
    pressed: colors.primaryDark,
    onSolid: colors.white,
    soft: colors.primaryLight,
    onSoft: colors.primaryDark,
    ink: colors.primary,
  },
  purple: {
    solid: colors.purple,
    pressed: '#6A4FC4',
    onSolid: colors.white,
    soft: colors.secondaryLight,
    onSoft: colors.purpleDark,
    ink: colors.purple,
  },
  green: {
    solid: colors.green,
    pressed: colors.leafGreen,
    onSolid: colors.white,
    soft: colors.greenSoft,
    onSoft: '#4F7F3D',
    ink: colors.green,
  },
  blue: {
    solid: colors.blue,
    pressed: '#3B77BB',
    onSolid: colors.white,
    soft: colors.blueSoft,
    onSoft: colors.blueDark,
    ink: colors.blue,
  },
  yellow: {
    solid: colors.yellow,
    pressed: '#DFB233',
    // Yellow needs dark text to stay legible (spec §30).
    onSolid: colors.text,
    soft: colors.yellowSoft,
    onSoft: '#8A6A0C',
    /* The one tone whose fill is too pale to draw with on white, so the ink is
       the darkened variant the soft chips already use. */
    ink: '#8A6A0C',
  },
  danger: {
    solid: colors.error,
    pressed: '#C2413A',
    onSolid: colors.white,
    soft: colors.errorLight,
    onSoft: '#A83B34',
    ink: colors.error,
  },
  neutral: {
    solid: colors.surfaceSecondary,
    pressed: colors.borderLight,
    onSolid: colors.text,
    soft: colors.surfaceSecondary,
    onSoft: colors.text,
    ink: colors.text,
  },
};

/** Shared press-scale animation, skipped when the button is inert. */
const usePressScale = (enabled: boolean) => {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => {
    if (!enabled) return;
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  };
  return { scale, onPressIn: () => to(0.96), onPressOut: () => to(1) };
};

// ---------------------------------------------------------------------------
// PrimaryButton
// ---------------------------------------------------------------------------

export interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  size?: ButtonSizeToken;
  tone?: Tone;
  /** Icon shown before the label. */
  icon?: PetalIconName;
  /** Icon shown after the label — use for "next"-style actions. */
  iconRight?: PetalIconName;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to the container width. Default true — CTAs read better full-width. */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  label,
  onPress,
  size = 'md',
  tone = 'brand',
  icon,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  labelStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const inert = disabled || loading || !onPress;
  const s = buttonSizes[size];
  const t = TONES[tone];
  const { scale, onPressIn, onPressOut } = usePressScale(!inert);

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale }] }, style]}>
      <Pressable
        onPress={inert ? undefined : onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={inert}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inert, busy: loading }}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          shadows.sm,
          {
            height: s.height,
            paddingHorizontal: s.paddingHorizontal,
            gap: s.gap,
            backgroundColor: pressed && !inert ? t.pressed : t.solid,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={t.onSolid} />
        ) : (
          <>
            {icon ? <PetalIcon name={icon} size={s.iconSize} color={t.onSolid} filled /> : null}
            <Text
              numberOfLines={1}
              style={[
                typography.presets.button,
                styles.label,
                { fontSize: s.fontSize, color: t.onSolid },
                labelStyle,
              ]}
            >
              {label}
            </Text>
            {iconRight ? <PetalIcon name={iconRight} size={s.iconSize} color={t.onSolid} /> : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// SecondaryButton
// ---------------------------------------------------------------------------

export interface SecondaryButtonProps extends PrimaryButtonProps {
  /** `outline` = white with a border; `soft` = tinted fill. Default outline. */
  fill?: 'outline' | 'soft';
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  label,
  onPress,
  size = 'md',
  tone = 'brand',
  fill = 'outline',
  icon,
  iconRight,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  labelStyle,
  accessibilityLabel,
  accessibilityHint,
  testID,
}) => {
  const inert = disabled || loading || !onPress;
  const s = buttonSizes[size];
  const t = TONES[tone];
  const { scale, onPressIn, onPressOut } = usePressScale(!inert);

  /* An outlined button is white, so its label and border are ink, not fill —
     the same conflation that made the neutral back chevron invisible. */
  const fg = fill === 'soft' ? t.onSoft : t.ink;
  const bg = fill === 'soft' ? t.soft : colors.surface;
  const edge = fill === 'soft' ? 'transparent' : t.ink;

  return (
    <Animated.View style={[fullWidth && styles.fullWidth, { transform: [{ scale }] }, style]}>
      <Pressable
        onPress={inert ? undefined : onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={inert}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inert, busy: loading }}
        testID={testID}
        style={({ pressed }) => [
          styles.base,
          {
            height: s.height,
            paddingHorizontal: s.paddingHorizontal,
            gap: s.gap,
            backgroundColor: pressed && !inert ? t.soft : bg,
            borderWidth: 2,
            borderColor: edge,
            opacity: disabled ? 0.45 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={fg} />
        ) : (
          <>
            {icon ? <PetalIcon name={icon} size={s.iconSize} color={fg} /> : null}
            <Text
              numberOfLines={1}
              style={[
                typography.presets.button,
                styles.label,
                { fontSize: s.fontSize, color: fg },
                labelStyle,
              ]}
            >
              {label}
            </Text>
            {iconRight ? <PetalIcon name={iconRight} size={s.iconSize} color={fg} /> : null}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// IconButton
// ---------------------------------------------------------------------------

export interface IconButtonProps {
  icon: PetalIconName;
  onPress?: () => void;
  size?: IconButtonSizeToken;
  tone?: Tone;
  /** `plain` has no background — for dense header rows. */
  variant?: 'soft' | 'solid' | 'plain' | 'surface';
  disabled?: boolean;
  /** Required: an icon-only control has no visible label to lean on (§30). */
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'md',
  tone = 'brand',
  variant = 'soft',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  testID,
}) => {
  const inert = disabled || !onPress;
  const s = iconButtonSizes[size];
  const t = TONES[tone];
  const { scale, onPressIn, onPressOut } = usePressScale(!inert);

  const bg =
    variant === 'solid'
      ? t.solid
      : variant === 'soft'
      ? t.soft
      : variant === 'surface'
      ? colors.surface
      : 'transparent';
  /* `surface` and `plain` both put the glyph on white or on the page, so they
     draw with the tone's ink rather than its fill (see the TONES comment). */
  const fg = variant === 'solid' ? t.onSolid : variant === 'soft' ? t.onSoft : t.ink;

  // Never let a small visual chip shrink the tap area below the minimum. The
  // `sm` well is a 36px circle, so it leans on hitSlop for the missing 6px.
  const hit = Math.max(0, (MIN_TOUCH_TARGET - s.size) / 2);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={inert ? undefined : onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={inert}
        hitSlop={{ top: hit, bottom: hit, left: hit, right: hit }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inert }}
        testID={testID}
        style={({ pressed }) => [
          styles.iconBase,
          {
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: bg,
            borderWidth: variant === 'surface' ? 1.5 : 0,
            borderColor: colors.border,
            opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
          },
        ]}
      >
        <PetalIcon name={icon} size={s.iconSize} color={fg} filled={variant === 'solid'} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.button,
  },
  /**
   * `numberOfLines={1}` alone does not keep a label inside the pill. RN defaults
   * `flexShrink` to 0, so a single-line Text in a row measures at its intrinsic
   * width and spills past both rounded edges — which is what a long translated
   * or catalog-derived label does at 360px. Shrinking lets it ellipsize instead.
   */
  label: {
    flexShrink: 1,
    textAlign: 'center',
  },
  iconBase: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});

export type { Tone as ButtonTone };
export const BUTTON_TONES = TONES;
export default PrimaryButton;
