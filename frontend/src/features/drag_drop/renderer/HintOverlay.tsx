/**
 * Hint Overlay View — PetalPath Drag & Drop Presentation
 * Renders visual highlight indicators for progressive and idle hints.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { ProgressiveHint } from '../types';

export interface HintOverlayProps {
  activeHint?: ProgressiveHint | { type: 'idle'; hintType: string } | null;
  targetPosition?: { x: number; y: number; width: number; height: number };
}

export const HintOverlay: React.FC<HintOverlayProps> = ({ activeHint, targetPosition }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (activeHint) {
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
  }, [activeHint, pulseAnim]);

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
    borderColor: '#F59E0B',
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
});
