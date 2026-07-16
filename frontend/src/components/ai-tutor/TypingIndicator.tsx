import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography, radius } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const DOT_COUNT = 3;
const DOT_SIZE = 8;
const ANIMATION_DURATION = 600;

interface DotProps {
  delay: number;
  reduced: boolean;
}

const Dot: React.FC<DotProps> = ({ delay, reduced }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      translateY.value = 0;
      return;
    }

    translateY.value = withRepeat(
      withDelay(
        delay,
        withTiming(-DOT_SIZE, {
          duration: ANIMATION_DURATION / 2,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      true,
    );
  }, [delay, reduced, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

export const TypingIndicator: React.FC = () => {
  const { theme } = useTheme();
  const { colors } = theme;
  const reduced = useReducedMotion();
  const dotDelay = ANIMATION_DURATION / DOT_COUNT;

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="AI is typing"
    >
      <View style={[styles.bubble, { backgroundColor: colors.primaryLight }]}>
        <View style={styles.dotsRow}>
          {Array.from({ length: DOT_COUNT }, (_, i) => (
            <Dot key={i} delay={i * dotDelay} reduced={reduced} />
          ))}
        </View>
      </View>
      <Text style={[styles.label, { color: colors.textMuted }]}>
        AI is thinking...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  bubble: {
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: DOT_SIZE,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: '#8B78D8',
  },
  label: {
    fontSize: typography.sizes.caption,
    fontFamily: typography.families.rounded,
  },
});
