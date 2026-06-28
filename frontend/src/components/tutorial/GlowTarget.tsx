/**
 * GlowTarget
 *
 * Wraps children with a pulsing glow ring to highlight important buttons.
 * When active: renders an animated border glow. When inactive: renders children only.
 */

import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTutorialStore } from '../../store/tutorialStore';
import { radius } from '../../theme';

interface GlowTargetProps {
  active?: boolean;
  color?: string;
  children: React.ReactNode;
  style?: ViewStyle;
  borderRadius?: number;
}

export const GlowTarget: React.FC<GlowTargetProps> = ({
  active = false,
  color = '#8B5CF6',
  children,
  style,
  borderRadius = radius.lg,
}) => {
  const { animationsEnabled, reduceMotion } = useTutorialStore();
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active || !animationsEnabled || reduceMotion) {
      glowOpacity.setValue(0);
      glowScale.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.85,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1.22,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowScale, {
            toValue: 1.0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [active, animationsEnabled, reduceMotion]);

  if (!active || !animationsEnabled) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.container, style]}>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glowRing,
          {
            borderRadius,
            borderColor: color,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 4,
    zIndex: 5,
  },
});
