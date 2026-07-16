import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, typography, iconSizes } from '../../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  showPercentage?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = iconSizes.xl,
  strokeWidth = 6,
  color = colors.primary,
  trackColor = colors.border,
  label,
  showPercentage = true,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedOffset = useSharedValue(circumference);

  useEffect(() => {
    const offset = circumference - (clampedProgress / 100) * circumference;
    animatedOffset.value = withTiming(offset, {
      duration: 800,
      easing: Easing.out(Easing.ease),
    });
  }, [clampedProgress, circumference, animatedOffset]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          animatedProps={animatedProps}
          transform={`rotate(-90, ${size / 2}, ${size / 2})`}
        />
      </Svg>
      {(label || showPercentage) && (
        <View style={styles.centerLabel}>
          {showPercentage && (
            <Text
              style={[
                styles.percentage,
                { fontSize: size * 0.2 },
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
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
  },
  label: {
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
    marginTop: 2,
  },
});

export default CircularProgress;
