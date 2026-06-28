/**
 * TutorialBubble
 *
 * Speech bubble showing instruction text positioned near the mentor avatar.
 * Animated fade-in/out with a rounded bubble and triangle pointer.
 */

import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, View, Text, ViewStyle } from 'react-native';
import { useTutorialStore } from '../../store/tutorialStore';
import { colors, radius, spacing, typography } from '../../theme';

interface TutorialBubbleProps {
  message: string;
  visible: boolean;
  position?: 'top' | 'bottom';
  style?: ViewStyle;
}

export const TutorialBubble: React.FC<TutorialBubbleProps> = ({
  message,
  visible,
  position = 'bottom',
  style,
}) => {
  const { animationsEnabled } = useTutorialStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(position === 'bottom' ? 10 : -10)).current;

  useEffect(() => {
    if (visible && animationsEnabled) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: position === 'bottom' ? 10 : -10,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, animationsEnabled]);

  if (!visible || !animationsEnabled) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      {position === 'bottom' && <View style={styles.triangleUp} />}
      <View style={styles.bubble}>
        <Text style={styles.text}>{message}</Text>
      </View>
      {position === 'top' && <View style={styles.triangleDown} />}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    zIndex: 250,
    maxWidth: 280,
  },
  bubble: {
    backgroundColor: '#1E1B3A',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    textAlign: 'center',
    lineHeight: 22,
  },
  triangleUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#1E1B3A',
    marginBottom: -1,
  },
  triangleDown: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1E1B3A',
    marginTop: -1,
  },
});
