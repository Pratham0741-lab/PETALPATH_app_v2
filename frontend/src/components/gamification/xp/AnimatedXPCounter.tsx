import React, { useEffect } from 'react';
import { TextInput, StyleSheet, StyleProp, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
} from 'react-native-reanimated';
import { colors, typography } from '../../../theme';

interface AnimatedXPCounterProps {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const AnimatedXPCounter: React.FC<AnimatedXPCounterProps> = ({ value, duration = 800, style }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(value, { duration });
  }, [value, duration, progress]);

  const animatedProps = useAnimatedProps(() => {
    return {
      text: Math.round(progress.value).toString(),
    } as Partial<React.ComponentProps<typeof TextInput>>;
  });

  return (
    <AnimatedTextInput
      editable={false}
      showSoftInputOnFocus={false}
      style={[styles.text, style]}
      value={Math.round(value).toString()}
      animatedProps={animatedProps}
      accessibilityRole="text"
      accessibilityLabel={`${value} XP`}
    />
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.text,
  },
});

export default AnimatedXPCounter;
