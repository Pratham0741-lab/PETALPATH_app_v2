import React, { useEffect } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { colors, radius, spacing } from '../../theme';

type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  variant?: SkeletonVariant;
  style?: StyleProp<ViewStyle>;
}

const variantDefaults: Record<SkeletonVariant, { width: number | string; height: number | string; borderRadius: number }> = {
  text: { width: '100%', height: 16, borderRadius: radius.xs },
  circle: { width: 48, height: 48, borderRadius: 24 },
  rect: { width: '100%', height: 120, borderRadius: radius.md },
  card: { width: '100%', height: 200, borderRadius: radius.card },
};

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  borderRadius,
  variant = 'text',
  style,
}) => {
  const defaults = variantDefaults[variant];
  const skeletonWidth = width ?? defaults.width;
  const skeletonHeight = height ?? defaults.height;
  const skeletonRadius = borderRadius ?? defaults.borderRadius;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.skeleton, colors.skeletonHighlight],
    ),
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width: skeletonWidth as any,
          height: skeletonHeight as any,
          borderRadius: skeletonRadius,
        },
        animatedStyle,
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    />
  );
};

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});

export default Skeleton;
