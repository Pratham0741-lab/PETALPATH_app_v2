import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, spacing, typography, radius } from '../../../theme';

interface AnimatedLevelIndicatorProps {
  level: number;
  size?: number;
}

export const AnimatedLevelIndicator: React.FC<AnimatedLevelIndicatorProps> = ({
  level,
  size = 56,
}) => {
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale }],
        },
      ]}
      accessibilityLabel={`Level ${level}`}
    >
      <Text style={[styles.text, { fontSize: size * 0.32 }]}>Lv {level}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.white,
    fontWeight: typography.weights.bold,
    fontFamily: typography.families.rounded,
  },
});
