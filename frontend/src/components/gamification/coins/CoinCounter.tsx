import React, { useEffect } from 'react';
import { TextInput, StyleSheet, StyleProp, TextStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';
import { typography, colors } from '../../../theme';

interface CoinCounterProps {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const CoinCounter: React.FC<CoinCounterProps> = ({ value, duration = 1000, style }) => {
  const sharedValue = useSharedValue(0);

  useEffect(() => {
    sharedValue.value = withTiming(value, { duration });
  }, [value, duration, sharedValue]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: String(Math.round(sharedValue.value)),
    } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  return (
    <AnimatedTextInput
      editable={false}
      showSoftInputOnFocus={false}
      style={[styles.text, style]}
      animatedProps={animatedProps}
      defaultValue="0"
    />
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: typography.sizes.display,
    fontWeight: typography.weights.black,
    color: colors.textPrimary,
    fontFamily: typography.families.rounded,
  },
});
