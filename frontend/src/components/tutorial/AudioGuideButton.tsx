/**
 * AudioGuideButton
 *
 * Floating speaker icon that replays the current screen's tutorial audio.
 * Shows a subtle pulse animation when audio is playing.
 * Hidden when voice guidance is disabled.
 */

import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTutorialStore } from '../../store/tutorialStore';
import { colors, radius, spacing } from '../../theme';

interface AudioGuideButtonProps {
  style?: ViewStyle;
}

export const AudioGuideButton: React.FC<AudioGuideButtonProps> = ({ style }) => {
  const { enabled, isPlaying, replayTutorial } = useTutorialStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPlaying) {
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
    } else {
      pulseAnim.setValue(1);
    }
  }, [isPlaying]);

  if (!enabled) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }, style]}>
      <TouchableOpacity
        onPress={replayTutorial}
        style={styles.button}
        activeOpacity={0.7}
        accessibilityLabel="Replay instructions"
        accessibilityRole="button"
      >
        <Ionicons
          name={isPlaying ? 'volume-high' : 'volume-medium'}
          size={24}
          color={colors.white}
        />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 88,
    right: spacing.md,
    zIndex: 100,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
});
