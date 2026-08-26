/**
 * Hint Overlay View — PetalPath Drag & Drop Presentation
 * Renders visual highlight indicators for progressive and idle hints.
 *
 * The pulsing ring keeps its timing; only the colour moved onto the palette
 * (spec §3). It respects the OS reduce-motion setting rather than pulsing
 * regardless (§30) — with motion off the ring still appears, just steady, so
 * no hint is lost.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { colors, radius } from '../../../theme';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { ProgressiveHint } from '../types';

export interface HintOverlayProps {
  activeHint?: ProgressiveHint | { type: 'idle'; hintType: string } | null;
  targetPosition?: { x: number; y: number; width: number; height: number };
}

export const HintOverlay: React.FC<HintOverlayProps> = ({ activeHint, targetPosition }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (activeHint && !reduceMotion) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
  }, [activeHint, pulseAnim, reduceMotion]);

  if (!activeHint || !targetPosition) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.hintBox,
        {
          position: 'absolute',
          left: targetPosition.x - 8,
          top: targetPosition.y - 8,
          width: targetPosition.width + 16,
          height: targetPosition.height + 16,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    />
  );
};

const styles = StyleSheet.create({
  hintBox: {
    borderWidth: 4,
    borderColor: colors.warning,
    borderRadius: radius.lg,
    /* A ring, not a fill. This used to be `backgroundColor: colors.warningLight`,
       which — now that the overlay is actually given a `targetPosition` and
       renders — would lay an opaque panel over the very target it is pointing at,
       hiding that zone's label at the moment the child most needs to read it. */
    backgroundColor: 'transparent',
  },
});
