import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';
import { PetalIcon, PetalIconName } from '../icons';

/**
 * ImageSlot — the single seam every character/scene/illustration goes through.
 *
 * The redesign uses real image art (uploaded later) for mascots, avatars,
 * scenes and hero pictures. Until a given image lands, this renders a **clean,
 * on‑brand placeholder frame** — a soft tinted rounded block with a small icon
 * (and optional label) — so the layout is complete and premium *now*, and the
 * moment a `source` is passed the same slot shows the real picture at the same
 * size and shape. Nothing else in the app needs to change when art arrives.
 *
 * Deliberately flat (no gradient/glass), rounded, and sized by an aspect ratio
 * so a caller only ever passes one dimension and can't squash the art.
 */
export interface ImageSlotProps {
  /** The bundled/remote image. When omitted, the placeholder frame is drawn. */
  source?: ImageSourcePropType;
  /** Width in px (height follows `aspectRatio`). */
  width?: number;
  /** width ÷ height. 1 = square (characters), 16/9 = scene banner. */
  aspectRatio?: number;
  /** Placeholder tint (background wash). Defaults to a soft brand pink. */
  tint?: string;
  /** Placeholder glyph shown in the centre of the frame. */
  icon?: PetalIconName;
  /** Optional caption under the glyph, e.g. a character's name. */
  label?: string;
  /** Rounded to a circle — for avatars. Overrides the normal card radius. */
  circle?: boolean;
  /** Spoken description; omit for purely decorative slots. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ImageSlot: React.FC<ImageSlotProps> = ({
  source,
  width = 120,
  aspectRatio = 1,
  tint,
  icon = 'sparkle',
  label,
  circle = false,
  accessibilityLabel,
  style,
  testID,
}) => {
  const height = Math.round(width / aspectRatio);
  const borderRadius = circle ? width / 2 : radius.illustrationCard;
  const wash = tint ?? colors.primaryLight;

  const frame: StyleProp<ViewStyle> = [{ width, height, borderRadius }, style];

  if (source) {
    return (
      <View style={[styles.imgWrap, frame]} testID={testID}>
        <Image
          source={source}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
          accessible={!!accessibilityLabel}
          accessibilityLabel={accessibilityLabel}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.placeholder, { backgroundColor: wash }, frame]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      testID={testID}
    >
      <PetalIcon name={icon} size={Math.max(20, Math.min(width, height) * 0.34)} color={colors.surface} />
      {label ? (
        <Text style={[typography.presets.caption, styles.label]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  imgWrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
  },
  label: {
    color: colors.surface,
    textAlign: 'center',
  },
});

export default ImageSlot;
