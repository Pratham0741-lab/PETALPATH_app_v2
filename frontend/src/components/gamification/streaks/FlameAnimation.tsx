/**
 * FlameAnimation — the streak flame, animated while a streak is alive.
 *
 * Redesign notes (§7, §31): the Ionicons flame is the `flame` PetalIcon, and the
 * animation now respects the reduced-motion setting, which it previously ignored
 * — a looping pulse is exactly the kind of thing that setting exists to stop.
 * With motion reduced the flame still renders filled and coloured, so nothing is
 * lost but the movement.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors } from '../../../theme';
import { PetalIcon } from '../../icons';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface FlameAnimationProps {
  active: boolean;
  size?: number;
}

const FlameAnimation: React.FC<FlameAnimationProps> = ({ active, size = 48 }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!active || reduceMotion) {
      scale.setValue(1);
      opacity.setValue(1);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.25, duration: 500, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 500, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, scale, opacity]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <PetalIcon
          name="flame"
          size={size}
          color={active ? colors.warning : colors.textMuted}
          filled={active}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FlameAnimation;
