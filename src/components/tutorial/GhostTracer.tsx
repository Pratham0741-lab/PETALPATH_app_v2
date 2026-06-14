/**
 * GhostTracer
 *
 * For Write activity only. Animated stroke path preview using react-native-svg.
 * Shows an animated dashed path with a sparkle dot following the stroke direction.
 */

import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTutorialStore } from '../../store/tutorialStore';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface GhostTracerProps {
  /** SVG path data string */
  pathData: string;
  visible?: boolean;
  color?: string;
  sparkleColor?: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

export const GhostTracer: React.FC<GhostTracerProps> = ({
  pathData,
  visible = true,
  color = '#8B5CF640',
  sparkleColor = '#FFD700',
  width = 300,
  height = 300,
  style,
}) => {
  const { animationsEnabled, reduceMotion } = useTutorialStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || !animationsEnabled || reduceMotion) {
      fadeAnim.setValue(0);
      return;
    }

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Sparkle pulse
    const sparkle = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleOpacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    sparkle.start();

    return () => sparkle.stop();
  }, [visible, animationsEnabled, reduceMotion]);

  if (!visible || !animationsEnabled) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { width, height, opacity: fadeAnim }, style]}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Ghost path */}
        <Path
          d={pathData}
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray="12 8"
        />
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 50,
  },
});
