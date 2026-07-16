import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, typography } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
  loading?: boolean;
}

const RingSkeleton: React.FC<{ size: number }> = ({ size }) => {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);
  const animProps = useAnimatedProps(() => ({
    stroke: interpolateColor(pulse.value, [0, 1], [colors.skeleton, colors.skeletonHighlight]),
  }));
  const r = (size - 12) / 2;
  return (
    <View style={[skeletonStyles.container, { width: size, height: size }]} accessibilityLabel="Loading">
      <Svg width={size} height={size}>
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={12}
          fill="none"
          animatedProps={animProps}
        />
      </Svg>
    </View>
  );
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  progress,
  size = 120,
  strokeWidth = 10,
  color: explicitColor,
  label,
  showPercentage = true,
  animated = true,
  loading = false,
}) => {
  const reducedMotion = useReducedMotion();
  const half = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const ringColor = explicitColor
    ? explicitColor
    : clampedProgress < 40
      ? colors.error
      : clampedProgress < 70
        ? colors.warning
        : colors.success;

  const animatedOffset = useSharedValue(
    reducedMotion || !animated ? 0 : circumference,
  );

  useEffect(() => {
    const offset = circumference - (clampedProgress / 100) * circumference;
    if (reducedMotion || !animated) {
      animatedOffset.value = offset;
    } else {
      animatedOffset.value = withTiming(offset, {
        duration: 800,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [clampedProgress, circumference, reducedMotion, animated, animatedOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }));

  if (loading) {
    return <RingSkeleton size={size} />;
  }

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityLabel={`Progress: ${Math.round(clampedProgress)} percent`}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={half}
          cy={half}
          r={radius}
          stroke={colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={half}
          cy={half}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          animatedProps={animatedProps}
          transform={`rotate(-90, ${half}, ${half})`}
        />
      </Svg>
      {(label || showPercentage) && (
        <View style={styles.centerLabel}>
          {showPercentage && (
            <Text
              style={[
                styles.percentage,
                { fontSize: size * 0.22, color: ringColor },
              ]}
            >
              {Math.round(clampedProgress)}%
            </Text>
          )}
          {label && (
            <Text
              style={[
                styles.label,
                { fontSize: size * 0.12 },
              ]}
            >
              {label}
            </Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentage: {
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginTop: 2,
  },
});

const skeletonStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProgressRing;
