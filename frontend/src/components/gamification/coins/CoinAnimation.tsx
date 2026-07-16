import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Animated } from 'react-native';
import { colors, spacing, typography } from '../../../theme';

interface CoinAnimationProps {
  amount: number;
  visible: boolean;
  onComplete?: () => void;
}

export const CoinAnimation: React.FC<CoinAnimationProps> = ({ amount, visible, onComplete }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          delay: 900,
          useNativeDriver: true,
        }).start(() => {
          onComplete?.();
        });
      });
    }
  }, [visible, translateY, opacity, onComplete]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.inner, { transform: [{ translateY }], opacity }]}>
        <Ionicons name="cash" size={48} color={colors.yellow} />
        <Text style={styles.text}>+{amount}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    alignItems: 'center',
  },
  text: {
    marginTop: spacing.xs,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.black,
    color: colors.accent,
    fontFamily: typography.families.rounded,
  },
});
