import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../../../theme';

interface XPGainPopupProps {
  visible: boolean;
  amount: number;
  onClose: () => void;
}

const XPGainPopup: React.FC<XPGainPopupProps> = ({ visible, amount, onClose }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setMounted(false);
          onClose();
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, opacity, scale, onClose]);

  if (!mounted) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.popup,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${amount} XP gained`}
    >
      <Ionicons name="star" size={20} color={colors.background} />
      <Text style={styles.text}>+{amount} XP</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  popup: {
    position: 'absolute',
    top: spacing.xl,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
  },
  text: {
    fontFamily: typography.families.rounded,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.background,
  },
});

export default XPGainPopup;
