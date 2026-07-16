import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Animated,
  Dimensions,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const toastIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const toastColors: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: colors.success, icon: colors.white },
  error: { bg: colors.error, icon: colors.white },
  warning: { bg: colors.warning, icon: colors.white },
  info: { bg: colors.primary, icon: colors.white },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  visible,
  onHide,
  duration = 3000,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 15,
        stiffness: 150,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 250,
          useNativeDriver: true,
        }).start(() => onHide());
      }, duration);

      return () => clearTimeout(timer);
    } else {
      slideAnim.setValue(-100);
    }
  }, [visible, duration, onHide, slideAnim]);

  if (!visible) return null;

  const tColor = toastColors[type];
  const icon = toastIcons[type];

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: tColor.bg,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
    >
      <Text style={[styles.icon, { color: tColor.icon }]}>{icon}</Text>
      <Text style={styles.message} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    maxWidth: SCREEN_WIDTH - spacing.lg * 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    zIndex: 9999,
    ...(() => ({
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
    }))(),
  },
  icon: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    marginRight: spacing.md,
  },
  message: {
    flex: 1,
    fontSize: typography.sizes.small,
    color: colors.white,
    fontFamily: typography.families.rounded,
    fontWeight: typography.weights.medium,
  },
});

export default Toast;
