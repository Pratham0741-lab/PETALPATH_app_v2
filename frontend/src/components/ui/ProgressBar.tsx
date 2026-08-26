import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, typography, progressSizes } from '../../theme';

type ProgressVariant = 'default' | 'primary' | 'success' | 'warning';

interface ProgressBarProps {
  progress: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  label?: string;
  showPercentage?: boolean;
  animated?: boolean;
  variant?: ProgressVariant;
  style?: StyleProp<ViewStyle>;
}

const progressColors: Record<ProgressVariant, string> = {
  default: colors.primary,
  primary: colors.primary,
  success: colors.success,
  warning: colors.warning,
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  height = progressSizes.barHeight,
  color,
  backgroundColor,
  label,
  showPercentage = false,
  animated = true,
  variant = 'default',
  style,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const progressWidth = useSharedValue(animated ? 0 : clampedProgress);

  useEffect(() => {
    if (animated) {
      progressWidth.value = withTiming(clampedProgress, {
        duration: 600,
        easing: Easing.out(Easing.ease),
      });
    } else {
      progressWidth.value = clampedProgress;
    }
  }, [clampedProgress, animated, progressWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const fillColor = color ?? progressColors[variant];

  return (
    <View style={[styles.container, style]}>
      {(label || showPercentage) && (
        <View style={styles.header}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercentage && (
            <Text style={styles.percentage}>{Math.round(clampedProgress)}%</Text>
          )}
        </View>
      )}
      <View
        style={[
          styles.track,
          { height, borderRadius: height / 2, backgroundColor: backgroundColor ?? colors.border },
        ]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: clampedProgress }}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              height,
              borderRadius: height / 2,
              backgroundColor: fillColor,
            },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.small,
    color: colors.textSecondary,
    fontFamily: typography.families.rounded,
  },
  percentage: {
    fontSize: typography.sizes.small,
    color: colors.textPrimary,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    overflow: 'hidden',
  },
});

export default ProgressBar;
