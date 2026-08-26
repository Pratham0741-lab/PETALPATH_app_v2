import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, waveSizes } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

/**
 * SoundWave (spec §28, §31).
 *
 * The "I'm listening" indicator beside a microphone. Speak drew seven bars at
 * fixed heights — a waveform that never moved, which reads as a broken
 * animation rather than a still illustration. These bars actually breathe,
 * cheaply: one looping `Animated.Value` per bar, native-driven, and the whole
 * thing falls back to a static row when the OS asks for reduced motion (§30).
 *
 * Purely decorative, so it is hidden from screen readers — the caption beside
 * it carries the meaning.
 */

export interface SoundWaveProps {
  /** Animate. When false the bars rest at their mid heights. */
  active?: boolean;
  bars?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Relative resting heights, so a still wave still looks like a wave. */
const SHAPE = [0.35, 0.7, 1, 0.55, 1, 0.7, 0.35];

const Bar: React.FC<{ index: number; active: boolean; color: string; reduceMotion: boolean }> = ({
  index,
  active,
  color,
  reduceMotion,
}) => {
  const base = SHAPE[index % SHAPE.length];
  const rest = waveSizes.minHeight + (waveSizes.maxHeight - waveSizes.minHeight) * base;
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active || reduceMotion) {
      v.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, {
          toValue: 1,
          duration: 260 + index * 55,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(v, {
          toValue: 0,
          duration: 260 + index * 55,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, index, reduceMotion, v]);

  const height = v.interpolate({
    inputRange: [0, 1],
    outputRange: [Math.max(waveSizes.minHeight, rest * 0.4), rest],
  });

  return (
    <Animated.View
      style={[styles.bar, { height: active && !reduceMotion ? height : rest, backgroundColor: color }]}
    />
  );
};

export const SoundWave: React.FC<SoundWaveProps> = ({
  active = true,
  bars = 7,
  color = colors.purple,
  style,
}) => {
  const reduceMotion = useReducedMotion();

  return (
    <View style={[styles.row, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: bars }).map((_, i) => (
        <Bar key={i} index={i} active={active} color={color} reduceMotion={reduceMotion} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: waveSizes.gap,
    height: waveSizes.maxHeight,
  },
  bar: {
    width: waveSizes.barWidth,
    borderRadius: radius.xs,
  },
});

export default SoundWave;
