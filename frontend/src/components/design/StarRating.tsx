import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { colors, spacing, starSizes, StarSizeToken, MIN_TOUCH_TARGET } from '../../theme';
import { PetalIcon } from '../icons';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * StarRating (spec §28, §30).
 *
 * "You earned 2 out of 3 stars" is the app's universal reward language — Speak,
 * Trace, the quiz screens and all four completion screens showed it, each with
 * its own star size and its own `star` / `star-outline` icon pair. One
 * component now owns it.
 *
 * Earned stars are filled *and* full-colour while unearned ones are outlined
 * and muted, so the score reads without depending on colour (§30), and the
 * whole row carries a single spoken label rather than announcing three
 * anonymous images.
 *
 * Pass `onSelect` to turn the row into a rating control — Match's "how many
 * stars?" self-assessment needs that, and it should not hand-roll its own row
 * of tappable icons (§28). Interactive stars become real radio buttons with
 * generous hit slop rather than decorative images (§30).
 */

export interface StarRatingProps {
  /** Stars earned. Clamped into 0…max. */
  value: number;
  max?: number;
  size?: StarSizeToken | number;
  /** Pop each earned star in, one after another. Off by default. */
  animate?: boolean;
  /**
   * Makes the row interactive. Receives the 1-based star that was tapped, so
   * tapping the third star reports 3.
   */
  onSelect?: (value: number) => void;
  /** Describes the whole control when interactive, e.g. "Rate this activity". */
  selectLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const resolveSize = (size: StarSizeToken | number): number =>
  typeof size === 'number' ? size : starSizes[size];

/** One star, so the entrance animation can own its own value. */
const Star: React.FC<{
  earned: boolean;
  size: number;
  index: number;
  animate: boolean;
}> = ({ earned, size, index, animate }) => {
  const pop = useRef(new Animated.Value(animate && earned ? 0 : 1)).current;

  useEffect(() => {
    if (!animate || !earned) {
      pop.setValue(1);
      return;
    }
    const anim = Animated.timing(pop, {
      toValue: 1,
      duration: 320,
      delay: index * 140,
      easing: Easing.out(Easing.back(2)),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [animate, earned, index, pop]);

  return (
    <Animated.View style={{ transform: [{ scale: pop }] }}>
      <PetalIcon
        name="star"
        size={size}
        color={earned ? colors.yellow : colors.border}
        filled={earned}
      />
    </Animated.View>
  );
};

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  max = 3,
  size = 'md',
  animate = false,
  onSelect,
  selectLabel,
  style,
  testID,
}) => {
  const reduceMotion = useReducedMotion();
  const px = resolveSize(size);
  const earned = Math.max(0, Math.min(max, Math.round(Number.isFinite(value) ? value : 0)));
  const gap = Math.round(px * 0.18);

  // Interactive: each star is its own radio button, so a screen reader can walk
  // the row and announce which value is selected.
  if (onSelect) {
    /* Pads each star out to the minimum target without changing how big it looks. */
    const slop = Math.max(0, Math.round((MIN_TOUCH_TARGET - px) / 2));

    return (
      <View
        style={[styles.row, { gap }, style]}
        accessibilityRole="radiogroup"
        accessibilityLabel={selectLabel ?? `Rating, ${earned} out of ${max} stars`}
        testID={testID}
      >
        {Array.from({ length: max }).map((_, i) => {
          const star = i + 1;
          const selected = star <= earned;
          return (
            <Pressable
              key={i}
              onPress={() => onSelect(star)}
              hitSlop={slop}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
              style={({ pressed }) => (pressed ? styles.pressed : undefined)}
            >
              <PetalIcon
                name="star"
                size={px}
                color={selected ? colors.yellow : colors.border}
                filled={selected}
              />
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View
      style={[styles.row, { gap }, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${earned} out of ${max} stars`}
      testID={testID}
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          index={i}
          earned={i < earned}
          size={px}
          animate={animate && !reduceMotion}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
  },
  pressed: {
    opacity: 0.65,
    transform: [{ scale: 0.94 }],
  },
});

export default StarRating;
