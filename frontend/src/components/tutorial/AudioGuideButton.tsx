/**
 * AudioGuideButton
 *
 * Floating speaker button that replays the current screen's tutorial audio.
 * Pulses gently while audio is playing. Hidden when voice guidance is off.
 *
 * Redesign notes (§7, §31): the Ionicons speaker is now the `sound` glyph, and
 * it changes shape as well as pulsing — filled while speaking, outlined when
 * idle — so a child who cannot see the animation still gets the state (§30).
 * The pulse respects the reduced-motion setting, which it previously ignored,
 * and the button sits clear of the bottom navigation using the same token the
 * bar reserves for content.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';

import { bottomNavSizes, colors, radius, shadows, spacing } from '../../theme';
import { PetalIcon } from '../icons';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTutorialStore } from '../../store/tutorialStore';

interface AudioGuideButtonProps {
  style?: StyleProp<ViewStyle>;
}

export const AudioGuideButton: React.FC<AudioGuideButtonProps> = ({ style }) => {
  const enabled = useTutorialStore((s) => s.enabled);
  const isPlaying = useTutorialStore((s) => s.isPlaying);
  const replayTutorial = useTutorialStore((s) => s.replayTutorial);
  const reduceMotion = useReducedMotion();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying && !reduceMotion) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [isPlaying, reduceMotion, pulseAnim]);

  if (!enabled) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }, style]}>
      <Pressable
        onPress={replayTutorial}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Replay instructions"
        accessibilityState={{ busy: isPlaying }}
        testID="audio-guide-button"
      >
        <PetalIcon name="sound" size={24} color={colors.white} filled={isPlaying} />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    // Clear of the bottom bar, using the inset the bar itself publishes.
    bottom: bottomNavSizes.contentInset - 8,
    right: spacing.md,
    zIndex: 100,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  pressed: {
    opacity: 0.75,
  },
});

export default AudioGuideButton;
