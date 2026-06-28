/**
 * useHandPointerAnimation
 *
 * Encapsulates all finger pointer animation logic using React Native Animated API.
 * Provides startTapAnimation, startBounceAnimation, startMoveAnimation,
 * stopAnimation, and resetAnimation.
 */

import { useRef, useCallback, useEffect } from 'react';
import { Animated, AppState, AppStateStatus } from 'react-native';

interface AnimationConfig {
  mode: 'tap' | 'bounce' | 'move';
  /** Start position for move mode */
  startX?: number;
  startY?: number;
  /** End position for move mode */
  endX?: number;
  endY?: number;
  /** Optional delay before animation starts */
  delay?: number;
}

export const useHandPointerAnimation = () => {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const isRunningRef = useRef(false);

  // AppState listener — pause when background, resume when active
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active' && isRunningRef.current) {
        // Animation will auto-resume via Animated.loop
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, []);

  const fadeIn = useCallback((delay = 0) => {
    return Animated.timing(opacity, {
      toValue: 0.95,
      duration: 400,
      delay,
      useNativeDriver: true,
    });
  }, [opacity]);

  const startTapAnimation = useCallback((delay = 0) => {
    stopAnimation();
    isRunningRef.current = true;

    const tapSequence = Animated.loop(
      Animated.sequence([
        // Move finger down (approach tap)
        Animated.timing(translateY, {
          toValue: 12,
          duration: 300,
          useNativeDriver: true,
        }),
        // Press down (scale)
        Animated.timing(scale, {
          toValue: 0.88,
          duration: 150,
          useNativeDriver: true,
        }),
        // Release (bounce back)
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 80,
          useNativeDriver: true,
        }),
        // Return upward
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        // Pause before next tap
        Animated.delay(500),
      ])
    );

    animationRef.current = Animated.sequence([
      fadeIn(delay),
      tapSequence,
    ]);

    animationRef.current.start();
  }, [translateY, scale, opacity, fadeIn]);

  const startBounceAnimation = useCallback((delay = 0) => {
    stopAnimation();
    isRunningRef.current = true;

    const bounceSequence = Animated.loop(
      Animated.sequence([
        // Float up
        Animated.timing(translateY, {
          toValue: -15,
          duration: 600,
          useNativeDriver: true,
        }),
        // Float down
        Animated.timing(translateY, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        // Pause
        Animated.delay(300),
      ])
    );

    animationRef.current = Animated.sequence([
      fadeIn(delay),
      bounceSequence,
    ]);

    animationRef.current.start();
  }, [translateY, opacity, fadeIn]);

  const startMoveAnimation = useCallback((
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    delay = 0,
  ) => {
    stopAnimation();
    isRunningRef.current = true;

    const deltaX = endX - startX;
    const deltaY = endY - startY;

    // Reset to start
    translateX.setValue(0);
    translateY.setValue(0);

    const moveSequence = Animated.loop(
      Animated.sequence([
        // Move from start to end
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: deltaX,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: deltaY,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        // Fade out at end
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: true,
        }),
        // Reset position instantly
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        // Fade back in at start
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 300,
          useNativeDriver: true,
        }),
        // Brief pause
        Animated.delay(400),
      ])
    );

    animationRef.current = Animated.sequence([
      fadeIn(delay),
      moveSequence,
    ]);

    animationRef.current.start();
  }, [translateX, translateY, opacity, fadeIn]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
    }
    isRunningRef.current = false;
  }, []);

  const resetAnimation = useCallback(() => {
    stopAnimation();
    translateX.setValue(0);
    translateY.setValue(0);
    scale.setValue(1);
    opacity.setValue(0);
  }, [translateX, translateY, scale, opacity, stopAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  return {
    translateX,
    translateY,
    scale,
    opacity,
    startTapAnimation,
    startBounceAnimation,
    startMoveAnimation,
    stopAnimation,
    resetAnimation,
  };
};
