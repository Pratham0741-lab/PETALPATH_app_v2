/**
 * Animation Library — PetalPath Core
 * Reusable animation effects for all activity engines.
 */

import { Animated, Easing } from 'react-native';

export class AnimationLibrary {
  /**
   * Gentle shake animation (e.g. on incorrect drop / error)
   */
  static shake(animatedValue: Animated.Value, durationMs = 500): Animated.CompositeAnimation {
    animatedValue.setValue(0);
    return Animated.timing(animatedValue, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
  }

  /**
   * Pulse animation (e.g. for hint targets or attention callouts)
   */
  static pulse(animatedValue: Animated.Value, durationMs = 800): Animated.CompositeAnimation {
    return Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1.15,
        duration: durationMs / 2,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 1.0,
        duration: durationMs / 2,
        useNativeDriver: true,
      }),
    ]);
  }

  /**
   * Scale-up sparkle bounce (e.g. on correct drop)
   */
  static pop(animatedValue: Animated.Value, durationMs = 400): Animated.CompositeAnimation {
    animatedValue.setValue(0.8);
    return Animated.spring(animatedValue, {
      toValue: 1.0,
      friction: 4,
      tension: 40,
      useNativeDriver: true,
    });
  }
}
