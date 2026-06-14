/**
 * HandPointer
 *
 * White cartoon finger pointer for tutorial guidance.
 * Supports tap, bounce, and move modes using built-in Animated API.
 * Renders above all content with soft shadow and glow.
 */

import React, { useEffect } from 'react';
import { Animated, StyleSheet, Image, View } from 'react-native';
import { useTutorialStore } from '../../store/tutorialStore';
import { useHandPointerAnimation } from '../../hooks/useHandPointerAnimation';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const handPointerImage = require('../../../assets/tutorial/hand_pointer.png');

export interface HandPointerProps {
  visible: boolean;
  x: number;
  y: number;
  mode: 'tap' | 'bounce' | 'move';
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  size?: number;
  delay?: number;
  pointerOpacity?: number;
}

export const HandPointer: React.FC<HandPointerProps> = ({
  visible,
  x,
  y,
  mode = 'tap',
  startX,
  startY,
  endX,
  endY,
  size = 70,
  delay = 0,
  pointerOpacity = 0.95,
}) => {
  const { animationsEnabled, reduceMotion } = useTutorialStore();
  const {
    translateX,
    translateY,
    scale,
    opacity,
    startTapAnimation,
    startBounceAnimation,
    startMoveAnimation,
    stopAnimation,
    resetAnimation,
  } = useHandPointerAnimation();

  useEffect(() => {
    if (!visible || !animationsEnabled) {
      resetAnimation();
      return;
    }

    // If reduceMotion — show static finger, no animation
    if (reduceMotion) {
      Animated.timing(opacity, {
        toValue: pointerOpacity,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    switch (mode) {
      case 'tap':
        startTapAnimation(delay);
        break;
      case 'bounce':
        startBounceAnimation(delay);
        break;
      case 'move':
        startMoveAnimation(
          startX ?? x,
          startY ?? y,
          endX ?? x,
          endY ?? (y + 100),
          delay,
        );
        break;
    }

    return () => {
      resetAnimation();
    };
  }, [visible, mode, animationsEnabled, reduceMotion, x, y]);

  if (!visible || !animationsEnabled) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          left: x - size / 2,
          top: y,
          width: size,
          height: size,
          opacity,
          transform: [
            { translateX },
            { translateY },
            { scale },
          ],
        },
      ]}
    >
      {/* Soft glow behind finger */}
      <View style={[styles.glow, { width: size * 0.6, height: size * 0.6 }]} />
      <Image
        source={handPointerImage}
        style={[styles.fingerImage, { width: size, height: size }]}
        resizeMode="contain"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 500,
    elevation: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    bottom: 4,
  },
  fingerImage: {
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
