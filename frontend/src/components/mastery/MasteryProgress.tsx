import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';
import { spacing, typography } from '../../theme';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface MasteryProgressProps {
  score: number;
  label: string;
  size?: number;
  color?: string;
  animated?: boolean;
}

const STROKE_WIDTH = 10;
const FONT_SIZE_RATIO = 0.28;
const LABEL_FONT_SIZE_RATIO = 0.1;
const ANIMATION_DURATION = 1000;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const scoreColor = (score: number, themeColors: Record<string, string>): string => {
  if (score < 40) return themeColors.error;
  if (score < 70) return themeColors.warning;
  return themeColors.success;
};

export const MasteryProgress: React.FC<MasteryProgressProps> = ({
  score,
  label,
  size = 120,
  color,
  animated = true,
}) => {
  const { theme } = useTheme();
  const { colors: themeColors } = theme;
  const reducedMotion = useReducedMotion();

  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = (size - STROKE_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const progressColor = color || scoreColor(clampedScore, themeColors);

  const animatedOffset = useSharedValue(animated ? circumference : circumference * (1 - clampedScore / 100));

  const targetOffset = circumference * (1 - clampedScore / 100);

  useEffect(() => {
    if (reducedMotion || !animated) {
      animatedOffset.value = targetOffset;
    } else {
      animatedOffset.value = withTiming(targetOffset, {
        duration: ANIMATION_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [targetOffset, animated, reducedMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: animatedOffset.value,
  }));

  const fontColor = useMemo(
    () => (color ? themeColors.text : progressColor),
    [color, progressColor, themeColors.text],
  );

  return (
    <View
      style={[containerStyles.wrapper, { width: size }]}
      accessibilityLabel={`${Math.round(clampedScore)} percent mastery in ${label}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clampedScore) }}
    >
      <View style={containerStyles.svgWrapper}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={`${progressColor}25`}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
          />
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={progressColor}
            strokeWidth={STROKE_WIDTH}
            fill="transparent"
            strokeDasharray={circumference}
            strokeLinecap="round"
            transform={`rotate(-90, ${center}, ${center})`}
            animatedProps={animatedProps}
          />
        </Svg>
        <View style={[containerStyles.centerLabel, { width: size, height: size }]}>
          <Text
            style={[
              containerStyles.scoreText,
              {
                fontSize: size * FONT_SIZE_RATIO,
                color: fontColor,
              },
            ]}
          >
            {Math.round(clampedScore)}%
          </Text>
        </View>
      </View>
      <Text
        style={[
          containerStyles.label,
          {
            fontSize: size * LABEL_FONT_SIZE_RATIO,
            color: themeColors.textSecondary,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const containerStyles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  svgWrapper: {
    position: 'relative',
  },
  centerLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
  label: {
    fontWeight: typography.weights.medium,
    fontFamily: typography.families.rounded,
    textAlign: 'center',
  },
});

export default MasteryProgress;
